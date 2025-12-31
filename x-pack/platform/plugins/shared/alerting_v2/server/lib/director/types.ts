/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type AlertState = 'inactive' | 'pending' | 'active' | 'recovering';

export interface TransitionDocument {
  '@timestamp': string;
  alert_series_id: string;
  episode_id: string;
  rule_id: string;
  start_state: AlertState;
  end_state: AlertState;
}
