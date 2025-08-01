/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as apiIntegrationServices } from '@kbn/test-suites-xpack/api_integration/services';
import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { SecuritySolutionApiProvider } from '@kbn/test-suites-xpack/api_integration/services/security_solution_api.gen';
import { SecuritySolutionApiProvider as SecuritySolutionExceptionsApiProvider } from '@kbn/test-suites-xpack/api_integration/services/security_solution_exceptions_api.gen';
import { services as platformApiIntegrationServices } from '@kbn/test-suites-xpack-platform/api_integration/services';
import { AlertingApiProvider } from './alerting_api';
import { UsageAPIProvider } from './usage_api';

// pick only services that work for any FTR config, e.g. 'samlAuth' requires SAML setup in config file
const {
  es,
  esArchiver,
  kibanaServer,
  retry,
  deployment,
  randomness,
  esDeleteAllIndices,
  indexPatterns,
  console,
  esSupertest,
  security,
} = commonFunctionalServices;

export const services = {
  // deployment agnostic FTR services
  deployment,
  es,
  esArchiver,
  esDeleteAllIndices,
  esSupertest,
  indexPatterns,
  ingestPipelines: platformApiIntegrationServices.ingestPipelines,
  indexManagement: platformApiIntegrationServices.indexManagement,
  kibanaServer,
  ml: apiIntegrationServices.ml,
  randomness,
  retry,
  security,
  usageAPI: UsageAPIProvider,
  console,
  securitySolutionApi: SecuritySolutionApiProvider,
  alertingApi: AlertingApiProvider,
  securitySolutionExceptionsApi: SecuritySolutionExceptionsApiProvider,
};
