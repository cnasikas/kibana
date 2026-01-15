/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { QueryService } from './query_service';

export const QueryServiceInternalToken = Symbol.for(
  'alerting_v2.QueryServiceInternal'
) as ServiceIdentifier<QueryService>;

export const QueryServiceScopedToken = Symbol.for(
  'alerting_v2.QueryServiceScoped'
) as ServiceIdentifier<QueryService>;
