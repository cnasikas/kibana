/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterRenderFunctionDefinition } from '@kbn/observability-ai-assistant-plugin/public/types';
import { registerGetApmTimeseriesFunction } from './get_apm_timeseries';

export async function registerAssistantFunctions({
  registerRenderFunction,
}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
}) {
  registerGetApmTimeseriesFunction({
    registerRenderFunction,
  });
}
