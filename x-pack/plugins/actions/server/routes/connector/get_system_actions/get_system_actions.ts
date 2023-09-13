/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { GetSystemActionsResponseV1 } from '../../../../common/routes/connector/response';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../../common';
import { ILicenseState } from '../../../lib';
import { ActionsRequestHandlerContext } from '../../../types';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { transformGetSystemActionsResponse } from './transforms/transform_connectors_response/v1';

export const getSystemActionsRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/system_actions`,
      validate: {},
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        const connectors = await actionsClient.getAllSystemActions();
        const types = await actionsClient.listSystemActionTypes();

        const responseBody: GetSystemActionsResponseV1 = transformGetSystemActionsResponse({
          connectors,
          types,
        });

        return res.ok({ body: responseBody });
      })
    )
  );
};
