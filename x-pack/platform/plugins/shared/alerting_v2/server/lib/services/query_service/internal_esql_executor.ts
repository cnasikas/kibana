/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { FieldValue, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { inject, injectable } from 'inversify';
import type { IEsqlExecutor, IEsqlExecutorParams } from './esql_executor';
import { EsServiceInternalToken } from '../es_service/tokens';

/**
 * Executes ES|QL directly using an internal Elasticsearch client.
 *
 * We intentionally use `esClient.esql.query` to avoid requiring a scoped Kibana request
 * and to allow usage from background tasks.
 */
@injectable()
export class InternalEsqlExecutor implements IEsqlExecutor {
  constructor(@inject(EsServiceInternalToken) private readonly esClient: ElasticsearchClient) {}

  public async execute({
    query,
    dropNullColumns,
    filter,
    params,
    abortSignal,
  }: IEsqlExecutorParams): Promise<ESQLSearchResponse> {
    const response = await this.esClient.esql.query(
      {
        query,
        drop_null_columns: dropNullColumns,
        filter: filter as QueryDslQueryContainer,
        params: params as FieldValue[],
      },
      {
        signal: abortSignal,
      }
    );

    return {
      columns: response.columns,
      values: response.values,
      all_columns: response.all_columns,
      took: response.took,
    };
  }
}
