/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorType, FindConnectorResult } from '../../../../../application/connector/types';
import { GetSystemActionsResponseV1 } from '../../../../../../common/routes/connector/response';
import { transformGetAllConnectorsResponse } from '../../../get_all/transforms/transform_connectors_response/v1';
import { transformListTypesResponse } from '../../../list_types/transforms/transform_list_types_response/v1';

export const transformGetSystemActionsResponse = ({
  connectors,
  types,
}: {
  connectors: FindConnectorResult[];
  types: ConnectorType[];
}): GetSystemActionsResponseV1 => {
  const connectorsTransformed = transformGetAllConnectorsResponse(connectors);
  const typesTransformed = transformListTypesResponse(types);

  return { connectors: connectorsTransformed, types: typesTransformed };
};
