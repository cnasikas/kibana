/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsConfigApiResponse } from '../../../../../common/types/api_responses';
import { RouteDependencies } from '../../..';

export const registerEsConfigRoute = ({ router, services }: RouteDependencies): void => {
  router.get(
    {
      path: '/api/console/es_config',
      security: {
        authz: {
          enabled: false,
          reason: 'Low effort request for config content',
        },
      },
      validate: false,
    },
    async (ctx, req, res) => {
      const cloudUrl = services.esLegacyConfigService.getCloudUrl();
      if (cloudUrl) {
        const body: EsConfigApiResponse = { host: cloudUrl, allHosts: [cloudUrl] };

        return res.ok({ body });
      }
      const { hosts } = await services.esLegacyConfigService.readConfig();

      const body: EsConfigApiResponse = {
        host: hosts[0],
        allHosts: hosts,
      };

      return res.ok({ body });
    }
  );
};
