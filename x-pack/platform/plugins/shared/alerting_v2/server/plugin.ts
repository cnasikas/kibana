/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';

import type {
  AlertingServerSetup,
  AlertingServerStart,
  AlertingServerSetupDependencies,
  AlertingServerStartDependencies,
} from './types';
import { registerFeaturePrivileges } from './lib/security/privileges';
import { ServiceManager } from './lib/service_manager';
import { registerDirectorTask } from './lib/director/register_task';

export class AlertingPlugin
  implements
    Plugin<
      AlertingServerSetup,
      AlertingServerStart,
      AlertingServerSetupDependencies,
      AlertingServerStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly serviceManager: ServiceManager;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('alerting_v2');
    this.serviceManager = new ServiceManager();
  }

  public setup(core: CoreSetup, plugins: AlertingServerSetupDependencies) {
    registerFeaturePrivileges(plugins.features);

    registerDirectorTask(plugins.taskManager, this.serviceManager);

    this.logger.info('Alerting V2 plugin setup completed');
  }

  public start(core: CoreStart, plugins: AlertingServerStartDependencies) {
    // Initialize all services with their dependencies
    this.serviceManager.initialize({
      logger: this.logger,
      elasticsearch: core.elasticsearch,
    });

    this.logger.info('Alerting V2 plugin started successfully');

    return;
  }

  public stop() {
    this.logger.info('Alerting V2 plugin stopped');
  }
}
