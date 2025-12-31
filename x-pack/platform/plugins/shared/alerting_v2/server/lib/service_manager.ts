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

/**
 * Dependencies required to initialize services
 */
export interface ServiceDependencies {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
}

/**
 * Service manager that initializes and manages all alerting_v2 services.
 * This follows a factory pattern to allow for extensible service initialization.
 */
export class ServiceManager {
  private directorService?: DirectorService;
  private storageService?: StorageService;
  private esqlService?: EsqlService;
  private isInitialized = false;

  /**
   * Initializes all services with their required dependencies.
   * This should be called during the plugin start phase when all dependencies are available.
   *
   * @param dependencies - The dependencies required to initialize services
   */
  public initialize(dependencies: ServiceDependencies): void {
    if (this.isInitialized) {
      throw new Error('ServiceManager has already been initialized');
    }

    const { logger, elasticsearch } = dependencies;
    const esClient = elasticsearch.client.asInternalUser;

    this.storageService = new StorageService(esClient, logger);
    this.esqlService = new EsqlService(esClient, logger);
    this.directorService = new DirectorService(this.storageService, this.esqlService, logger);

    this.isInitialized = true;

    logger.debug('ServiceManager: All services initialized successfully');
  }

  public getStorageService(): StorageService {
    this.throwErrorIfNotInitialized('storageService');

    return this.storageService;
  }

  public getEsqlService(): EsqlService {
    this.throwErrorIfNotInitialized('esqlService');

    return this.esqlService;
  }

  public getDirectorService(): DirectorService {
    this.throwErrorIfNotInitialized('directorService');

    return this.directorService;
  }

  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  private throwErrorIfNotInitialized(
    serviceName: 'storageService' | 'esqlService' | 'directorService'
  ): asserts this is this & { [K in typeof serviceName]: NonNullable<this[K]> } {
    if (!this.isInitialized || !this[serviceName]) {
      throw new Error(
        'ServiceManager not initialized. Call initialize() before accessing services.'
      );
    }
  }
}
