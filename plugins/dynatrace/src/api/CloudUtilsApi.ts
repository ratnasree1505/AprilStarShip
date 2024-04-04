import { createApiRef } from '@backstage/core-plugin-api';

export type K8sEntity = {
  cluster: string;
  namespace: string;
  sid: string;
  email: string;
};

export type CloudUtilsUser = {
  email: string;
  userid: string;
  first_name: string;
  last_name: number;
  distinguished_name: number;
  k8s: Array<K8sEntity>;
};

export const cloudUtilsApiRef = createApiRef<CloudUtilsApi>({
  id: 'plugin.cloudutils.service',
});

export type CloudUtilsApi = {
  getUserLookup(
    email: string | undefined,
  ): Promise<CloudUtilsUser | undefined>;
};
