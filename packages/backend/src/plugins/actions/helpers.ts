import git, { ProgressCallback } from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import { Octokit } from '@octokit/rest';
import globby from 'globby';
import { Logger } from 'winston';
import fs from 'fs-extra';

const onProgressHandler = (logger: Logger): ProgressCallback => {
  let currentPhase = '';

  return event => {
    if (currentPhase !== event.phase) {
      currentPhase = event.phase;
      logger?.info(event.phase);
    }
    const total = event.total
      ? `${Math.round((event.loaded / event.total) * 100)}%`
      : event.loaded;
    logger?.debug(`status={${event.phase},total={${total}}}`);
  };
};

export const initRepoAndPush = async ({
  dir,
  remoteUrl,
  auth,
  logger,
}: {
  dir: string;
  remoteUrl: string;
  auth: { username: string; password: string | undefined };
  logger: Logger;
}): Promise<void> => {
  logger?.info(`Init git repository {dir=${dir}}`);
  await git.init({
    fs,
    dir,
    defaultBranch: 'main',
  });

  const paths = await globby(['./**', './**/.*', '!.git'], {
    cwd: dir,
    gitignore: true,
    dot: true,
  });

  for (const filepath of paths) {
    logger?.info(`Adding file {dir=${dir},filepath=${filepath}}`);
    await git.add({ fs, dir, filepath });
  }

  const message = 'Initial commit';

  logger?.info(`Committing file to repo {dir=${dir},message=${message}}`);
  await git.commit({
    fs,
    dir,
    message,
    author: {
      name: 'Developer Portal',
      email: 'developer.portal@mckesson.com',
    },
  });

  logger?.info(
    `Creating new remote {dir=${dir},remote=origin,url=${remoteUrl}}`,
  );
  await git.addRemote({
    fs,
    dir,
    url: remoteUrl,
    remote: 'origin',
  });

  logger?.info(`Pushing directory to remote {dir=${dir},remote=origin}`);
  await git.push({
    fs,
    dir,
    remote: 'origin',
    http,
    onProgress: onProgressHandler(logger),
    headers: {
      'user-agent': 'git/@isomorphic-git',
    },
    onAuth: () => ({
      username: auth.username,
      password: auth.password,
    }),
  });

  logger?.info(`Cleaning up directory`);
  await fs.remove(dir);
};

export const setBranchProtection = async (
  name: string,
  owner: string,
  client: Octokit,
) => {
  await client.repos.updateBranchProtection({
    owner,
    repo: name,
    branch: 'main',
    required_status_checks: {
      strict: true,
      contexts: [],
    },
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      required_approving_review_count: 1,
    },
    required_linear_history: true,
    enforce_admins: true,
    restrictions: null,
  });
};

export const encryptSecret = async (
  secret: string,
  key: string,
) => {
  const sodium = require('libsodium-wrappers');

  // Convert the message and key to Uint8Array's (Buffer implements that interface)
  const messageBytes = Buffer.from(secret);
  const keyBytes = Buffer.from(key, 'base64');

  // Encrypt using LibSodium.
  await sodium.ready;
  const encryptedBytes = sodium.crypto_box_seal(messageBytes, keyBytes);

  // Base64 the encrypted secret
  const encrypted = Buffer.from(encryptedBytes).toString('base64');
  return encrypted;
};
export const setGithubEnvironmentSecret = async (
  client: Octokit,
  logger: Logger,
  owner: string,
  repository_id: number,
  repository_name: string,
  secret: {name: string, value: string, environment: string},
) => {
  try{
    await client.request(`PUT /repos/${owner}/${repository_name}/environments/${secret.environment}`);
    const keyRequest = await client.request(`GET /repositories/${repository_id}/environments/${secret.environment}/secrets/public-key`, {
      repository_id: repository_id,
      environment_name: secret.environment,
    })
    const key = keyRequest.data;
    const encrypted = await encryptSecret(secret.value, key.key);
    await client.request(`PUT /repositories/${repository_id}/environments/${secret.environment}/secrets/${secret.name}`, {
      repository_id: repository_id,
      environment_name: secret.environment,
      secret_name: secret.name,
      encrypted_value: encrypted,
      key_id: key.key_id,
    });
  }catch (ex) {
    logger?.error(
      `Failed to create secret ${secret.name} for environment ${secret.environment}`,ex.message
    );
    return false;
  }
  return true;
};

export const setGithubRepositorySecret = async (
  client: Octokit,
  logger: Logger,
  owner: string,
  repository_name: string,
  secret: {name: string, value: string},
) => {
  try{
    const keyRequest = await client.request(`GET /repos/${owner}/${repository_name}/actions/secrets/public-key`, {
      owner: owner,
      repo: repository_name,
    })
    const key = keyRequest.data;
    const encrypted = await encryptSecret(secret.value, key.key);
    await client.request(`PUT /repos/${owner}/${repository_name}/actions/secrets/${secret.name}`, {
      owner: owner,
      repo: repository_name,
      secret_name: secret.name,
      encrypted_value: encrypted,
      key_id: key.key_id
    })
  }catch (ex) {
    logger?.error(
      `Failed to create secret ${secret.name}`,ex.message
    );
    return false;
  }
  return true;
};