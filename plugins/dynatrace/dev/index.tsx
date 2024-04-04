import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { dynatracePlugin, DynatraceTab } from '../src/plugin';

createDevApp()
  .registerPlugin(dynatracePlugin)
  .addPage({
    element: <DynatraceTab />,
    title: 'Root Page',
    path: '/dynatrace',
  })
  .render();
