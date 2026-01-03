/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { Logger, ElasticsearchServiceStart, ElasticsearchClient } from '@kbn/core/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { registerDirectorTask, DIRECTOR_TASK_TYPE } from './register_task';
import { ServiceManager } from '../service_manager';

describe('registerDirectorTask', () => {
  let mockTaskManager: jest.Mocked<TaskManagerSetupContract>;
  let mockLogger: jest.Mocked<Logger>;
  let mockEsStart: jest.Mocked<ElasticsearchServiceStart>;
  let mockEsClient: ElasticsearchClient;
  let serviceManager: ServiceManager;

  beforeEach(() => {
    mockTaskManager = taskManagerMock.createSetup();
    mockLogger = loggerMock.create();
    mockEsStart = elasticsearchServiceMock.createStart();
    mockEsClient = mockEsStart.client.asInternalUser;

    mockEsClient.esql.query = jest.fn().mockResolvedValue({
      columns: [],
      values: [],
    });

    mockEsClient.bulk = jest.fn().mockResolvedValue({
      items: [],
      errors: false,
    });

    serviceManager = new ServiceManager();
    serviceManager.initialize({
      logger: mockLogger,
      elasticsearch: mockEsStart,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register the director task correctly', () => {
    registerDirectorTask(mockTaskManager, serviceManager);

    const callArgs = mockTaskManager.registerTaskDefinitions.mock.calls[0][0];
    expect(callArgs).toHaveProperty(DIRECTOR_TASK_TYPE);
    expect(DIRECTOR_TASK_TYPE).toBe('alerting_v2:director');
  });

  it('should create task runner that calls director service run method', async () => {
    registerDirectorTask(mockTaskManager, serviceManager);

    const taskDefinitions = mockTaskManager.registerTaskDefinitions.mock.calls[0][0];
    const taskDefinition = taskDefinitions[DIRECTOR_TASK_TYPE];

    const taskRunner = taskDefinition.createTaskRunner({
      // @ts-expect-error - not all properties are required
      taskInstance: {
        id: 'test-task-id',
      },
    });

    await taskRunner.run();

    expect(mockEsClient.esql.query).toHaveBeenCalled();
  });

  it('should return empty state object on successful execution', async () => {
    registerDirectorTask(mockTaskManager, serviceManager);

    const taskDefinitions = mockTaskManager.registerTaskDefinitions.mock.calls[0][0];
    const taskDefinition = taskDefinitions[DIRECTOR_TASK_TYPE];
    const taskRunner = taskDefinition.createTaskRunner({
      // @ts-expect-error - not all properties are required
      taskInstance: {
        id: 'test-task-id',
      },
    });

    const result = await taskRunner.run();

    expect(result).toEqual({
      state: {},
    });
  });

  it('should log error and throw when director service run fails', async () => {
    const error = new Error('Director service failed');
    mockEsClient.esql.query = jest.fn().mockRejectedValue(error);

    registerDirectorTask(mockTaskManager, serviceManager);

    const taskDefinitions = mockTaskManager.registerTaskDefinitions.mock.calls[0][0];
    const taskDefinition = taskDefinitions[DIRECTOR_TASK_TYPE];

    const taskRunner = taskDefinition.createTaskRunner({
      // @ts-expect-error - not all properties are required
      taskInstance: {
        id: 'failing-task-id',
      },
    });

    await expect(taskRunner.run()).rejects.toThrow('Director service failed');

    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should not call director service when task is cancelled', async () => {
    registerDirectorTask(mockTaskManager, serviceManager);

    const taskDefinitions = mockTaskManager.registerTaskDefinitions.mock.calls[0][0];
    const taskDefinition = taskDefinitions[DIRECTOR_TASK_TYPE];
    const taskRunner = taskDefinition.createTaskRunner({
      // @ts-expect-error - not all properties are required
      taskInstance: {
        id: 'cancelled-task-id',
      },
    });

    await taskRunner.cancel?.();

    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });
});
