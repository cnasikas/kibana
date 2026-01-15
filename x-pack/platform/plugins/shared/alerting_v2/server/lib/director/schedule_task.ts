/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { DIRECTOR_TASK_TYPE } from './constants';
import type { LoggerService } from '../services/logger_service/logger_service';

export const scheduleDirectorTask = async ({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  logger: LoggerService;
}) => {
  logger.debug({
    message: 'Scheduling director task',
  });

  await taskManager.ensureScheduled({
    id: `${DIRECTOR_TASK_TYPE}:director-task`,
    taskType: DIRECTOR_TASK_TYPE,
    params: {},
    state: {},
    schedule: {
      interval: '1m',
    },
    scope: ['alerting'],
    enabled: true,
  });
};
