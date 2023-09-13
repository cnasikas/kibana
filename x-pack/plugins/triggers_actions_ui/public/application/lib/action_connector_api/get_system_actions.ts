/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import {
  ActionType,
  AsApiContract,
  INTERNAL_BASE_ACTION_API_PATH,
  RewriteRequestCase,
} from '@kbn/actions-plugin/common';
import { GetSystemActionsResponse } from '@kbn/actions-plugin/common/routes/connector/response/types/latest';
import { ActionConnectorProps } from '../../../types';

type Connector = Omit<
  ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>,
  'secrets' | 'config'
> & { config?: Record<string, unknown> };

export interface GetSystemActionsResponseCamel {
  connectors: Connector[];
  types: ActionType[];
}

const rewriteResponseRes = (res: GetSystemActionsResponse): GetSystemActionsResponseCamel => {
  const connectors = res.connectors.map(transformSystemActionConnector);
  const types = res.types.map(transformSystemActionTypes);

  return { connectors, types };
};

const transformSystemActionConnector: RewriteRequestCase<Connector> = ({
  connector_type_id: actionTypeId,
  is_preconfigured: isPreconfigured,
  is_deprecated: isDeprecated,
  referenced_by_count: referencedByCount,
  is_missing_secrets: isMissingSecrets,
  is_system_action: isSystemAction,
  ...res
}) => ({
  actionTypeId,
  isPreconfigured,
  isDeprecated,
  referencedByCount,
  isMissingSecrets,
  isSystemAction,
  ...res,
});

const transformSystemActionTypes: RewriteRequestCase<ActionType> = ({
  enabled_in_config: enabledInConfig,
  enabled_in_license: enabledInLicense,
  minimum_license_required: minimumLicenseRequired,
  supported_feature_ids: supportedFeatureIds,
  is_system_action_type: isSystemActionType,
  ...res
}: AsApiContract<ActionType>) => ({
  enabledInConfig,
  enabledInLicense,
  minimumLicenseRequired,
  supportedFeatureIds,
  isSystemActionType,
  ...res,
});

export async function getSystemActions({
  http,
}: {
  http: HttpSetup;
}): Promise<GetSystemActionsResponseCamel> {
  const res = await http.get<GetSystemActionsResponse>(
    `${INTERNAL_BASE_ACTION_API_PATH}/system_actions`
  );

  return rewriteResponseRes(res);
}
