import { dynatraceApiRef, DynatraceClient } from './api';
import {
  createApiFactory,
  createPlugin,
  discoveryApiRef,
  fetchApiRef,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import {cloudUtilsApiRef} from './api/CloudUtilsApi'
import {CloudUtilsClient} from './api/CloudUtilsClient'

/**
 * Create the Dynatrace plugin.
 * @public
 */
export const dynatracePlugin = createPlugin({
  id: 'dynatrace',
  apis: [
    createApiFactory({
      api: dynatraceApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new DynatraceClient({
          discoveryApi,
          fetchApi,
        }),
    }),
    createApiFactory({
          api: cloudUtilsApiRef,
          deps: {
            discoveryApi: discoveryApiRef,
            fetchApi: fetchApiRef,
          },
          factory: ({ discoveryApi, fetchApi }) =>
            new CloudUtilsClient({
              discoveryApi,
              fetchApi,
            }),
        }),
  ],
});

/**
 * Creates a routable extension for the dynatrace plugin tab.
 * @public
 */
export const DynatraceTab = dynatracePlugin.provide(
  createRoutableExtension({
    name: 'DynatraceTab',
    component: () =>
      import('./components/DynatraceTab').then(m => m.DynatraceTab),
    mountPoint: rootRouteRef,
  }),
);
