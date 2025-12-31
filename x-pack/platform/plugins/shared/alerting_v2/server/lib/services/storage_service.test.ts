/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { StorageService } from './storage_service';

describe('StorageService', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockLogger: jest.Mocked<Logger>;
  let storageService: StorageService;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockLogger = loggerMock.create();
    storageService = new StorageService(mockEsClient, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('bulkIndexDocs', () => {
    const index = '.kibana_alert_transitions';
    const mockDocs = [
      { '@timestamp': '2024-01-01T00:00:00Z', rule_id: 'rule-1', alert_series_id: 'series-1' },
      { '@timestamp': '2024-01-01T00:01:00Z', rule_id: 'rule-2', alert_series_id: 'series-2' },
    ];

    it('should return early when docs array is empty', async () => {
      await storageService.bulkIndexDocs({ index, docs: [] });

      expect(mockEsClient.bulk).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('should successfully bulk index documents', async () => {
      const mockBulkResponse = {
        items: [{ index: { _id: '1', status: 201 } }, { index: { _id: '2', status: 201 } }],
        errors: false,
        took: 10,
      };

      mockEsClient.bulk.mockResolvedValue(mockBulkResponse as any);

      await storageService.bulkIndexDocs({ index, docs: mockDocs });

      expect(mockEsClient.bulk).toHaveBeenCalledTimes(1);
      expect(mockEsClient.bulk).toHaveBeenCalledWith({
        operations: [
          { index: { _index: index } },
          mockDocs[0],
          { index: { _index: index } },
          mockDocs[1],
        ],
        refresh: 'wait_for',
      });

      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should format operations correctly for bulk indexing', async () => {
      const mockBulkResponse = {
        items: [{ index: { _id: '1', status: 201 } }],
        errors: false,
      };

      mockEsClient.bulk.mockResolvedValue(mockBulkResponse as any);

      const singleDoc = [mockDocs[0]];
      await storageService.bulkIndexDocs({ index, docs: singleDoc });

      expect(mockEsClient.bulk).toHaveBeenCalledWith({
        operations: [{ index: { _index: index } }, singleDoc[0]],
        refresh: 'wait_for',
      });
    });

    it('should log error when bulk response contains errors', async () => {
      const mockBulkResponse = {
        items: [
          { index: { _id: '1', status: 201 } },
          {
            index: {
              _id: '2',
              status: 400,
              error: {
                type: 'mapper_parsing_exception',
                reason: 'failed to parse',
                status: 400,
              },
            },
          },
        ],
        errors: true,
        took: 5,
      };

      mockEsClient.bulk.mockResolvedValue(mockBulkResponse as any);

      await storageService.bulkIndexDocs({ index, docs: mockDocs });

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle bulk response with errors but no error items gracefully', async () => {
      const mockBulkResponse = {
        items: [{ index: { _id: '1', status: 201 } }],
        errors: true, // errors flag is true but no actual error in items
        took: 5,
      };

      mockEsClient.bulk.mockResolvedValue(mockBulkResponse as any);

      await storageService.bulkIndexDocs({ index, docs: [mockDocs[0]] });

      // Should not log error if no error item found
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should throw error and log when bulk operation fails', async () => {
      const error = new Error('Elasticsearch connection failed');
      mockEsClient.bulk.mockRejectedValue(error);

      await expect(storageService.bulkIndexDocs({ index, docs: mockDocs })).rejects.toThrow(
        'Elasticsearch connection failed'
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle multiple documents correctly', async () => {
      const manyDocs = Array.from({ length: 5 }, (_, i) => ({
        '@timestamp': `2024-01-01T00:0${i}:00Z`,
        rule_id: `rule-${i}`,
        alert_series_id: `series-${i}`,
      }));

      const mockBulkResponse = {
        items: manyDocs.map(() => ({ index: { _id: '1', status: 201 } })),
        errors: false,
      };

      mockEsClient.bulk.mockResolvedValue(mockBulkResponse as any);

      await storageService.bulkIndexDocs({ index, docs: manyDocs });

      expect(mockEsClient.bulk).toHaveBeenCalledTimes(1);
      // Should have 10 operations (5 index operations + 5 docs)
      expect(mockEsClient.bulk).toHaveBeenCalledWith({
        operations: expect.arrayContaining([{ index: { _index: index } }, ...manyDocs]),
        refresh: 'wait_for',
      });
    });

    it('should handle error without stack trace', async () => {
      const error = new Error('Test error');
      delete (error as any).stack;
      mockEsClient.bulk.mockRejectedValue(error);

      await expect(storageService.bulkIndexDocs({ index, docs: mockDocs })).rejects.toThrow(
        'Test error'
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      const error = 'String error';
      mockEsClient.bulk.mockRejectedValue(error);

      await expect(storageService.bulkIndexDocs({ index, docs: mockDocs })).rejects.toBe(error);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
