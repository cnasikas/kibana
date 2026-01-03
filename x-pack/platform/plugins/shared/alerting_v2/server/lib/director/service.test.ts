/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { EsqlEsqlResult } from '@elastic/elasticsearch/lib/api/types';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { DirectorService } from './service';
import { StorageService } from '../services/storage_service';
import { EsqlService } from '../services/esql_service';
import { LoggerService } from '../services/logger_service';
import { DETECT_SIGNAL_CHANGE_QUERY, DETECT_STATE_MATURATION_QUERY } from './queries';
import { ALERT_TRANSITIONS_INDEX } from './constants';

describe('DirectorService', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let storageService: StorageService;
  let esqlService: EsqlService;
  let mockLogger: jest.Mocked<Logger>;
  let mockLoggerService: LoggerService;
  let directorService: DirectorService;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockLogger = loggerMock.create();
    mockLoggerService = new LoggerService(mockLogger);

    storageService = new StorageService(mockEsClient, mockLoggerService);
    esqlService = new EsqlService(mockEsClient, mockLoggerService);
    directorService = new DirectorService(storageService, esqlService, mockLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('should execute both queries concurrently', async () => {
      const signalChangeResponse: EsqlEsqlResult = {
        columns: [],
        values: [],
      };

      const stateMaturationResponse: EsqlEsqlResult = {
        columns: [],
        values: [],
      };

      mockEsClient.esql.query = jest
        .fn()
        .mockResolvedValueOnce(signalChangeResponse)
        .mockResolvedValueOnce(stateMaturationResponse);

      await directorService.run();

      expect(mockEsClient.esql.query).toHaveBeenCalledTimes(2);
      expect(mockEsClient.esql.query).toHaveBeenNthCalledWith(1, {
        query: DETECT_SIGNAL_CHANGE_QUERY,
        drop_null_columns: false,
      });

      expect(mockEsClient.esql.query).toHaveBeenNthCalledWith(2, {
        query: DETECT_STATE_MATURATION_QUERY,
        drop_null_columns: false,
      });
    });

    it('should process transitions and bulk index them', async () => {
      const timestamp = new Date().toISOString();
      const existingEpisodeId = randomUUID();

      const signalChangeResponse: EsqlEsqlResult = {
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

      const stateMaturationResponse: EsqlEsqlResult = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'rule_id', type: 'keyword' },
          { name: 'alert_series_id', type: 'keyword' },
          { name: 'episode_id', type: 'keyword' },
          { name: 'start_state', type: 'keyword' },
          { name: 'end_state', type: 'keyword' },
        ],
        values: [[timestamp, 'rule-2', 'series-2', null, 'pending', 'active']],
      };

      mockEsClient.esql.query = jest
        .fn()
        .mockResolvedValueOnce(signalChangeResponse)
        .mockResolvedValueOnce(stateMaturationResponse);

      mockEsClient.bulk.mockResolvedValue({
        // @ts-expect-error - not all fields are used
        items: [{ index: { _id: '1', status: 201 } }, { index: { _id: '2', status: 201 } }],
        errors: false,
      });

      await directorService.run();

      expect(mockEsClient.bulk).toHaveBeenCalledTimes(1);
      const bulkCall = mockEsClient.bulk.mock.calls[0][0];

      expect(bulkCall.operations).toBeDefined();
      const operations = bulkCall.operations!;

      expect(operations).toHaveLength(4); // 2 index operations + 2 docs
      expect(operations[0]).toEqual({ index: { _index: ALERT_TRANSITIONS_INDEX } });
      expect(operations[1]).toEqual({
        '@timestamp': timestamp,
        rule_id: 'rule-1',
        alert_series_id: 'series-1',
        episode_id: existingEpisodeId,
        start_state: 'active',
        end_state: 'recovering',
      });

      expect(operations[2]).toEqual({ index: { _index: ALERT_TRANSITIONS_INDEX } });
      expect(operations[3]).toEqual({
        '@timestamp': timestamp,
        rule_id: 'rule-2',
        alert_series_id: 'series-2',
        episode_id: expect.any(String),
        start_state: 'pending',
        end_state: 'active',
      });
    });

    it('should return early when no transitions are detected', async () => {
      const emptyResponse: EsqlEsqlResult = {
        columns: [],
        values: [],
      };

      mockEsClient.esql.query = jest
        .fn()
        .mockResolvedValueOnce(emptyResponse)
        .mockResolvedValueOnce(emptyResponse);

      await directorService.run();

      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it('should throw and log error when query execution fails', async () => {
      const error = new Error('ES|QL query failed');
      mockEsClient.esql.query = jest.fn().mockRejectedValue(error);

      await expect(directorService.run()).rejects.toThrow('ES|QL query failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw and log error when bulk indexing fails', async () => {
      const timestamp = new Date().toISOString();

      const response: EsqlEsqlResult = {
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

      mockEsClient.esql.query = jest
        .fn()
        .mockResolvedValueOnce(response)
        .mockResolvedValueOnce(response);

      mockEsClient.bulk.mockRejectedValue(bulkError);

      await expect(directorService.run()).rejects.toThrow('Bulk indexing failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('episode ID assignment', () => {
    it('should generate new UUID when start_state is inactive', async () => {
      const timestamp = new Date().toISOString();
      const response: EsqlEsqlResult = {
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

      mockEsClient.esql.query = jest
        .fn()
        .mockResolvedValueOnce(response)
        .mockResolvedValueOnce({ columns: [], values: [] });

      mockEsClient.bulk.mockResolvedValue({
        // @ts-expect-error - not all fields are used
        items: [{ index: { _id: '1', status: 201 } }],
        errors: false,
      });

      await directorService.run();

      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      const operations = bulkCall.operations!;

      expect(bulkCall.operations).toBeDefined();
      // @ts-expect-error - episode_id exists
      expect(operations[1].episode_id).toEqual(expect.any(String));
      // @ts-expect-error - episode_id exists
      expect(operations[1].episode_id).not.toBe('existing-episode-id');
    });

    it('should generate new UUID when episode_id is null', async () => {
      const timestamp = new Date().toISOString();
      const response: EsqlEsqlResult = {
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

      mockEsClient.esql.query = jest
        .fn()
        .mockResolvedValueOnce(response)
        .mockResolvedValueOnce({ columns: [], values: [] });

      mockEsClient.bulk.mockResolvedValue({
        // @ts-expect-error - not all fields are used
        items: [{ index: { _id: '1', status: 201 } }],
        errors: false,
      });

      await directorService.run();

      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      const operations = bulkCall.operations!;

      expect(bulkCall.operations).toBeDefined();
      // @ts-expect-error - episode_id exists
      expect(operations[1].episode_id).toEqual(expect.any(String));
    });

    it('should preserve existing episode_id when start_state is not inactive and episode_id is not null', async () => {
      const timestamp = new Date().toISOString();
      const existingEpisodeId = randomUUID();

      const response: EsqlEsqlResult = {
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

      mockEsClient.esql.query = jest
        .fn()
        .mockResolvedValueOnce(response)
        .mockResolvedValueOnce({ columns: [], values: [] });

      mockEsClient.bulk.mockResolvedValue({
        // @ts-expect-error - not all fields are used
        items: [{ index: { _id: '1', status: 201 } }],
        errors: false,
      });

      await directorService.run();

      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      const operations = bulkCall.operations!;

      expect(bulkCall.operations).toBeDefined();
      // @ts-expect-error - episode_id exists
      expect(operations[1].episode_id).toBe(existingEpisodeId);
    });

    it('should handle multiple transitions with different episode ID scenarios', async () => {
      const timestamp = new Date().toISOString();
      const existingEpisodeId = randomUUID();

      const response: EsqlEsqlResult = {
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
          [timestamp, 'rule-3', 'series-3', 'another-id', 'inactive', 'pending'],
        ],
      };

      mockEsClient.esql.query = jest
        .fn()
        .mockResolvedValueOnce(response)
        .mockResolvedValueOnce({ columns: [], values: [] });

      mockEsClient.bulk.mockResolvedValue({
        items: [
          { index: { _id: '1', status: 201 } },
          { index: { _id: '2', status: 201 } },
          { index: { _id: '3', status: 201 } },
        ],
        errors: false,
      } as any);

      await directorService.run();

      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      const operations = bulkCall.operations!;

      expect(bulkCall.operations).toBeDefined();
      expect(operations).toHaveLength(6); // 3 index operations + 3 docs
      // @ts-expect-error - episode_id exists
      expect(operations[1].episode_id).toBe(existingEpisodeId); // Preserved
      // @ts-expect-error - episode_id exists
      expect(operations[3].episode_id).toEqual(expect.any(String)); // New UUID (null)
      // @ts-expect-error - episode_id exists
      expect(operations[5].episode_id).toEqual(expect.any(String)); // New UUID (inactive)
      // @ts-expect-error - episode_id exists
      expect(operations[5].episode_id).not.toBe('another-id');
    });
  });
});
