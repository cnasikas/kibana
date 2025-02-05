/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { configSchema } from './config';
import { deprecations } from './deprecations';

export type { KibanaSettingsCollector } from './kibana_monitoring/collectors';
export type { MonitoringConfig } from './config';
export type { MonitoringPluginSetup, IBulkUploader } from './types';

export const plugin = async (initContext: PluginInitializerContext) => {
  const { MonitoringPlugin } = await import('./plugin');
  return new MonitoringPlugin(initContext);
};
export const config: PluginConfigDescriptor<TypeOf<typeof configSchema>> = {
  schema: configSchema,
  deprecations,
  exposeToBrowser: {
    ui: {
      enabled: true,
      min_interval_seconds: true,
      show_license_expiration: true,
      container: true,
      ccs: {
        enabled: true,
      },
      kibana: {
        reporting: {
          stale_status_threshold_seconds: true,
        },
      },
      logs: true,
    },
    kibana: true,
  },
};
