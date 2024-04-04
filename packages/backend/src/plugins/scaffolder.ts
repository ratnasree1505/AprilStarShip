import { CatalogClient } from '@backstage/catalog-client';
import { ScmIntegrations } from '@backstage/integration';
import {
  createBuiltinActions,
  createRouter,
} from '@backstage/plugin-scaffolder-backend';
import { Router } from 'express';
import type { PluginEnvironment } from '../types';
import { createGithubAction, createPreprocessAction } from './actions';


export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const catalogClient = new CatalogClient({ discoveryApi: env.discovery });
  const organizationName = env.config.getString('organization.name').toLowerCase();
  const scm = ScmIntegrations.fromConfig(env.config);
  const builtInActions = createBuiltinActions({
    integrations: scm,
    catalogClient,
    reader: env.reader,
    config: env.config,
  });

  const actions = [
    ...builtInActions,
    createGithubAction({ integrations: scm, organizationName }),
    createPreprocessAction(),
  ];

  return await createRouter({
    logger: env.logger,
    config: env.config,
    database: env.database,
    reader: env.reader,
    catalogClient,
    identity: env.identity,
    actions,
  });
}
