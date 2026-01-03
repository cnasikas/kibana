/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchServiceStart, Logger, ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { ServiceManager } from './service_manager';
import { StorageService } from './services/storage_service';
import { EsqlService } from './services/esql_service';
import { DirectorService } from './director/service';
import { LoggerService } from './services/logger_service';

describe('ServiceManager', () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockElasticsearch: ElasticsearchServiceStart;
  let serviceManager: ServiceManager;

  beforeEach(() => {
    mockLogger = loggerMock.create();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();

    mockEsClient.esql.query = jest.fn().mockResolvedValue({
      columns: [],
      values: [],
    });

    mockEsClient.bulk = jest.fn().mockResolvedValue({
      items: [],
      errors: false,
    });

    mockElasticsearch = elasticsearchServiceMock.createStart();
    serviceManager = new ServiceManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize all services successfully', () => {
      serviceManager.initialize({
        logger: mockLogger,
        elasticsearch: mockElasticsearch,
      });

      expect(serviceManager.areServicesInitialized()).toBe(true);
    });

    it('should throw error when initialized twice', () => {
      serviceManager.initialize({
        logger: mockLogger,
        elasticsearch: mockElasticsearch,
      });

      expect(() => {
        serviceManager.initialize({
          logger: mockLogger,
          elasticsearch: mockElasticsearch,
        });
      }).toThrow('ServiceManager has already been initialized');
    });
  });

  describe('getStorageService', () => {
    it('should return StorageService instance after initialization', () => {
      serviceManager.initialize({
        logger: mockLogger,
        elasticsearch: mockElasticsearch,
      });

      const storageService = serviceManager.getStorageService();
      expect(storageService).toBeInstanceOf(StorageService);
    });

    it('should throw error when accessed before initialization', () => {
      expect(() => {
        serviceManager.getStorageService();
      }).toThrow('ServiceManager not initialized. Call initialize() before accessing services.');
    });

    it('should return the same instance on multiple calls', () => {
      serviceManager.initialize({
        logger: mockLogger,
        elasticsearch: mockElasticsearch,
      });

      const service1 = serviceManager.getStorageService();
      const service2 = serviceManager.getStorageService();

      expect(service1).toBe(service2);
    });
  });

  describe('getEsqlService', () => {
    it('should return EsqlService instance after initialization', () => {
      serviceManager.initialize({
        logger: mockLogger,
        elasticsearch: mockElasticsearch,
      });

      const esqlService = serviceManager.getEsqlService();
      expect(esqlService).toBeInstanceOf(EsqlService);
    });

    it('should throw error when accessed before initialization', () => {
      expect(() => {
        serviceManager.getEsqlService();
      }).toThrow('ServiceManager not initialized. Call initialize() before accessing services.');
    });

    it('should return the same instance on multiple calls', () => {
      serviceManager.initialize({
        logger: mockLogger,
        elasticsearch: mockElasticsearch,
      });

      const service1 = serviceManager.getEsqlService();
      const service2 = serviceManager.getEsqlService();

      expect(service1).toBe(service2);
    });
  });

  describe('getDirectorService', () => {
    it('should return DirectorService instance after initialization', () => {
      serviceManager.initialize({
        logger: mockLogger,
        elasticsearch: mockElasticsearch,
      });

      const directorService = serviceManager.getDirectorService();
      expect(directorService).toBeInstanceOf(DirectorService);
    });

    it('should throw error when accessed before initialization', () => {
      expect(() => {
        serviceManager.getDirectorService();
      }).toThrow('ServiceManager not initialized. Call initialize() before accessing services.');
    });

    it('should return the same instance on multiple calls', () => {
      serviceManager.initialize({
        logger: mockLogger,
        elasticsearch: mockElasticsearch,
      });

      const service1 = serviceManager.getDirectorService();
      const service2 = serviceManager.getDirectorService();

      expect(service1).toBe(service2);
    });
  });

  describe('LoggerService', () => {
    it('should return LoggerService instance after initialization', () => {
      serviceManager.initialize({
        logger: mockLogger,
        elasticsearch: mockElasticsearch,
      });

      const loggerService = serviceManager.getLoggerService();
      expect(loggerService).toBeInstanceOf(LoggerService);
    });

    it('should throw error when accessed before initialization', () => {
      expect(() => {
        serviceManager.getLoggerService();
      }).toThrow('ServiceManager not initialized. Call initialize() before accessing services.');
    });

    it('should return the same instance on multiple calls', () => {
      serviceManager.initialize({
        logger: mockLogger,
        elasticsearch: mockElasticsearch,
      });

      const service1 = serviceManager.getLoggerService();
      const service2 = serviceManager.getLoggerService();

      expect(service1).toBe(service2);
    });
  });

  describe('areServicesInitialized', () => {
    it('should return false before initialization', () => {
      expect(serviceManager.areServicesInitialized()).toBe(false);
    });

    it('should return true after initialization', () => {
      serviceManager.initialize({
        logger: mockLogger,
        elasticsearch: mockElasticsearch,
      });

      expect(serviceManager.areServicesInitialized()).toBe(true);
    });
  });
});
