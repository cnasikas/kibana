/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackagePolicy, CreatePackagePolicyResponse, API_VERSIONS } from '@kbn/fleet-plugin/common';
import { KbnClient } from '@kbn/test';
import {
  GetEnrollmentAPIKeysResponse,
  CreateAgentPolicyResponse,
} from '@kbn/fleet-plugin/common/types';
import { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';

export const DEFAULT_HEADERS = Object.freeze({
  'x-elastic-internal-product': 'security-solution',
});

export const getInstalledIntegration = async (kbnClient: KbnClient, integrationName: string) => {
  const {
    data: { item },
  } = await kbnClient.request<{ item: PackagePolicy }>({
    method: 'GET',
    path: `/api/fleet/epm/packages/${integrationName}`,
    headers: {
      ...DEFAULT_HEADERS,
      'elastic-api-version': API_VERSIONS.public.v1,
    },
  });

  return item;
};

export const createAgentPolicy = async (
  kbnClient: KbnClient,
  log: ToolingLog,
  agentPolicyName = 'Osquery policy',
  integrationName: string = 'osquery_manager'
) => {
  log.info(chalk.bold(`Creating "${agentPolicyName}" agent policy`));
  const {
    data: {
      item: { id: agentPolicyId },
    },
  } = await kbnClient.request<CreateAgentPolicyResponse>({
    method: 'POST',
    path: `/api/fleet/agent_policies?sys_monitoring=true`,
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
    body: {
      name: agentPolicyName,
      description: '',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
      inactivity_timeout: 1209600,
    },
  });
  log.indent(4, () => log.info(`Created "${agentPolicyName}" agent policy`));

  log.info(
    chalk.bold(
      `Adding "${integrationName}" integration to agent policy "${agentPolicyName}" with id ${agentPolicyId}`
    )
  );

  await addIntegrationToAgentPolicy(kbnClient, agentPolicyId, agentPolicyName, integrationName);
  log.indent(4, () =>
    log.info(
      `Added "${integrationName}" integration to agent policy "${agentPolicyName}" with id ${agentPolicyId}`
    )
  );

  log.info(
    chalk.bold(
      `Getting agent enrollment key for agent policy "${agentPolicyName}" with id ${agentPolicyId}`
    )
  );
  const { data: apiKeys } = await kbnClient.request<GetEnrollmentAPIKeysResponse>({
    method: 'GET',
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
    path: '/api/fleet/enrollment_api_keys',
  });
  log.indent(4, () =>
    log.info(
      `Got agent enrollment key for agent policy "${agentPolicyName}" with id ${agentPolicyId}`
    )
  );
  return apiKeys.items[0].api_key;
};

export const addIntegrationToAgentPolicy = async (
  kbnClient: KbnClient,
  agentPolicyId: string,
  agentPolicyName: string,
  integrationName: string = 'osquery_manager'
) => {
  const { version: integrationVersion } = await getInstalledIntegration(kbnClient, integrationName);

  return kbnClient.request<CreatePackagePolicyResponse>({
    method: 'POST',
    path: '/api/fleet/package_policies',
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
    body: {
      policy_id: agentPolicyId,
      package: {
        name: integrationName,
        version: integrationVersion,
      },
      name: `Policy for ${agentPolicyName}`,
      description: '',
      namespace: 'default',
      inputs: {
        'osquery_manager-osquery': {
          enabled: true,
          streams: {},
        },
      },
    },
  });
};

/**
 * Check if the given version string is a valid artifact version
 * @param version Version string
 */
// const isValidArtifactVersion = (version: string) => !!version.match(/^\d+\.\d+\.\d+(-SNAPSHOT)?$/);

/**
 * Returns the Agent version that is available for install (will check `artifacts-api.elastic.co/v1/versions`)
 * that is equal to or less than `maxVersion`.
 * @param kbnClient
 * @param log
 */
//
// export const getLatestAvailableAgentVersion = async (
//   kbnClient: KbnClient,
//   log: ToolingLog
// ): Promise<string> => {
//   let currentVersion: string;
//
//   try {
//     const kbnStatus = await kbnClient.status.get();
//     currentVersion = kbnStatus.version.number;
//   } catch {
//     log.warning(chalk.bold('Failed to get Kibana version, using package.json version'));
//     currentVersion = kibanaPackageJson.version;
//   }
//
//   const agentVersions = await pRetry(
//     async () => {
//       const response = await axios.get('https://artifacts-api.elastic.co/v1/versions');
//       return map(
//         response.data.versions.filter(isValidArtifactVersion),
//         (version) => version.split('-SNAPSHOT')[0]
//       );
//     },
//     {
//       retries: 6,
//     }
//   ).catch(() => null);
//
//   if (!agentVersions) {
//     log.warning(
//       chalk.bold('Failed to get agent versions from artifacts-api, using package.json version')
//     );
//   }
//
//   const version = agentVersions
//     ? semver.maxSatisfying(agentVersions, `<=${currentVersion}`)
//     : currentVersion;
//
//   return `${version}-SNAPSHOT`;
// };

export const getLatestAvailableAgentVersion = async (
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<string> => {
  return `9.1.0-SNAPSHOT`;
};

export const generateRandomString = (length: number) => {
  return [...Array(length)].map(() => Math.random().toString(36)[2]).join('');
};
