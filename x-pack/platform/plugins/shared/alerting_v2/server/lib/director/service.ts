/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Logger } from '@kbn/core/server';
import type { EcsError } from '@elastic/ecs';
import type { EsqlEsqlResult } from '@elastic/elasticsearch/lib/api/types';
import { DETECT_SIGNAL_CHANGE_QUERY, DETECT_STATE_MATURATION_QUERY } from './queries';
import { ALERT_TRANSITIONS_INDEX } from './constants';
import type { TransitionDocument } from './types';
import type { StorageService } from '../services/storage_service';
import type { EsqlService } from '../services/esql_service';

export class DirectorService {
  constructor(
    private readonly storageService: StorageService,
    private readonly esqlService: EsqlService,
    private readonly logger: Logger
  ) {}

  async run(): Promise<void> {
    this.logger.debug('DirectorService: Starting state transition detection');

    try {
      const [signalChangeResults, stateMaturationResults] = await Promise.all([
        this.esqlService.executeQuery({
          query: DETECT_SIGNAL_CHANGE_QUERY,
        }),
        this.esqlService.executeQuery({
          query: DETECT_STATE_MATURATION_QUERY,
        }),
      ]);

      this.logger.debug(
        `DirectorService: Signal change query returned ${signalChangeResults.values.length} transitions, ` +
          `State maturation query returned ${stateMaturationResults.values.length} transitions`
      );

      const allTransitions = [
        ...this.parseQueryResponse(signalChangeResults),
        ...this.parseQueryResponse(stateMaturationResults),
      ];

      if (allTransitions.length === 0) {
        this.logger.debug('DirectorService: No state transitions detected');
        return;
      }

      await this.storageService.bulkIndexDocs({
        index: ALERT_TRANSITIONS_INDEX,
        docs: allTransitions,
      });

      this.logger.debug(
        `DirectorService: Successfully processed ${allTransitions.length} state transitions`
      );
    } catch (error) {
      this.logger.error(`DirectorService: Error processing state transitions - ${error.message}`, {
        error: this.buildError(error),
      });

      throw error;
    }
  }

  private parseQueryResponse(response: EsqlEsqlResult): TransitionDocument[] {
    const transitions = this.esqlService.queryResponseToObject<TransitionDocument>(response);

    return transitions.map((transition) => ({
      ...transition,
      episode_id: this.getEpisodeId({
        startState: transition.start_state,
        episodeId: transition.episode_id,
      }),
    }));
  }

  private getEpisodeId({
    startState,
    episodeId,
  }: {
    startState?: string | null;
    episodeId?: string | null;
  }): string {
    if (startState === 'inactive' || episodeId == null) {
      return randomUUID();
    }

    return episodeId;
  }

  private buildError(error: Error): EcsError {
    return {
      code: 'DIRECTOR_SERVICE_ERROR',
      message: error.message,
      stack_trace: error.stack,
      type: 'DirectorServiceError',
    };
  }
}
