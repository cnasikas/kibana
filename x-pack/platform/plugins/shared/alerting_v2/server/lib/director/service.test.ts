/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { of, throwError } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { DirectorService } from './service';
import { QueryService } from '../services/query_service/query_service';
import { StorageService } from '../services/storage_service/storage_service';
import { LoggerService } from '../services/logger_service/logger_service';
import { DETECT_SIGNAL_CHANGE_QUERY } from './queries';
import type { AlertTransition } from '../../resources/alert_transitions';
import { ALERT_TRANSITIONS_DATA_STREAM } from '../../resources/alert_transitions';

describe('DirectorService', () => {
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockSearchClient: jest.Mocked<IScopedSearchClient>;
  let mockLogger: jest.Mocked<Logger>;
  let mockLoggerService: LoggerService;
  let queryService: QueryService;
  let storageService: StorageService;
  let directorService: DirectorService;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockLogger = loggerMock.create();
    mockLoggerService = new LoggerService(mockLogger);

    // @ts-expect-error - dataPluginMock is not typed correctly
    mockSearchClient = dataPluginMock
      .createStartContract()
      .search.asScoped(httpServerMock.createKibanaRequest({}));

    queryService = new QueryService(mockSearchClient, mockLoggerService);
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

      mockSearchClient.search.mockReturnValue(
        of({
          isRunning: false,
          rawResponse: mockQueryResponse,
        })
      );

      mockEsClient.bulk.mockResolvedValue({
        // @ts-expect-error - not all fields are used
        items: [{ index: { _id: '1', status: 201 } }, { index: { _id: '2', status: 201 } }],
        errors: false,
      });

      await directorService.run();

      expect(mockSearchClient.search).toHaveBeenCalledTimes(1);
      expect(mockSearchClient.search).toHaveBeenCalledWith(
        {
          params: {
            query: DETECT_SIGNAL_CHANGE_QUERY,
            dropNullColumns: false,
          },
        },
        {
          strategy: 'esql',
        }
      );

      expect(mockEsClient.bulk).toHaveBeenCalledTimes(1);
      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      expect(bulkCall.operations).toBeDefined();
      const operations = bulkCall.operations!;

      expect(operations).toHaveLength(4); // 2 index operations + 2 docs
      expect(operations[0]).toEqual({ index: { _index: ALERT_TRANSITIONS_DATA_STREAM } });
      expect(operations[1]).toMatchObject({
        '@timestamp': timestamp,
        rule_id: 'rule-1',
        alert_series_id: 'series-1',
        episode_id: existingEpisodeId,
        start_state: 'active',
        end_state: 'recovering',
      });

      expect(operations[2]).toEqual({ index: { _index: ALERT_TRANSITIONS_DATA_STREAM } });
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

      mockSearchClient.search.mockReturnValue(
        of({
          isRunning: false,
          rawResponse: emptyResponse,
        })
      );

      await directorService.run();

      expect(mockSearchClient.search).toHaveBeenCalledTimes(1);
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it('should throw and log error when query execution fails', async () => {
      const error = new Error('ES|QL query failed');
      mockSearchClient.search.mockReturnValue(throwError(() => error));

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

      mockSearchClient.search.mockReturnValue(
        of({
          isRunning: false,
          rawResponse: response,
        })
      );
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

      mockSearchClient.search.mockReturnValue(
        of({
          isRunning: false,
          rawResponse: response,
        })
      );

      mockEsClient.bulk.mockResolvedValue({
        // @ts-expect-error - not all fields are used
        items: [{ index: { _id: '1', status: 201 } }],
        errors: false,
      });

      await directorService.run();

      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      const operations = bulkCall.operations!;
      const transitionDoc = operations[1] as AlertTransition;

      expect(transitionDoc.episode_id).not.toBe('old-episode-id');
      expect(transitionDoc.episode_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
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

      mockSearchClient.search.mockReturnValue(
        of({
          isRunning: false,
          rawResponse: response,
        })
      );
      mockEsClient.bulk.mockResolvedValue({
        // @ts-expect-error - not all fields are used
        items: [{ index: { _id: '1', status: 201 } }],
        errors: false,
      });

      await directorService.run();

      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      const operations = bulkCall.operations!;
      const transitionDoc = operations[1] as AlertTransition;

      expect(transitionDoc.episode_id).not.toBeNull();
      expect(transitionDoc.episode_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
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

      mockSearchClient.search.mockReturnValue(
        of({
          isRunning: false,
          rawResponse: response,
        })
      );
      mockEsClient.bulk.mockResolvedValue({
        // @ts-expect-error - not all fields are used
        items: [{ index: { _id: '1', status: 201 } }],
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
