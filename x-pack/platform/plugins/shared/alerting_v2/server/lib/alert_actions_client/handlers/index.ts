/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EPISODE_ACTION_TYPE,
  type AlertEpisodeActionType,
  type CreateAlertActionBody,
} from '@kbn/alerting-v2-schemas';
import type {
  ActionHandler,
  HandlerItem,
  HandlerPrepareContext,
  HandlerServices,
  PreparedAction,
} from '../handler';
import { activateHandler } from './activate';
import { deactivateHandler } from './deactivate';

/**
 * Exhaustive map from `action_type` to its handler. The mapped type
 * forces a TS compile error any time a new `AlertEpisodeActionType`
 * value is introduced without a matching handler — that's the entire
 * point of the registry approach.
 */
export type ActionHandlersRegistry = {
  [T in AlertEpisodeActionType]: ActionHandler<
    Extract<CreateAlertActionBody, { action_type: T }>,
    unknown
  >;
};

/**
 * The audit-only handler: returns the orchestrator-built audit doc
 * verbatim, has no preload, applies no preconditions. Most non-lifecycle
 * action types (ack/unack/assign/tag/snooze/unsnooze) are
 * behaviourally identical to one another, so the registry points every
 * one of those slots at this single shared singleton instead of paying
 * for a per-action file.
 *
 */
const auditOnlyHandler: ActionHandler<CreateAlertActionBody, unknown> = {
  prepare: (_item, { alertActionDoc }) => ({ alertActionDoc }),
};

/**
 * Canonical handler registry. Kept **module-private** so no consumer
 * can hold a live reference to (and therefore accidentally mutate) the
 * shared map. Access it via {@link getActionHandlers} instead.
 *
 * Typed as the **exhaustive** {@link ActionHandlersRegistry}: adding a
 * new `AlertEpisodeActionType` value without a matching slot is a TS
 * compile error at this declaration.
 */
const ACTION_HANDLERS: Readonly<ActionHandlersRegistry> = {
  [ALERT_EPISODE_ACTION_TYPE.ACK]: auditOnlyHandler,
  [ALERT_EPISODE_ACTION_TYPE.UNACK]: auditOnlyHandler,
  [ALERT_EPISODE_ACTION_TYPE.ASSIGN]: auditOnlyHandler,
  [ALERT_EPISODE_ACTION_TYPE.TAG]: auditOnlyHandler,
  [ALERT_EPISODE_ACTION_TYPE.SNOOZE]: auditOnlyHandler,
  [ALERT_EPISODE_ACTION_TYPE.UNSNOOZE]: auditOnlyHandler,
  [ALERT_EPISODE_ACTION_TYPE.DEACTIVATE]: deactivateHandler,
  [ALERT_EPISODE_ACTION_TYPE.ACTIVATE]: activateHandler,
};

export const getActionHandlers = (): Readonly<ActionHandlersRegistry> => ACTION_HANDLERS;

/**
 * Calls the handler that `handlers` registers for
 * `item.action.action_type`. The cast on the lookup is sound because
 * the registry is a mapped type keyed by that exact discriminant —
 * `handlers[t]` IS the handler for actions of type `t`. TS just can't
 * follow the correlation across the indexed access, so we assert it
 * here in one place.
 */
export const prepareWithHandler = (
  item: HandlerItem<CreateAlertActionBody>,
  ctx: HandlerPrepareContext<unknown>,
  handlers: Readonly<ActionHandlersRegistry>
): PreparedAction => {
  const handler = handlers[item.action.action_type] as ActionHandler<
    CreateAlertActionBody,
    unknown
  >;
  return handler.prepare(item, ctx);
};

/**
 * Runs every handler's `loadContext` (those that define one) in
 * parallel, one call per `action_type` present in `itemsByType`.
 * Returns a sparse map of `action_type` -> opaque context, consumed
 * only via {@link prepareWithHandler}.
 *
 */
export const loadContextPerHandler = async (
  itemsByType: Partial<Record<AlertEpisodeActionType, Array<HandlerItem<CreateAlertActionBody>>>>,
  services: HandlerServices,
  handlers: Readonly<ActionHandlersRegistry>
): Promise<Partial<Record<AlertEpisodeActionType, unknown>>> => {
  const entries = Object.entries(itemsByType) as Array<
    [AlertEpisodeActionType, Array<HandlerItem<CreateAlertActionBody>>]
  >;

  const loaded = await Promise.all(
    entries.map(async ([type, items]) => {
      const handler = handlers[type] as ActionHandler<CreateAlertActionBody, unknown>;
      return [type, await handler.loadContext?.(items, services)] as const;
    })
  );

  return Object.fromEntries(loaded);
};
