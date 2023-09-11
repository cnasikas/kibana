/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionType } from '@kbn/actions-plugin/server';
import { schema } from '@kbn/config-schema';

export const getSystemActionType = (): ActionType<
  {},
  {},
  { myParam: string; injected: string; index?: string; reference?: string }
> => ({
  id: 'example.system-action-connector-adapter',
  name: 'Example of system action with a connector adapter set',
  minimumLicenseRequired: 'platinum',
  supportedFeatureIds: ['alerting'],
  validate: {
    params: {
      schema: schema.object({
        myParam: schema.string(),
        injected: schema.string(),
      }),
    },
    config: {
      schema: schema.any(),
    },
    secrets: {
      schema: schema.any(),
    },
  },
  isSystemActionType: true,
  async executor({ params, services, actionId }) {
    return { status: 'ok', actionId, params };
  },
});
