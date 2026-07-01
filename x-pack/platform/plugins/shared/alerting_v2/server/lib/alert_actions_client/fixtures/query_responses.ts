/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type { RawAlertEventRow } from '../types';

/**
 * Canonical column order emitted by every alert-event ES|QL projection in
 * this client (see the shared `KEEP …` clauses in
 * `context_loaders/load_latest_alert_events.ts` and
 * `handlers/activate.ts`). Kept in lock-step with `RawAlertEventRow` so a
 * new field on `AlertEventRecord` shows up here as a build failure until
 * it's projected consistently across production and tests.
 */
const ALERT_EVENT_COLUMNS: ReadonlyArray<{ name: string; type: string }> = [
  { name: '@timestamp', type: 'date' },
  { name: 'group_hash', type: 'keyword' },
  { name: 'episode_id', type: 'keyword' },
  { name: 'episode_status', type: 'keyword' },
  { name: 'episode_status_count', type: 'long' },
  { name: 'rule_id', type: 'keyword' },
  { name: 'rule_version', type: 'long' },
  { name: 'space_id', type: 'keyword' },
  { name: 'status', type: 'keyword' },
  { name: 'source', type: 'keyword' },
  { name: 'data_json', type: 'keyword' },
  { name: 'severity', type: 'keyword' },
];

const toAlertEventRow = (record: Partial<RawAlertEventRow>): FieldValue[] => [
  record['@timestamp'] ?? '2025-01-01T00:00:00.000Z',
  record.group_hash ?? 'test-group-hash',
  record.episode_id ?? 'episode-1',
  record.episode_status === undefined ? 'active' : record.episode_status,
  record.episode_status_count === undefined ? null : record.episode_status_count,
  record.rule_id ?? 'test-rule-id',
  record.rule_version ?? 1,
  record.space_id ?? 'default',
  record.status ?? 'breached',
  record.source ?? 'internal',
  record.data_json === undefined ? null : record.data_json,
  record.severity === undefined ? null : record.severity,
];

/**
 * Mocks an ES|QL response for the canonical alert-event projection
 * (`RawAlertEventRow`). One function covers every alert-event loader in
 * the client:
 *
 * - Single-route path (`loadLastAlertEventOrThrow`): pass one record (or
 *   omit the argument to accept defaults).
 * - Batched paths (`loadLatestAlertEvents`, `bulkLoadLatestAlertEvents`,
 *   `findPreDeactivateAlertEvents`): pass an array — one entry per
 *   returned row.
 * - "No matches" case: pass an empty array.
 */
export const getAlertEventESQLResponse = (
  records: ReadonlyArray<Partial<RawAlertEventRow>> = [{}]
): EsqlQueryResponse => ({
  columns: [...ALERT_EVENT_COLUMNS],
  values: records.map(toAlertEventRow),
});

export const getEmptyESQLResponse = (): EsqlQueryResponse => ({
  columns: [],
  values: [],
});

/**
 * Mocks the batched lifecycle ES|QL response (one row per episode). Each
 * record yields `{ episode_id, last_action_type }`, matching the shape
 * the activate handler's `loadContext` consumes (see
 * `handlers/activate.ts`).
 *
 * For the "no lifecycle action for this episode" case the caller can either
 * pass an empty array or simply omit the episode from the records list —
 * absence in the response maps to absence in the returned Map.
 */
export const getLastEpisodeLifecycleActionsESQLResponse = (
  records: ReadonlyArray<{ episode_id?: string; last_action_type?: string }> = []
): EsqlQueryResponse => ({
  columns: [
    { name: 'episode_id', type: 'keyword' },
    { name: 'last_action_type', type: 'keyword' },
  ],
  values: records.map(
    (record) =>
      [record.episode_id ?? 'episode-1', record.last_action_type ?? 'deactivate'] as FieldValue[]
  ),
});
