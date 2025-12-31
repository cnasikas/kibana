/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { TaskPriority, TaskCost } from '@kbn/task-manager-plugin/server';
import type { DirectorService } from './service';

export const DIRECTOR_TASK_TYPE = 'alerting_v2:director';

export function registerDirectorTask(
  taskManager: TaskManagerSetupContract,
  getDirectorService: () => DirectorService,
  logger: Logger
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
          const directorService = getDirectorService();
          const taskId = taskInstance.id;

          logger.debug(`Director task ${taskId} starting execution`);

          try {
            await directorService.run();

            return {
              state: {},
            };
          } catch (error) {
            logger.error(`Director task ${taskId} failed: ${error.message}`, {
              error: {
                code: 'TASK_ERROR',
                message: error.message,
                stack_trace: error.stack,
                type: 'DirectorTaskError',
              },
              taskId,
            });

            throw error;
          }
        },
        async cancel() {
          logger.debug(`Director task ${taskInstance.id} cancelled`);
        },
      }),
    },
  });
}
