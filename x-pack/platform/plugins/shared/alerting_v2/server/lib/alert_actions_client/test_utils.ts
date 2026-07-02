/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import type { AlertAction } from '../../resources/datastreams/alert_actions';
import { alertEpisodeStatus, alertEventStatus } from '../../resources/datastreams/alert_events';
import type { HandlerItem, HandlerPrepareContext } from './handler';
import type { AlertEventRecord } from './types';

/**
 * Builds a `HandlerPrepareContext` — the per-item struct the orchestrator
 * hands each handler's `prepare` method. The sentinel `alertActionDoc`
 * is inconsequential to handler logic (tests either forward the doc
 * unchanged or assert on identity, never on content).
 */
export const buildHandlerPrepareContext = (
  overrides: Partial<HandlerPrepareContext> = {}
): HandlerPrepareContext => ({
  alertActionDoc: { sentinel: 'audit-doc' } as unknown as AlertAction,
  ...overrides,
});

/**
 * Builds a `HandlerItem<TBody>` — the `{ action, alertEvent }` input the
 * orchestrator resolves for each request row. Callers own the `action`
 * body because each handler test targets a specific `action_type`
 * variant of the discriminated union.
 */
export const buildHandlerItem = <TBody extends CreateAlertActionBody>(
  action: TBody,
  alertEvent: AlertEventRecord
): HandlerItem<TBody> => ({ action, alertEvent });

/**
 * Builds an in-memory `AlertEventRecord` — the flattened, post-projection
 * shape returned by the alert-event loaders (`rule_id` / `rule_version` /
 * `data_json` at the top level; not the persisted `AlertEvent` wire
 * schema with nested `rule.{id,version}` and `data`).
 *
 * Defaults describe a healthy `active` / `breached` episode with a
 * distinctive non-`'internal'` `source`, which lets tests assert that
 * consumers propagate the source rather than hardcode it. Callers
 * override only the fields their scenario cares about.
 *
 * Kept in this folder — not in `server/lib/test_utils.ts` — because
 * `AlertEventRecord` is an implementation detail of the alert-actions
 * client. `server/lib/test_utils.ts` builds the persisted `AlertEvent`
 * (wire) instead, which is a distinct type.
 */
export const buildAlertEventRecord = (
  overrides: Partial<AlertEventRecord> = {}
): AlertEventRecord => ({
  '@timestamp': '2026-06-28T18:55:00.000Z',
  group_hash: 'group-1',
  episode_id: 'episode-1',
  rule_id: 'rule-1',
  rule_version: 2,
  space_id: 'default',
  source: 'test-source',
  data_json: { hostname: 'h1' },
  severity: 'high',
  episode_status: alertEpisodeStatus.active,
  status: alertEventStatus.breached,
  ...overrides,
});
