import {
  createRouter,
  providers,
  defaultAuthProviderFactories,
} from '@backstage/plugin-auth-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import { DEFAULT_NAMESPACE, stringifyEntityRef, } from '@backstage/catalog-model';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createRouter({
    logger: env.logger,
    config: env.config,
    database: env.database,
    discovery: env.discovery,
    tokenManager: env.tokenManager,
    providerFactories: {
      ...defaultAuthProviderFactories,

      github: providers.github.create({
        signIn: {
          resolver: async ({ profile }, ctx) => {
            const displayName = profile.displayName;

            if (!displayName) {
              throw new Error(
                'Login failed, user profile does not contain an displayName',
              );
            }
          
            // By using `stringifyEntityRef` we ensure that the reference is formatted correctly
            const userEntityRef = stringifyEntityRef({
              kind: 'User',
              name: displayName,
              namespace: DEFAULT_NAMESPACE,
            });
          
            return ctx.issueToken({
              claims: {
                sub: userEntityRef,
                ent: [userEntityRef],
              },
            });
          }
        }
      }),

      okta: providers.okta.create({
        signIn: {
          resolver: async ({ profile }, ctx) => {
            const displayName = profile.displayName;

            if (!displayName) {
              throw new Error(
                'Login failed, user profile does not contain an displayName',
              );
            }

            // By using `stringifyEntityRef` we ensure that the reference is formatted correctly
            const userEntityRef = stringifyEntityRef({
              kind: 'User',
              name: displayName,
              namespace: DEFAULT_NAMESPACE,
            });

            return ctx.issueToken({
              claims: {
                sub: userEntityRef,
                ent: [userEntityRef],
              },
            });
          }
        }
      }),
    }
  });
}