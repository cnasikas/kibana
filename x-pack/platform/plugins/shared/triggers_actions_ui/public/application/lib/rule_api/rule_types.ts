/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import type { AsApiContract, RewriteRequestCase } from '@kbn/actions-plugin/common';
import type { RuleType } from '../../../types';
import { BASE_ALERTING_API_PATH } from '../../constants';

const rewriteResponseRes = (results: Array<AsApiContract<RuleType>>): RuleType[] => {
  return results.map((item) => rewriteBodyReq(item));
};

const rewriteBodyReq: RewriteRequestCase<RuleType> = ({
  enabled_in_license: enabledInLicense,
  recovery_action_group: recoveryActionGroup,
  action_groups: actionGroups,
  default_action_group_id: defaultActionGroupId,
  minimum_license_required: minimumLicenseRequired,
  action_variables: actionVariables,
  authorized_consumers: authorizedConsumers,
  rule_task_timeout: ruleTaskTimeout,
  does_set_recovery_context: doesSetRecoveryContext,
  default_schedule_interval: defaultScheduleInterval,
  has_alerts_mappings: hasAlertsMappings,
  has_fields_for_a_a_d: hasFieldsForAAD,
  ...rest
}: AsApiContract<RuleType>) => ({
  enabledInLicense,
  recoveryActionGroup,
  actionGroups,
  defaultActionGroupId,
  minimumLicenseRequired,
  actionVariables,
  authorizedConsumers,
  ruleTaskTimeout,
  doesSetRecoveryContext,
  defaultScheduleInterval,
  hasAlertsMappings,
  hasFieldsForAAD,
  ...rest,
});

export async function loadRuleTypes({ http }: { http: HttpSetup }): Promise<RuleType[]> {
  const res = await http.get<Array<AsApiContract<RuleType<string, string>>>>(
    `${BASE_ALERTING_API_PATH}/rule_types`
  );
  return rewriteResponseRes(res);
}
