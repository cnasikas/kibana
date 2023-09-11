/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';

const getLazyComponent = () =>
  React.lazy(() => {
    return Promise.resolve().then(() => {
      return {
        default: React.memo(() => {
          return <>{'System actions example'}</>;
        }),
      };
    });
  });

export const getSystemActionType = (): ConnectorTypeModel => ({
  id: 'example.system-action-connector-adapter',
  iconClass: 'gear',
  selectMessage: 'System actions example',
  actionConnectorFields: null,
  actionParamsFields: getLazyComponent(),
  validateParams: async () => {
    return { errors: {} };
  },
});
