/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { OnStart, PluginStart } from '@kbn/core-di';
import { ResourceManager } from '../lib/services/resource_service/resource_manager';
import { initializeResources } from '../resources/register_resources';
import { LoggerServiceToken } from '../lib/services/logger_service/logger_service';
import { EsServiceInternalToken } from '../lib/services/es_service/tokens';
import type { AlertingServerStartDependencies } from '../types';
import { scheduleDirectorTask } from '../lib/director/schedule_task';

export function bindOnStart({ bind }: ContainerModuleLoadOptions) {
  bind(OnStart).toConstantValue((container) => {
    const taskManager = container.get(
      PluginStart<AlertingServerStartDependencies['taskManager']>('taskManager')
    );
    const resourceManager = container.get(ResourceManager);
    const logger = container.get(LoggerServiceToken);
    const esClient = container.get(EsServiceInternalToken);

    initializeResources({
      logger,
      resourceManager,
      esClient,
    });

    void scheduleDirectorTask({
      taskManager,
      logger,
    }).catch(() => {
      logger.error({
        error: new Error('Failed to schedule director task'),
        code: 'TASK_ERROR',
        type: 'DirectorTaskError',
      });
    });
  });
}
