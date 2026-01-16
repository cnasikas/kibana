/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { inject, injectable } from 'inversify';
import type { QueryService } from '../services/query_service/query_service';
import type { StorageService } from '../services/storage_service/storage_service';
import { LoggerService } from '../services/logger_service/logger_service';
import { getDetectSignalChangeQuery } from './queries';
import { StorageServiceInternalToken } from '../services/storage_service/tokens';
import type { AlertTransition } from '../../resources/alert_transitions';
import { ALERT_TRANSITIONS_DATA_STREAM } from '../../resources/alert_transitions';
import { QueryServiceInternalToken } from '../services/query_service/tokens';
import { DIRECTOR_QUERY_LOOKBACK_WINDOW } from './constants';

interface DirectorRunParams {
  from?: string | null;
}

@injectable()
export class DirectorService {
  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryService,
    @inject(StorageServiceInternalToken) private readonly storageService: StorageService,
    @inject(LoggerService) private readonly logger: LoggerService
  ) {}

  async run({ from }: DirectorRunParams = {}): Promise<void> {
    this.logger.debug({
      message: 'DirectorService: Starting state transition detection',
    });

    const fromDate = from ? new Date(from) : null;
    const query = getDetectSignalChangeQuery(this.getLookbackWindow(fromDate));

    try {
      const queryResponse = await this.queryService.executeQuery({
        query,
      });

      this.logger.debug({
        message: `DirectorService: Query executed successfully, returned ${queryResponse.values.length} rows`,
      });

      const transitions = this.parseQueryResponse(queryResponse);

      if (transitions.length === 0) {
        this.logger.debug({
          message: 'DirectorService: No state transitions detected',
        });
        return;
      }

      await this.storageService.bulkIndexDocs({
        index: ALERT_TRANSITIONS_DATA_STREAM,
        docs: transitions,
      });

      this.logger.debug({
        message: `DirectorService: Successfully processed ${transitions.length} state transitions`,
      });
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error : new Error(String(error)),
        code: 'DIRECTOR_SERVICE_ERROR',
        type: 'DirectorServiceError',
      });

      throw error;
    }
  }

  private parseQueryResponse(response: ESQLSearchResponse): AlertTransition[] {
    const queryResults = this.queryService.queryResponseToRecords<AlertTransition>(response);

    return queryResults.map((result) => ({
      '@timestamp': new Date().toISOString(),
      rule_id: result.rule_id,
      alert_series_id: result.alert_series_id,
      episode_id: this.getEpisodeId({
        startState: result.start_state,
        episodeId: result.episode_id,
      }),
      start_state: result.start_state,
      end_state: result.end_state,
      last_event_timestamp: result.last_event_timestamp,
    }));
  }

  private getEpisodeId({
    startState,
    episodeId,
  }: {
    startState: string;
    episodeId: string | null;
  }): string {
    if (startState === 'inactive' || episodeId == null) {
      return randomUUID();
    }

    return episodeId;
  }

  private getLookbackWindow(from?: Date | null): Date | null {
    if (from) {
      return new Date(from.getTime() - DIRECTOR_QUERY_LOOKBACK_WINDOW);
    }

    return null;
  }
}
