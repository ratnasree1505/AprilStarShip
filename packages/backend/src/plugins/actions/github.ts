import { InputError } from '@backstage/errors';
import {
  SingleInstanceGithubCredentialsProvider,
  ScmIntegrationRegistry,
} from '@backstage/integration';
import { createTemplateAction } from '@backstage/plugin-scaffolder-backend';
import { Octokit } from '@octokit/rest';
import { initRepoAndPush, setBranchProtection, setGithubRepositorySecret, setGithubEnvironmentSecret } from './helpers';

type RepoVisibilityOptions = 'private' | 'internal' | 'public';

const repoVisibility: RepoVisibilityOptions = 'internal';


export const createGithubAction = (options: {
  integrations: ScmIntegrationRegistry;
  organizationName: string;
}) => {
  const { integrations, organizationName } = options;

  const credentialsProviders = new Map(
    integrations.github.list().map(integration => {
      const provider = SingleInstanceGithubCredentialsProvider.create(
        integration.config,
      );
      return [integration.config.host, provider];
    }),
  );
  return createTemplateAction<{
    repository_name: string;
    description?: string;
    access: string;
    github_secrets?: Array<{
        name: string;
        value: string;
        environment: string;
    }>;
  }>({
    id: 'mckesson:github',
    schema: {
      input: {
        required: ['repository_name', 'access'],
        type: 'object',
        properties: {
          repository_name: {
            title: 'Repository Name',
            type: 'string',
          },
          description: {
            title: 'Repository Description',
            type: 'string',
          },
          access: {
            title: 'Repository Access',
            type: 'string',
          },
          github_secrets: {
            title: 'List of Secrets to Add',
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'value'],
              properties: {
                name: {
                  type: 'string',
                  description: 'The name of the secret',
                },
                value: {
                  type: 'string',
                  description:
                    'The value of the secret created in the GitHub repository',
                },
                environment: {
                  type: 'string',
                  description:
                    'The name of the environment where to store the secret',
                }
              },
            },
          },
        },
      },
    },
    async handler(ctx) {
      const { repository_name, description, access, github_secrets } = ctx.input;

      const host = 'github.com';
      const owner = organizationName;

      const credentialsProvider = credentialsProviders.get(host);
      const integrationConfig = integrations.github.byHost(host);

      if (!credentialsProvider || !integrationConfig) {
        throw new InputError(
          `No matching integration configuration for host ${host}, please check your integrations config`,
        );
      }

      const { token } = await credentialsProvider.getCredentials({
        url: `https://${host}/${encodeURIComponent(owner)}/${encodeURIComponent(
          repository_name,
        )}`,
      });

      const client = new Octokit({
        auth: token,
        baseUrl: integrationConfig.config.apiBaseUrl,
        previews: ['nebula-preview', 'luke-cage-preview'],
      });

      const user = await client.users.getByUsername({
        username: owner,
      });

      if (user.data.type !== 'Organization') {
        throw new Error(
          'Provided repository organization is not a valid McKesson organization.',
        );
      }

      const repoCreationPromise = client.repos.createInOrg({
        name: repository_name,
        org: owner,
        private: true,
        visibility: repoVisibility,
        description,
        allow_merge_commit: false,
        allow_squash_merge: true,
        allow_rebase_merge: false,
      });

      const { data } = await repoCreationPromise;

      try {
        await client.repos.update({
          owner,
          repo: repository_name,
          delete_branch_on_merge: true,
        });
      } catch (ex) {
        ctx.logger?.error(
          'Failed to set delete_branch_on_merge as true in repository settings.',
        );
      }

      if (!access.toLowerCase().startsWith('user:')) {
        await client.teams.addOrUpdateRepoPermissionsInOrg({
          org: owner,
          team_slug: access,
          owner,
          repo: repository_name,
          permission: 'admin',
        });
      } else {
        const [, username] = access.split(':');
        await client.repos.addCollaborator({
          owner,
          repo: repository_name,
          username,
          permission: 'admin',
        });
      }

      const remoteUrl = data.clone_url;
      const repoContentsUrl = `${data.html_url}/blob/main`;
      const repositoryId = data.id;

      await initRepoAndPush({
        dir: ctx.workspacePath,
        remoteUrl,
        auth: {
          username: 'x-access-token',
          password: token,
        },
        logger: ctx.logger,
      });
      await setBranchProtection(repository_name, owner, client);
        if(github_secrets) {
          for (const secret of github_secrets) {
            if(secret.environment) {
            ctx.logger?.info(
              `putting secret ${repository_name}/${secret.name}/${secret.environment},${repository_name}`
            );
            setGithubEnvironmentSecret(client,ctx.logger,owner,repositoryId,repository_name,secret)
            }
            else{
              ctx.logger?.info(
                `putting secret ${repository_name}/${secret.name},${repository_name}`
              );
              setGithubRepositorySecret(client,ctx.logger,owner,repository_name,secret)
            }
          }
        }
      ctx.output('remoteUrl', remoteUrl);
      ctx.output('repoContentsUrl', repoContentsUrl);
    },
  });
};