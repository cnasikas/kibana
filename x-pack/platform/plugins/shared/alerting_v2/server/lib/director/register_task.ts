/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { TaskPriority, TaskCost } from '@kbn/task-manager-plugin/server';
import type { ServiceManager } from '../service_manager';

export const DIRECTOR_TASK_TYPE = 'alerting_v2:director';

export function registerDirectorTask(
  taskManager: TaskManagerSetupContract,
  serviceManager: ServiceManager
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
      createTaskRunner: ({ taskInstance }: RunContext) => ({
        async run() {
          const directorService = serviceManager.getDirectorService();
          const loggerService = serviceManager.getLoggerService();
          const taskId = taskInstance.id;

          loggerService.debug({ message: `Director task ${taskId} starting execution` });

          try {
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
          const loggerService = serviceManager.getLoggerService();
          loggerService.debug({ message: `Director task ${taskInstance.id} cancelled` });
        },
      }),
    },
  });
}
