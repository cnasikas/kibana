/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { EsqlEsqlResult } from '@elastic/elasticsearch/lib/api/types';
import { DETECT_SIGNAL_CHANGE_QUERY, DETECT_STATE_MATURATION_QUERY } from './queries';
import { ALERT_TRANSITIONS_INDEX } from './constants';
import type { TransitionDocument } from './types';
import type { StorageService } from '../services/storage_service';
import type { EsqlService } from '../services/esql_service';
import type { LoggerService } from '../services/logger_service';

export class DirectorService {
  constructor(
    private readonly storageService: StorageService,
    private readonly esqlService: EsqlService,
    private readonly logger: LoggerService
  ) {}

  async run(): Promise<void> {
    this.logger.debug({ message: 'DirectorService: Starting state transition detection' });

    try {
      const [signalChangeResults, stateMaturationResults] = await Promise.all([
        this.esqlService.executeQuery({
          query: DETECT_SIGNAL_CHANGE_QUERY,
        }),
        this.esqlService.executeQuery({
          query: DETECT_STATE_MATURATION_QUERY,
        }),
      ]);

      this.logger.debug({
        message: `DirectorService: Signal change query returned ${signalChangeResults.values.length} transitions, State maturation query returned ${stateMaturationResults.values.length} transitions`,
      });

      const allTransitions = [
        ...this.parseQueryResponse(signalChangeResults),
        ...this.parseQueryResponse(stateMaturationResults),
      ];

      if (allTransitions.length === 0) {
        this.logger.debug({ message: 'DirectorService: No state transitions detected' });
        return;
      }

      await this.storageService.bulkIndexDocs({
        index: ALERT_TRANSITIONS_INDEX,
        docs: allTransitions,
      });

      this.logger.debug({
        message: `DirectorService: Successfully processed ${allTransitions.length} state transitions`,
      });
    } catch (error) {
      this.logger.error({
        error,
        code: 'DIRECTOR_SERVICE_ERROR',
        type: 'DirectorServiceError',
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
}
