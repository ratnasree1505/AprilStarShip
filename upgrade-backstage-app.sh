#!/bin/sh

RED=$'\e[0;31m'
GREEN=$'\033[0;32m'
BLUE=$'\033[0;34m'
NC=$'\033[0m'

echo ""
echo ${GREEN}"Checking to make sure prerequisite tools are installed"
echo ${NC}""


if ! command -v jq &> /dev/null; then
    echo ${RED}"jq could not be found. Please install jq to run this script (Example): brew install jq"
    exit
fi

if ! command -v node &> /dev/null; then
    echo ${RED}"node could not be found. Please make sure prerequesites are installed: https://backstage.spotify.com/learn/standing-up-backstage/"
    exit
fi

if ! command -v yarn &> /dev/null; then
    echo ${RED}"yarn not be found. Please make sure prerequesites are installed: https://backstage.spotify.com/learn/standing-up-backstage/"
    exit
fi

# Determine the merge tool 
MERGE_TOOL=$( [[ "$(git config merge.tool)" ]] && echo $(git config merge.tool) || 
    [[ "$(command -v kdiff3)" ]] || 
    echo ""
)

if [[ -z "$MERGE_TOOL" ]]; then
    echo ${RED}"The command 'git config merge.tool' produces a blank result."
    echo ${RED}"The kdiff3 merge tool is a good option to consider."
    echo ${RED}"On a MacOS, it can be installed using 'brew install --cask kdiff3'."
    exit
fi

echo ${GREEN}"Prerequisites have all CHECKED OUT. BRAVO!"
echo ""
echo "Discovering current and target versions of Backstage to upgrade"
echo ${NC}""

# Pull the current version of Backstage from your local copy of Backstage. Example: 1.2.0
CURRENT_VERSION="v$(cat backstage.json | jq -r '.version')"
echo "The current local version of Backstage is: " ${BLUE}${CURRENT_VERSION}
echo ${NC}""

# Pull the latest version of Backstage from the Backstage GitHub Repo. Example: 1.8.0
TARGET_VERSION=${1:-"$(curl -s https://api.github.com/repos/backstage/backstage/releases/latest | jq -r '.tag_name')"}
echo "The target version to upgrade Backstage is: " ${BLUE}${TARGET_VERSION}
echo ${NC}""

