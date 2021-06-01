/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { lazy } from 'react';
import {
  ActionTypeModel,
  ConnectorValidationResult,
  GenericValidationResult,
} from '../../../../types';
import {
  SwimlaneActionConnector,
  SwimlaneConfig,
  SwimlaneSecrets,
  SwimlaneActionParams,
} from './types';
import * as i18n from './translations';
import { isValidUrl } from '../../../lib/value_validators';
import { validateMappingForConnector } from './helpers';

export function getActionType(): ActionTypeModel<
  SwimlaneConfig,
  SwimlaneSecrets,
  SwimlaneActionParams
> {
  return {
    id: '.swimlane',
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.SW_SELECT_MESSAGE_TEXT,
    actionTypeTitle: i18n.SW_ACTION_TYPE_TITLE,
    validateConnector: (
      action: SwimlaneActionConnector
    ): ConnectorValidationResult<SwimlaneConfig, SwimlaneSecrets> => {
      const configErrors = {
        apiUrl: new Array<string>(),
        appId: new Array<string>(),
        connectorType: new Array<string>(),
        mappings: new Array<Record<string, string>>(),
      };
      const secretsErrors = {
        apiToken: new Array<string>(),
      };

      const validationResult = {
        config: { errors: configErrors },
        secrets: { errors: secretsErrors },
      };

      if (!action.config.apiUrl) {
        configErrors.apiUrl = [...configErrors.apiUrl, i18n.SW_API_URL_REQUIRED];
      } else if (action.config.apiUrl) {
        if (!isValidUrl(action.config.apiUrl)) {
          configErrors.apiUrl = [...configErrors.apiUrl, i18n.SW_API_URL_INVALID];
        }
      }

      if (!action.secrets.apiToken) {
        secretsErrors.apiToken = [...secretsErrors.apiToken, i18n.SW_REQUIRED_API_TOKEN_TEXT];
      }

      if (!action.config.appId) {
        configErrors.appId = [...configErrors.appId, i18n.SW_REQUIRED_APP_ID_TEXT];
      }

      const mappingErrors = validateMappingForConnector(
        action.config.connectorType,
        action.config.mappings
      );

      if (!isEmpty(mappingErrors)) {
        configErrors.mappings = [...configErrors.mappings, mappingErrors];
      }

      return validationResult;
    },
    validateParams: (actionParams: SwimlaneActionParams): GenericValidationResult<unknown> => {
      const errors = {
        'subActionParams.incident.alertName': new Array<string>(),
      };
      const validationResult = {
        errors,
      };
      if (
        actionParams.subActionParams &&
        actionParams.subActionParams.incident &&
        !actionParams.subActionParams.incident.alertName?.length
      ) {
        errors['subActionParams.incident.alertName'].push(i18n.SW_REQUIRED_ALERT_NAME);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./swimlane_connectors')),
    actionParamsFields: lazy(() => import('./swimlane_params')),
  };
}
