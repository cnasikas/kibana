/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';

export interface IEsqlExecutorParams {
  query: ESQLSearchParams['query'];
  filter?: ESQLSearchParams['filter'];
  params?: ESQLSearchParams['params'];
}

export interface IEsqlExecutor {
  execute(params: IEsqlExecutorParams): Promise<ESQLSearchResponse>;
}