# Pull the Current Create App Version from Backstage GitHub Repo. Example: 0.4.34. This is used to generate a version of Backstage from the CLI for example.
CREATE_APP_CURRENT_VERSION=$(curl -s https://raw.githubusercontent.com/backstage/backstage/$CURRENT_VERSION/packages/create-app/package.json | jq -r '.version')
echo "The current Create App Version of Backstage is: " ${BLUE}${CREATE_APP_CURRENT_VERSION}
echo ${NC}""

# Pull the Target Create App Version from Backstage GitHub Repo. Example: 0.4.34. This is used to generate a version of Backstage from the CLI for example.
CREATE_APP_TARGET_VERSION=$(curl -s https://raw.githubusercontent.com/backstage/backstage/$TARGET_VERSION/packages/create-app/package.json | jq -r '.version')
echo "The target Create App Version of Backstage is: " ${BLUE}${CREATE_APP_TARGET_VERSION}
echo ${NC}""


if [ "$CURRENT_VERSION" == "$TARGET_VERSION" ]; then
    echo ${RED}"The Current and Target Versions of Backstage Match. No Upgrade will be attempted."
    echo ""
else
    echo ${GREEN}"Attempting upgrade from Backstage $CURRENT_VERSION (create-app $CREATE_APP_CURRENT_VERSION) to $TARGET_VERSION ($CREATE_APP_TARGET_VERSION)"
    echo ${NC}""

    echo ${GREEN}"Checking for existance of app-config.production.yaml"
    echo ${NC}""
    FILE=app-config.production.yam
    if ! [ -f "$FILE" ]; then
        echo ${RED}"app-config.production.yaml doesn't exist. Create a new one and add to git"
        echo "This file was moved from the base version of Backstage and needs to exist temporarily in git"
        echo "for the git apply command to work. It will be cleaned up later in the script."
        echo ${NC}""
        touch app-config.production.yaml
        git add app-config.production.yaml
    fi

    echo ${GREEN}"Cleaning up the .upgrade directory"
    echo ${NC}""
    #Remove the the .upgrade directory to start with a fresh copy. This will contain the patch file.
    rm -rf .upgrade && mkdir .upgrade
    #Pull in all the changes documented in the upgrade-helper-diff project into our git branch. This will result in many new branches being pulled into the git project.
    
    echo ${GREEN}"Fetching Backstage Remote Changes"
    echo ${NC}""
    git fetch https://github.com/backstage/upgrade-helper-diff.git '+refs/heads/*:refs/remotes/upgrade-helper/*'
    #Build the patch file and name it upgrade.diff
    curl -s https://raw.githubusercontent.com/backstage/upgrade-helper-diff/master/diffs/$CREATE_APP_CURRENT_VERSION..$CREATE_APP_TARGET_VERSION.diff > .upgrade/upgrade.diff

    #Apply the patch. If you run into errors it most likely because files might be missing or not under control of git.
    echo ${GREEN}"Applying the Patch to Git"
    echo ${NC}""
    git apply -3 .upgrade/upgrade.diff -v

    #If there are merge conflicts then the script should pause and kick off your merge tool to resolve conflicts.
    echo ""
    echo ${GREEN}"Kick off git merge tool"
    echo ${NC}""
    git mergetool --tool=$MERGE_TOOL

    echo ""
    echo ${RED}"Removing app-config.production.yaml as its not longer needed."
    echo ${NC}""
    rm app-config.production.yaml

    echo ${GREEN}"Merging is complete. Now will attempt to run a backstage versions:bump to update plugins."
    echo ${NC}""

    echo ${GREEN}"Running a yarn install to make sure all dependencies are available"
    echo ${NC}""
    yarn install 

    echo ""
    echo ${GREEN}"Running yarn backstage-cli versions:bump to update plugins"
    echo ${NC}""
    yarn backstage-cli versions:bump

    echo ${GREEN}""
    echo "  _  _        __  _      ___           ___ ___  _        __ "
    echo " /  / \ |\ | /__ |_)  /\  | | | |   /\  |   |  / \ |\ | (_  "
    echo " \_ \_/ | \| \_| | \ /--\ | |_| |_ /--\ |  _|_ \_/ | \| __) "
    echo ${NC}""                                          

    echo "Your upgrade script has completed!!!"
    echo ""
    echo ${GREEN}"Here are your recommended next steps:"
    echo ${NC}""
    echo "1. Review these script logs above for messages of potential breaking changes to plugins."
    echo "   Running yarn backstage-cli versions:bump will include messages that link to change logs for each plugin."
    echo "   Review this carefully as there may be code that needs to change."
    echo ""
    echo ""
    echo "2. Review the changes logs for the release."
    echo ""
    echo ${BLUE}"   https://github.com/backstage/backstage/releases"
    echo ${NC}""
    echo ""
    echo "3. After you've reviewed the changes it's time to build the application."
    echo "   Run these commands to build the application and check for any breaking changes"
    echo ""
    echo ${BLUE}"   yarn install && yarn tsc && yarn build:all"
    echo ${NC}"":

    echo ""
    echo "4. Run the application locally and make sure it comes up before commiting and pushing to remote"
    echo ""
    echo ${BLUE}"   yarn dev"
    echo ${NC}""
    echo "5. Use the Backstage Upgrade Helper UI to visually check changes made between the Current and Target Versions"
    echo ""
    echo ${BLUE}"   https://backstage.github.io/upgrade-helper/?from="${CURRENT_VERSION:1}"&to="${TARGET_VERSION:1}""
    echo ${NC}""
    echo "   Use this tool to compare the changes in the VSCode before staging into Git."
    echo "   You will have a mix of staged changes (from the patch) and unstaged changes to the same files from running"
    echo "   the backstage-cli versions:bump command. Review the items in the Changes section first and add to Staging"
    echo "   before comparing what has changed locally with the upgrade helper tool"
    echo ""
    echo ${RED}"   Reminder: You do not want to stage the .orig files. Those can be deleted as they are created by kdiff3!"
    echo ""
fi
