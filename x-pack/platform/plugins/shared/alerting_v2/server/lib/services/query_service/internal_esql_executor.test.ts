/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { InternalEsqlExecutor } from './internal_esql_executor';
import type { ElasticsearchClient } from '@kbn/core/server';

describe('InternalEsqlExecutor', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('calls esClient.esql.query with query/filter/params and returns the ES|QL response', async () => {
    const mockResponse: ESQLSearchResponse = {
      columns: [{ name: 'rule_id', type: 'keyword' }],
      values: [['rule-1']],
      all_columns: [{ name: 'rule_id', type: 'keyword' }],
      took: 12,
    };

    // @ts-expect-error - not all fields are used
    esClient.esql.query.mockResolvedValue(mockResponse);

    const executor = new InternalEsqlExecutor(esClient);
    const filter = { bool: { filter: [{ term: { foo: 'bar' } }] } };
    const params = [{ some_param: 'some_value' }];

    const result = await executor.execute({
      query: 'FROM my-index | LIMIT 1',
      dropNullColumns: false,
      filter,
      params,
    });

    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    expect(esClient.esql.query).toHaveBeenCalledWith({
      query: 'FROM my-index | LIMIT 1',
      drop_null_columns: false,
      filter,
      params,
    });

    expect(result).toEqual(mockResponse);
  });

  it('throw an error if the query fails', async () => {
    const error = new Error('boom');
    // @ts-expect-error - not all fields are used
    esClient.esql.query.mockRejectedValue(error);

    const executor = new InternalEsqlExecutor(esClient);
    await expect(
      executor.execute({ query: 'FROM my-index | LIMIT 1', dropNullColumns: false })
    ).rejects.toThrow('boom');
  });
});
