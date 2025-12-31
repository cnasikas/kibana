/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVENTS_INDEX, ALERT_TRANSITIONS_INDEX } from './constants';

/**
 * ES|QL query to detect event status changes.
 * Detects transitions like: Inactive -> Breach, Active -> Recover, etc.
 */
export const DETECT_SIGNAL_CHANGE_QUERY = `
FROM ${ALERT_EVENTS_INDEX}
| STATS
    last_status = LAST(status, @timestamp),
    last_event_timestamp = MAX(@timestamp)
    BY rule_id, alert_series_id
| RENAME alert_series_id AS event_alert_series_id
| LOOKUP JOIN ${ALERT_TRANSITIONS_INDEX}
    ON rule_id == rule_id AND event_alert_series_id == alert_series_id
| STATS
    last_tracked_state = COALESCE(LAST(end_state, @timestamp), "inactive"),
    last_episode_id = LAST(episode_id, @timestamp)
    BY rule_id, event_alert_series_id, last_status, last_event_timestamp
| EVAL
    candidate_state =
    CASE(
        last_tracked_state == "inactive" AND last_status == "breach", "pending",
        last_tracked_state == "pending" AND last_status == "recover", "inactive",
        last_tracked_state == "active" AND last_status == "recover", "recovering",
        last_tracked_state == "recovering" AND last_status == "breach", "active",
        NULL
    )
| WHERE candidate_state IS NOT NULL
| KEEP rule_id, event_alert_series_id, last_episode_id, last_tracked_state, candidate_state, last_event_timestamp
| RENAME last_event_timestamp AS @timestamp, event_alert_series_id AS alert_series_id, last_episode_id AS episode_id, last_tracked_state AS start_state, candidate_state AS end_state
`.trim();

/**
 * ES|QL query to detect state maturation.
 * Detects when waiting states (Pending or Recovering) have persisted long enough
 * or received enough confirmation to advance (e.g., Pending -> Active, Recovering -> Inactive).
 */
export const DETECT_STATE_MATURATION_QUERY = `
FROM ${ALERT_TRANSITIONS_INDEX}
| STATS
    last_tracked_state = LAST(end_state, @timestamp),
    last_transition = MAX(@timestamp)
    BY rule_id, alert_series_id, episode_id
| WHERE last_tracked_state == "pending" OR last_tracked_state == "recovering"
| RENAME alert_series_id AS transition_alert_series_id
| LOOKUP JOIN ${ALERT_EVENTS_INDEX}
    ON rule_id == rule_id AND alert_series_id == transition_alert_series_id
| WHERE @timestamp >= last_transition
| STATS 
    breached_event_count = COUNT(*) WHERE status == "breach", 
    recover_event_count = COUNT(*) WHERE status == "recover", 
    last_event_timestamp = MAX(@timestamp)
    BY rule_id, alert_series_id, last_tracked_state, episode_id
| WHERE (breached_event_count > 0 AND last_tracked_state == "pending") OR (recover_event_count > 0 AND last_tracked_state == "recovering")
| DROP breached_event_count, recover_event_count
| EVAL
    candidate_state =
    CASE(
        last_tracked_state == "pending", "active",
        last_tracked_state == "recovering", "inactive", 
        NULL
    )
| WHERE candidate_state IS NOT NULL
| RENAME last_event_timestamp AS @timestamp, candidate_state AS end_state, last_tracked_state AS start_state
| KEEP @timestamp, rule_id, alert_series_id, episode_id, start_state, end_state
`.trim();
