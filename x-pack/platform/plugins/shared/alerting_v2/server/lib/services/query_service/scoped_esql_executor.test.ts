/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { of, throwError } from 'rxjs';
import { ScopedEsqlExecutor } from './scoped_esql_executor';

describe('ScopedEsqlExecutor', () => {
  let searchClient: jest.Mocked<IScopedSearchClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // @ts-expect-error - not all methods are needed
    searchClient = {
      search: jest.fn(),
    };
  });

  it('calls searchClient.search with ESQL strategy and returns rawResponse', async () => {
    const executor = new ScopedEsqlExecutor(searchClient);

    const mockResponse: ESQLSearchResponse = {
      columns: [{ name: 'rule_id', type: 'keyword' }],
      values: [['rule-1']],
    };

    searchClient.search.mockReturnValue(
      of({
        isRunning: false,
        rawResponse: mockResponse,
      })
    );

    const filter = { bool: { filter: [{ term: { foo: 'bar' } }] } };
    const params = [{ some_param: 'some_value' }];

    const result = await executor.execute({
      query: 'FROM my-index | LIMIT 1',
      dropNullColumns: false,
      filter,
      params,
    });

    expect(searchClient.search).toHaveBeenCalledTimes(1);
    expect(searchClient.search).toHaveBeenCalledWith(
      {
        params: {
          query: 'FROM my-index | LIMIT 1',
          dropNullColumns: false,
          filter,
          params,
        },
      },
      { strategy: 'esql' }
    );

    expect(result).toEqual(mockResponse);
  });

  it('throw an error if the query fails', async () => {
    const executor = new ScopedEsqlExecutor(searchClient);
    const error = new Error('boom');

    searchClient.search.mockReturnValue(throwError(() => error));

    await expect(
      executor.execute({ query: 'FROM my-index | LIMIT 1', dropNullColumns: false })
    ).rejects.toThrow('boom');
  });
});
