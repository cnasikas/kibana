/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { TaskPriority, TaskCost } from '@kbn/task-manager-plugin/server';
import type { Container } from 'inversify';
import { DirectorService } from './service';
import { LoggerService } from '../services/logger_service/logger_service';
import { ResourceManager } from '../services/resource_service/resource_manager';

export const DIRECTOR_TASK_TYPE = 'alerting_v2:director';

export function registerDirectorTask(
  taskManager: TaskManagerSetupContract,
  container: Container
): void {
  taskManager.registerTaskDefinitions({
    [DIRECTOR_TASK_TYPE]: {
      title: 'Alerting Director',
      description:
        'Processes alert state transitions by executing ES|QL queries to detect signal changes and state maturation',
      timeout: '60m',
      maxAttempts: 3,
      cost: TaskCost.Normal,
      priority: TaskPriority.Normal,
      createTaskRunner: ({ taskInstance, fakeRequest }: RunContext) => ({
        async run() {
          if (!fakeRequest) {
            throw new Error(
              `Cannot execute director task without Task Manager fakeRequest. Ensure the task is scheduled with an API key (task id: ${taskInstance.id})`
            );
          }

          const taskId = taskInstance.id;

          const loggerService = container.get(LoggerService);
          const directorService = container.get(DirectorService);
          const resourcesService = container.get(ResourceManager);

          loggerService.debug({
            message: `Director task ${taskId} starting execution`,
          });

          try {
            await resourcesService.waitUntilReady();
            await directorService.run();

            return {
              state: {},
            };
          } catch (error) {
            loggerService.error({
              error,
              code: 'TASK_ERROR',
              type: 'DirectorTaskError',
            });

            throw error;
          }
        },
        async cancel() {
          const loggerService = container.get(LoggerService);
          loggerService.debug({
            message: `Director task ${taskInstance.id} cancelled`,
          });
        },
      }),
    },
  });
}
