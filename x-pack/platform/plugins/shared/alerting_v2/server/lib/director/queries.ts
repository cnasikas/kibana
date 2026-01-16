/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVENTS_DATA_STREAM } from '../../resources/alert_events';
import { ALERT_TRANSITIONS_DATA_STREAM } from '../../resources/alert_transitions';

/**
 * Filter to recent alert events and all transition history
 */
const getLookbackWindowFilter = (lookbackWindow?: Date | null): string =>
  lookbackWindow
    ? `| WHERE _index != "${ALERT_EVENTS_DATA_STREAM}" OR @timestamp > "${lookbackWindow.toISOString()}"`
    : '';

export const getDetectSignalChangeQuery = (lookbackWindow?: Date | null): string =>
  `
FROM ${ALERT_EVENTS_DATA_STREAM}, ${ALERT_TRANSITIONS_DATA_STREAM}
    METADATA _index
  ${getLookbackWindowFilter(lookbackWindow)}
  | EVAL rule_id = COALESCE(rule.id, rule_id)
  | INLINE STATS
      last_transition_event_timestamp = MAX(last_event_timestamp) WHERE
        _index == "${ALERT_TRANSITIONS_DATA_STREAM}",
      last_breach_timestamp = MAX(@timestamp) WHERE
        _index == "${ALERT_EVENTS_DATA_STREAM}" AND status == "breach",
      last_recover_timestamp = MAX(@timestamp) WHERE
        _index == "${ALERT_EVENTS_DATA_STREAM}" AND status == "recover"
        BY rule_id, alert_series_id
  | STATS
      last_tracked_state = COALESCE(LAST(end_state, @timestamp), "inactive"),
      last_event_timestamp = MAX(@timestamp) WHERE
        _index == "${ALERT_EVENTS_DATA_STREAM}",
      last_transition = MAX(@timestamp) WHERE
        _index == "${ALERT_TRANSITIONS_DATA_STREAM}",
      episode_id = LAST(episode_id, @timestamp),
      last_status = LAST(status, @timestamp),
      breach_count = COUNT(*) WHERE
        status == "breach" AND
          @timestamp >= last_transition_event_timestamp AND
          (@timestamp > last_recover_timestamp OR last_recover_timestamp IS NULL),
      recover_count = COUNT(*) WHERE
        status == "recover" AND
          @timestamp >= last_transition_event_timestamp AND
          (@timestamp > last_breach_timestamp OR last_breach_timestamp IS NULL),
      breach_count_threshold = COALESCE(LAST(rule.breach_count, @timestamp), 0),
      recover_count_threshold = COALESCE(LAST(rule.recover_count, @timestamp), 0)
        BY rule_id, alert_series_id
  | EVAL
      next_state =
        CASE(
          last_tracked_state == "inactive" AND last_status == "breach",
          "pending",
          last_tracked_state == "pending" AND last_status == "recover",
          "inactive",
          last_tracked_state == "active" AND last_status == "recover",
          "recovering",
          last_tracked_state == "recovering" AND last_status == "breach",
          "active",
          last_tracked_state == "pending" AND
            breach_count >= breach_count_threshold,
          "active",
          last_tracked_state == "recovering" AND
            recover_count >= recover_count_threshold,
          "inactive",
          NULL)
  | WHERE next_state IS NOT NULL
  | RENAME next_state AS end_state, last_tracked_state AS start_state
  | DROP last_status, last_transition
  | LIMIT 10000
`.trim();
