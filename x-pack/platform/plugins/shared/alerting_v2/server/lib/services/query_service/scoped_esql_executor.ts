/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { ESQL_SEARCH_STRATEGY, isRunningResponse } from '@kbn/data-plugin/common';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { filter as rxFilter, lastValueFrom, map } from 'rxjs';
import type { IEsqlExecutor, IEsqlExecutorParams } from './esql_executor';

/**
 * Executes ES|QL via Kibana `data.search` (ESQL search strategy).
 * Requires a scoped request-backed search client.
 */
export class ScopedEsqlExecutor implements IEsqlExecutor {
  constructor(private readonly searchClient: IScopedSearchClient) {}

  public async execute({
    query,
    filter,
    params,
  }: IEsqlExecutorParams): Promise<ESQLSearchResponse> {
    const request: IKibanaSearchRequest<ESQLSearchParams> = {
      params: {
        query,
        dropNullColumns: false,
        filter,
        params,
      },
    };

    return await lastValueFrom(
      this.searchClient
        .search<IKibanaSearchRequest<ESQLSearchParams>, IKibanaSearchResponse<ESQLSearchResponse>>(
          request,
          {
            strategy: ESQL_SEARCH_STRATEGY,
          }
        )
        .pipe(
          rxFilter((resp) => !isRunningResponse(resp)),
          map((resp) => resp.rawResponse)
        )
    );
  }
}
