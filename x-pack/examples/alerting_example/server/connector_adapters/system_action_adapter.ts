/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorAdapter } from '@kbn/alerting-plugin/server';
import { schema } from '@kbn/config-schema';

export const getSystemActionConnectorAdapter = (): ConnectorAdapter => ({
  connectorTypeId: 'test.system-action-connector-adapter',
  ruleActionParamsSchema: schema.object({
    myParam: schema.string(),
    index: schema.maybe(schema.string()),
    reference: schema.maybe(schema.string()),
  }),
  buildActionParams: ({ alerts, rule, params, spaceId, ruleUrl }) => {
    return { ...params, injected: 'param from connector adapter' };
  },
});
