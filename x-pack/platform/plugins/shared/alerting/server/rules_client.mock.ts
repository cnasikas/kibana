/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertingAuthorizationMock } from './authorization/alerting_authorization.mock';
import type { RulesClientApi } from './types';

type Schema = RulesClientApi;
export type RulesClientMock = jest.Mocked<Schema>;

const createRulesClientMock = () => {
  const alertingAuthorization = alertingAuthorizationMock.create();

  const mocked: RulesClientMock = {
    aggregate: jest.fn().mockReturnValue({ ruleExecutionStatus: {}, ruleLastRunOutcome: {} }),
    getTags: jest.fn(),
    create: jest.fn(),
    get: jest.fn(),
    resolve: jest.fn(),
    getAlertState: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    disableRule: jest.fn(),
    enableRule: jest.fn(),
    updateRuleApiKey: jest.fn(),
    muteAll: jest.fn(),
    unmuteAll: jest.fn(),
    muteInstance: jest.fn(),
    unmuteInstance: jest.fn(),
    listRuleTypes: jest.fn(),
    getAlertSummary: jest.fn(),
    getAuditLogger: jest.fn(),
    getAuthorization: jest.fn().mockReturnValue(alertingAuthorization),
    getExecutionLogForRule: jest.fn(),
    getRuleExecutionKPI: jest.fn(),
    getGlobalExecutionKpiWithAuth: jest.fn(),
    getGlobalExecutionSummaryWithAuth: jest.fn(),
    getGlobalExecutionLogWithAuth: jest.fn(),
    getActionErrorLog: jest.fn(),
    getActionErrorLogWithAuth: jest.fn(),
    scheduleBackfill: jest.fn(),
    getBackfill: jest.fn(),
    findBackfill: jest.fn(),
    deleteBackfill: jest.fn(),
    getSpaceId: jest.fn(),
    bulkGetRules: jest.fn(),
    bulkEdit: jest.fn(),
    bulkDeleteRules: jest.fn(),
    bulkEnableRules: jest.fn(),
    bulkDisableRules: jest.fn(),
    snooze: jest.fn(),
    unsnooze: jest.fn(),
    runSoon: jest.fn(),
    clone: jest.fn(),
    getScheduleFrequency: jest.fn(),
    bulkUntrackAlerts: jest.fn(),
    findGaps: jest.fn(),
    fillGapById: jest.fn(),
    getRuleIdsWithGaps: jest.fn(),
    getGapsSummaryByRuleIds: jest.fn(),
  };
  return mocked;
};

export const rulesClientMock: {
  create: () => RulesClientMock;
} = {
  create: createRulesClientMock,
};
