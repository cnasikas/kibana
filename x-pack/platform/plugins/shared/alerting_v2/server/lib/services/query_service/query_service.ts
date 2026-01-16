/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import { inject, injectable } from 'inversify';
import { LoggerService } from '../logger_service/logger_service';
import type { IEsqlExecutor } from './esql_executor';

interface ExecuteQueryParams {
  query: ESQLSearchParams['query'];
  dropNullColumns?: boolean;
  filter?: ESQLSearchParams['filter'];
  params?: ESQLSearchParams['params'];
}

@injectable()
export class QueryService {
  constructor(
    private readonly executor: IEsqlExecutor,
    @inject(LoggerService) private readonly logger: LoggerService
  ) {}

  async executeQuery({
    query,
    dropNullColumns = false,
    filter,
    params,
  }: ExecuteQueryParams): Promise<ESQLSearchResponse> {
    try {
      this.logger.debug({
        message: () =>
          `QueryService: Executing query - ${JSON.stringify({
            query,
            dropNullColumns,
            filter,
            params,
          })}`,
      });

      const searchResponse = await this.executor.execute({
        query,
        dropNullColumns,
        filter,
        params,
      });

      this.logger.debug({
        message: `QueryService: Query executed successfully, returned ${searchResponse.values.length} rows`,
      });

      return searchResponse;
    } catch (error) {
      this.logger.error({
        error,
        code: 'ESQL_QUERY_ERROR',
        type: 'QueryServiceError',
      });

      throw error;
    }
  }

  public queryResponseToRecords<T extends Record<string, any>>(response: ESQLSearchResponse): T[] {
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
}
