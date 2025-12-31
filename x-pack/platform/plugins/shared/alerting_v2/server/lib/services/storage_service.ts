/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { EcsError } from '@elastic/ecs';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';

interface BulkIndexDocsParams {
  index: string;
  docs: Record<string, any>[];
}

export class StorageService {
  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {}

  public async bulkIndexDocs({ index, docs }: BulkIndexDocsParams): Promise<void> {
    if (docs.length === 0) {
      return;
    }

    const operations = docs.flatMap((doc) => [{ index: { _index: index } }, doc]);

    try {
      const response = await this.esClient.bulk({
        operations,
        refresh: 'wait_for',
      });

      this.logFirstError(response);

      this.logger.debug(
        `StorageService: Successfully bulk indexed ${docs.length} documents to index: ${index}`
      );
    } catch (error) {
      this.logger.error(
        `StorageService: Error bulk indexing documents to index: ${index} - ${error.message}`,
        {
          error: this.buildError(error),
        }
      );

      throw error;
    }
  }

  private logFirstError(response: BulkResponse): void {
    if (response.errors) {
      const firstErrorItem = response.items.find((item) => item.index?.error);

      if (firstErrorItem) {
        const error = firstErrorItem.index?.error;
        this.logger.error(
          `StorageService: Bulk indexing encountered error at item ${error?.status}: [${error?.type}] ${error?.reason}`,
          {
            error,
          }
        );
      }
    }
  }

  private buildError(error: Error): EcsError {
    return {
      code: 'BULK_INDEX_ERROR',
      message: error.message,
      stack_trace: error.stack,
      type: 'StorageServiceError',
    };
  }
}
