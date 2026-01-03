/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchServiceStart, Logger } from '@kbn/core/server';
import { StorageService } from './services/storage_service';
import { DirectorService } from './director/service';
import { EsqlService } from './services/esql_service';
import { LoggerService } from './services/logger_service';

export interface ServiceDependencies {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
}

type ServiceName = 'storageService' | 'esqlService' | 'directorService' | 'loggerService';

export class ServiceManager {
  private directorService?: DirectorService;
  private storageService?: StorageService;
  private esqlService?: EsqlService;
  private loggerService?: LoggerService;
  private isInitialized = false;

  public initialize(dependencies: ServiceDependencies): void {
    if (this.isInitialized) {
      throw new Error('ServiceManager has already been initialized');
    }

    const { logger, elasticsearch } = dependencies;
    const esClient = elasticsearch.client.asInternalUser;

    this.loggerService = new LoggerService(logger);
    this.storageService = new StorageService(esClient, this.loggerService);
    this.esqlService = new EsqlService(esClient, this.loggerService);
    this.directorService = new DirectorService(
      this.storageService,
      this.esqlService,
      this.loggerService
    );

    this.isInitialized = true;

    this.loggerService.debug({ message: 'ServiceManager: All services initialized successfully' });
  }

  public getStorageService(): StorageService {
    this.throwErrorIfNotInitialized('storageService');

    return this.storageService!;
  }

  public getEsqlService(): EsqlService {
    this.throwErrorIfNotInitialized('esqlService');

    return this.esqlService!;
  }

  public getDirectorService(): DirectorService {
    this.throwErrorIfNotInitialized('directorService');

    return this.directorService!;
  }

  public getLoggerService(): LoggerService {
    this.throwErrorIfNotInitialized('loggerService');

    return this.loggerService!;
  }

  public areServicesInitialized(): boolean {
    return this.isInitialized;
  }

  private throwErrorIfNotInitialized(serviceName: ServiceName): void {
    if (!this.isInitialized || !this[serviceName]) {
      throw new Error(
        'ServiceManager not initialized. Call initialize() before accessing services.'
      );
    }
  }
}
