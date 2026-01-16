/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import { RulesClient } from '../lib/rules_client';
import { ResourceManager } from '../lib/services/resource_service/resource_manager';
import { LoggerService } from '../lib/services/logger_service/logger_service';
import { QueryService } from '../lib/services/query_service/query_service';
import { InternalEsqlExecutor } from '../lib/services/query_service/internal_esql_executor';
import { ScopedEsqlExecutor } from '../lib/services/query_service/scoped_esql_executor';
import { AlertingRetryService } from '../lib/services/retry_service';
import { StorageService } from '../lib/services/storage_service/storage_service';
import {
  StorageServiceInternalToken,
  StorageServiceScopedToken,
} from '../lib/services/storage_service/tokens';
import type { AlertingServerStartDependencies } from '../types';
import { RetryServiceToken } from '../lib/services/retry_service/tokens';
import { EsServiceInternalToken, EsServiceScopedToken } from '../lib/services/es_service/tokens';
import {
  QueryServiceInternalToken,
  QueryServiceScopedToken,
} from '../lib/services/query_service/tokens';
import { DirectorService } from '../lib/director/service';
import { DataServiceScopedToken } from '../lib/services/data_service/tokens';

export function bindServices({ bind }: ContainerModuleLoadOptions) {
  bind(RulesClient).toSelf().inRequestScope();
  bind(AlertingRetryService).toSelf().inSingletonScope();
  bind(RetryServiceToken).toService(AlertingRetryService);

  bind(LoggerService).toSelf().inSingletonScope();
  bind(ResourceManager).toSelf().inSingletonScope();

  bind(EsServiceInternalToken)
    .toDynamicValue(({ get }) => {
      const elasticsearch = get(CoreStart('elasticsearch'));
      return elasticsearch.client.asInternalUser;
    })
    .inSingletonScope();

  bind(EsServiceScopedToken)
    .toDynamicValue(({ get }) => {
      const request = get(Request);
      const elasticsearch = get(CoreStart('elasticsearch'));
      return elasticsearch.client.asScoped(request).asCurrentUser;
    })
    .inRequestScope();

  bind(DataServiceScopedToken)
    .toDynamicValue(({ get }) => {
      const request = get(Request);
      const data = get(PluginStart<AlertingServerStartDependencies['data']>('data'));
      return data.search.asScoped(request);
    })
    .inRequestScope();

  bind(InternalEsqlExecutor).toSelf().inSingletonScope();
  bind(ScopedEsqlExecutor).toSelf().inRequestScope();

  bind(QueryServiceInternalToken)
    .toDynamicValue(({ get }) => {
      const loggerService = get(LoggerService);
      const executor = get(InternalEsqlExecutor);
      return new QueryService(executor, loggerService);
    })
    .inSingletonScope();

  bind(QueryServiceScopedToken)
    .toDynamicValue(({ get }) => {
      const loggerService = get(LoggerService);
      const executor = get(ScopedEsqlExecutor);
      return new QueryService(executor, loggerService);
    })
    .inRequestScope();

  bind(StorageServiceScopedToken)
    .toDynamicValue(({ get }) => {
      const loggerService = get(LoggerService);
      const esClient = get(EsServiceScopedToken);
      return new StorageService(esClient, loggerService);
    })
    .inRequestScope();

  bind(StorageServiceInternalToken)
    .toDynamicValue(({ get }) => {
      const loggerService = get(LoggerService);
      const esClient = get(EsServiceInternalToken);
      return new StorageService(esClient, loggerService);
    })
    .inSingletonScope();

  bind(DirectorService).toSelf().inSingletonScope();
}
