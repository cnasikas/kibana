/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { EsqlEsqlResult } from '@elastic/elasticsearch/lib/api/types';
import type { EcsError } from '@elastic/ecs';

interface ExecuteEsqlQueryParams {
  query: string;
}

export class EsqlService {
  constructor(private readonly esClient: ElasticsearchClient, private readonly logger: Logger) {}

  async executeQuery({ query }: ExecuteEsqlQueryParams): Promise<EsqlEsqlResult> {
    try {
      this.logger.debug(`EsqlService: Executing ES|QL query`);

      const queryRequest = {
        query,
        drop_null_columns: false,
      };

      const response = await this.esClient.esql.query(queryRequest);

      this.logger.debug(
        `EsqlService: Query executed successfully, returned ${response.values.length} rows`
      );

      return response;
    } catch (error) {
      this.logger.error(`EsqlService: Error executing ES|QL query`, {
        error: this.buildError(error),
      });

      throw error;
    }
  }

  public queryResponseToObject<T extends Record<string, any>>(response: EsqlEsqlResult): T[] {
    const objects: T[] = [];

    if (response.columns.length === 0 || response.values.length === 0) {
      return [];
    }

    for (const row of response.values) {
      const object: T = {} as T;

      for (const [columnIndex, value] of row.entries()) {
        const columnName = response.columns[columnIndex]?.name as keyof T;

        if (columnName) {
          object[columnName] = value as T[keyof T];
        }
      }

      objects.push(object);
    }

    return objects;
  }

  private buildError(error: Error): EcsError {
    return {
      code: 'ESQL_QUERY_ERROR',
      message: error.message,
      stack_trace: error.stack,
      type: 'EsqlServiceError',
    };
  }
}
