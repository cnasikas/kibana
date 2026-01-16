/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { DirectorService } from './service';
import { QueryService } from '../services/query_service/query_service';
import { InternalEsqlExecutor } from '../services/query_service/internal_esql_executor';
import { StorageService } from '../services/storage_service/storage_service';
import { LoggerService } from '../services/logger_service/logger_service';
import type { AlertTransition } from '../../resources/alert_transitions';
import { ALERT_TRANSITIONS_DATA_STREAM } from '../../resources/alert_transitions';

describe('DirectorService', () => {
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockLogger: jest.Mocked<Logger>;
  let mockLoggerService: LoggerService;
  let queryService: QueryService;
  let storageService: StorageService;
  let directorService: DirectorService;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockLogger = loggerMock.create();
    mockLoggerService = new LoggerService(mockLogger);

    queryService = new QueryService(new InternalEsqlExecutor(mockEsClient), mockLoggerService);
    storageService = new StorageService(mockEsClient, mockLoggerService);
    directorService = new DirectorService(queryService, storageService, mockLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('should execute query and bulk index transitions', async () => {
      const timestamp = new Date().toISOString();
      const existingEpisodeId = randomUUID();

      const mockQueryResponse: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'rule_id', type: 'keyword' },
          { name: 'alert_series_id', type: 'keyword' },
          { name: 'episode_id', type: 'keyword' },
          { name: 'start_state', type: 'keyword' },
          { name: 'end_state', type: 'keyword' },
        ],
        values: [
          [timestamp, 'rule-1', 'series-1', existingEpisodeId, 'active', 'recovering'],
          [timestamp, 'rule-2', 'series-2', null, 'pending', 'active'],
        ],
      };

      // @ts-expect-error - not all fields are used
      mockEsClient.esql.query.mockResolvedValue(mockQueryResponse);

      mockEsClient.bulk.mockResolvedValue({
        // @ts-expect-error - not all fields are used
        items: [{ create: { _id: '1', status: 201 } }, { create: { _id: '2', status: 201 } }],
        errors: false,
      });

      await directorService.run();

      expect(mockEsClient.esql.query).toHaveBeenCalledWith({
        query: expect.any(String),
        drop_null_columns: false,
      });

      expect(mockEsClient.bulk).toHaveBeenCalledTimes(1);
      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      expect(bulkCall.operations).toBeDefined();
      const operations = bulkCall.operations!;

      expect(operations).toHaveLength(4); // 2 index operations + 2 docs
      expect(operations[0]).toEqual({ create: { _index: ALERT_TRANSITIONS_DATA_STREAM } });
      expect(operations[1]).toMatchObject({
        '@timestamp': timestamp,
        rule_id: 'rule-1',
        alert_series_id: 'series-1',
        episode_id: existingEpisodeId,
        start_state: 'active',
        end_state: 'recovering',
      });

      expect(operations[2]).toEqual({ create: { _index: ALERT_TRANSITIONS_DATA_STREAM } });
      expect(operations[3]).toMatchObject({
        '@timestamp': timestamp,
        rule_id: 'rule-2',
        alert_series_id: 'series-2',
        episode_id: expect.any(String),
        start_state: 'pending',
        end_state: 'active',
      });

      // @ts-expect-error - episode_id exists
      expect(operations[3].episode_id).not.toBeNull();
      // @ts-expect-error - episode_id exists
      expect(operations[3].episode_id).not.toBe(existingEpisodeId);
    });

    it('should return early when no transitions are detected', async () => {
      const emptyResponse: ESQLSearchResponse = {
        columns: [],
        values: [],
      };

      // @ts-expect-error - not all fields are used
      mockEsClient.esql.query.mockResolvedValue(emptyResponse);

      await directorService.run();

      expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it('should throw and log error when query execution fails', async () => {
      const error = new Error('ES|QL query failed');
      mockEsClient.esql.query.mockRejectedValue(error);

      await expect(directorService.run()).rejects.toThrow('ES|QL query failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw and log error when bulk indexing fails', async () => {
      const timestamp = new Date().toISOString();

      const response: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'rule_id', type: 'keyword' },
          { name: 'alert_series_id', type: 'keyword' },
          { name: 'episode_id', type: 'keyword' },
          { name: 'start_state', type: 'keyword' },
          { name: 'end_state', type: 'keyword' },
        ],
        values: [[timestamp, 'rule-1', 'series-1', 'existing-episode-id', 'inactive', 'pending']],
      };

      const bulkError = new Error('Bulk indexing failed');

      // @ts-expect-error - not all fields are used
      mockEsClient.esql.query.mockResolvedValue(response);
      mockEsClient.bulk.mockRejectedValue(bulkError);

      await expect(directorService.run()).rejects.toThrow('Bulk indexing failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('episode ID assignment', () => {
    it('should generate new UUID when start_state is inactive', async () => {
      const timestamp = new Date().toISOString();
      const response: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'rule_id', type: 'keyword' },
          { name: 'alert_series_id', type: 'keyword' },
          { name: 'episode_id', type: 'keyword' },
          { name: 'start_state', type: 'keyword' },
          { name: 'end_state', type: 'keyword' },
        ],
        values: [[timestamp, 'rule-1', 'series-1', 'old-episode-id', 'inactive', 'pending']],
      };

      // @ts-expect-error - not all fields are used
      mockEsClient.esql.query.mockResolvedValue(response);

      mockEsClient.bulk.mockResolvedValue({
        // @ts-expect-error - not all fields are used
        items: [{ create: { _id: '1', status: 201 } }],
        errors: false,
      });

      await directorService.run();

      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      const operations = bulkCall.operations!;
      const transitionDoc = operations[1] as AlertTransition;

      expect(transitionDoc.episode_id).not.toBe('old-episode-id');
    });

    it('should generate new UUID when episode_id is null', async () => {
      const timestamp = new Date().toISOString();
      const response: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'rule_id', type: 'keyword' },
          { name: 'alert_series_id', type: 'keyword' },
          { name: 'episode_id', type: 'keyword' },
          { name: 'start_state', type: 'keyword' },
          { name: 'end_state', type: 'keyword' },
        ],
        values: [[timestamp, 'rule-1', 'series-1', null, 'pending', 'active']],
      };

      // @ts-expect-error - not all fields are used
      mockEsClient.esql.query.mockResolvedValue(response);
      mockEsClient.bulk.mockResolvedValue({
        // @ts-expect-error - not all fields are used
        items: [{ create: { _id: '1', status: 201 } }],
        errors: false,
      });

      await directorService.run();

      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      const operations = bulkCall.operations!;
      const transitionDoc = operations[1] as AlertTransition;

      expect(transitionDoc.episode_id).not.toBeNull();
    });

    it('should preserve existing episode_id when start_state is not inactive and episode_id is not null', async () => {
      const timestamp = new Date().toISOString();
      const existingEpisodeId = randomUUID();
      const response: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'rule_id', type: 'keyword' },
          { name: 'alert_series_id', type: 'keyword' },
          { name: 'episode_id', type: 'keyword' },
          { name: 'start_state', type: 'keyword' },
          { name: 'end_state', type: 'keyword' },
        ],
        values: [[timestamp, 'rule-1', 'series-1', existingEpisodeId, 'active', 'recovering']],
      };

      // @ts-expect-error - not all fields are used
      mockEsClient.esql.query.mockResolvedValue(response);
      mockEsClient.bulk.mockResolvedValue({
        // @ts-expect-error - not all fields are used
        items: [{ create: { _id: '1', status: 201 } }],
        errors: false,
      });

      await directorService.run();

      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      const operations = bulkCall.operations!;
      const transitionDoc = operations[1] as AlertTransition;

      expect(transitionDoc.episode_id).toBe(existingEpisodeId);
    });
  });
});
