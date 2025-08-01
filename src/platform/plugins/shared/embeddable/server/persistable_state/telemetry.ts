/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializableRecord } from '@kbn/utility-types';
import { PersistableState } from '@kbn/kibana-utils-plugin/common';
import { EmbeddableStateWithType } from './types';
import { telemetryBaseEmbeddableInput } from './migrate_base_input';

export const getTelemetryFunction = (
  getEmbeddableFactory: (embeddableFactoryId: string) => PersistableState<EmbeddableStateWithType>,
  getEnhancement: (enhancementId: string) => PersistableState
) => {
  return (
    state: EmbeddableStateWithType,
    telemetryData: Record<string, string | number | boolean> = {}
  ) => {
    const enhancements = state.enhancements || {};
    const factory = getEmbeddableFactory(state.type);

    let outputTelemetryData = telemetryBaseEmbeddableInput(state, telemetryData);
    if (factory) {
      outputTelemetryData = factory.telemetry(state, outputTelemetryData);
    }
    Object.keys(enhancements).map((key) => {
      if (!enhancements[key]) return;
      outputTelemetryData = getEnhancement(key).telemetry(
        enhancements[key] as Record<string, SerializableRecord>,
        outputTelemetryData
      );
    });

    return outputTelemetryData;
  };
};
