/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsClientError, GetViewInAppRelativeUrlFnOpts } from '@kbn/alerting-plugin/server';
import moment from 'moment';
import {
  KibanaRequest,
  SavedObjectsClientContract,
  DEFAULT_APP_CATEGORIES,
} from '@kbn/core/server';
import {
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import type { MlAnomaliesTableRecord } from '@kbn/ml-anomaly-utils';
import { getSeverityType } from '@kbn/ml-anomaly-utils';
import { uptimeDurationAnomalyRuleParamsSchema } from '@kbn/response-ops-rule-params/uptime_duration_anomaly';
import {
  alertsLocatorID,
  AlertsLocatorParams,
  getAlertUrl,
  observabilityFeatureId,
  observabilityPaths,
} from '@kbn/observability-plugin/common';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { asyncForEach } from '@kbn/std';
import { UptimeEsClient } from '../lib';
import {
  updateState,
  generateAlertMessage,
  getViewInAppUrl,
  setRecoveredAlertsContext,
  UptimeRuleTypeAlertDefinition,
} from './common';
import { CLIENT_ALERT_TYPES, DURATION_ANOMALY } from '../../../../common/constants/uptime_alerts';
import { commonStateTranslations, durationAnomalyTranslations } from './translations';
import { UptimeCorePluginsSetup } from '../adapters/framework';
import { UptimeAlertTypeFactory } from './types';
import { Ping } from '../../../../common/runtime_types/ping';
import { getMLJobId } from '../../../../common/lib';

import { DurationAnomalyTranslations as CommonDurationAnomalyTranslations } from '../../../../common/rules/legacy_uptime/translations';
import { getMonitorRouteFromMonitorId } from '../../../../common/utils/get_monitor_url';

import {
  ALERT_REASON_MSG,
  ACTION_VARIABLES,
  VIEW_IN_APP_URL,
  ALERT_DETAILS_URL,
} from './action_variables';

export type ActionGroupIds = ActionGroupIdsOf<typeof DURATION_ANOMALY>;

export const getAnomalySummary = (anomaly: MlAnomaliesTableRecord, monitorInfo: Ping) => {
  return {
    severity: getSeverityType(anomaly.severity),
    severityScore: Math.round(anomaly.severity),
    anomalyStartTimestamp: moment(anomaly.source.timestamp).toISOString(),
    monitor: anomaly.source['monitor.id'],
    monitorUrl: monitorInfo.url?.full,
    slowestAnomalyResponse: Math.round(anomaly.actualSort / 1000) + ' ms',
    expectedResponseTime: Math.round(anomaly.typicalSort / 1000) + ' ms',
    observerLocation: anomaly.entityValue,
    bucketSpan: anomaly.source.bucket_span,
  };
};

const getAnomalies = async (
  plugins: UptimeCorePluginsSetup,
  savedObjectsClient: SavedObjectsClientContract,
  params: Record<any, any>,
  lastCheckedAt: string
) => {
  const fakeRequest = {} as KibanaRequest;
  const { getAnomaliesTableData } = plugins.ml.resultsServiceProvider(
    fakeRequest,
    savedObjectsClient
  );

  return await getAnomaliesTableData(
    [getMLJobId(params.monitorId)],
    [],
    [],
    'auto',
    params.severity,
    // Lookback window will be 2x Bucket time span, for uptime job, for now bucket
    // timespan will always be 15minute
    moment(lastCheckedAt).subtract(30, 'minute').valueOf(),
    moment().valueOf(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    500,
    10,
    undefined
  );
};

export const durationAnomalyAlertFactory: UptimeAlertTypeFactory<ActionGroupIds> = (
  server,
  libs,
  plugins
) => ({
  id: CLIENT_ALERT_TYPES.DURATION_ANOMALY,
  category: DEFAULT_APP_CATEGORIES.observability.id,
  producer: 'uptime',
  solution: observabilityFeatureId,
  name: durationAnomalyTranslations.alertFactoryName,
  validate: {
    params: uptimeDurationAnomalyRuleParamsSchema,
  },
  defaultActionGroupId: DURATION_ANOMALY.id,
  actionGroups: [
    {
      id: DURATION_ANOMALY.id,
      name: DURATION_ANOMALY.name,
    },
  ],
  actionVariables: {
    context: [
      ACTION_VARIABLES[ALERT_DETAILS_URL],
      ACTION_VARIABLES[ALERT_REASON_MSG],
      ACTION_VARIABLES[VIEW_IN_APP_URL],
      ...durationAnomalyTranslations.actionVariables,
      ...commonStateTranslations,
    ],
    state: [...durationAnomalyTranslations.actionVariables, ...commonStateTranslations],
  },
  isExportable: true,
  minimumLicenseRequired: 'platinum',
  doesSetRecoveryContext: true,
  async executor({
    params,
    services: { alertsClient, savedObjectsClient, scopedClusterClient },
    spaceId,
    state,
    startedAt,
  }) {
    if (!alertsClient) {
      throw new AlertsClientError();
    }
    const uptimeEsClient = new UptimeEsClient(
      savedObjectsClient,
      scopedClusterClient.asCurrentUser,
      {
        stackVersion: params.stackVersion ?? '8.9.0',
      }
    );
    const { share, basePath } = server;
    const alertsLocator: LocatorPublic<AlertsLocatorParams> | undefined =
      share.url.locators.get(alertsLocatorID);

    const { anomalies } =
      (await getAnomalies(plugins, savedObjectsClient, params, state.lastCheckedAt as string)) ??
      {};

    const foundAnomalies = anomalies?.length > 0;

    if (foundAnomalies) {
      const monitorInfo = await libs.requests.getLatestMonitor({
        uptimeEsClient,
        dateStart: 'now-15m',
        dateEnd: 'now',
        monitorId: params.monitorId,
      });

      await asyncForEach(anomalies, async (anomaly, index) => {
        const summary = getAnomalySummary(anomaly, monitorInfo);
        const alertReasonMessage = generateAlertMessage(
          CommonDurationAnomalyTranslations.defaultActionMessage,
          summary
        );

        const alertId = DURATION_ANOMALY.id + index;

        const { start, uuid } = alertsClient?.report({
          id: alertId,
          actionGroup: DURATION_ANOMALY.id,
          payload: {
            'monitor.id': params.monitorId,
            'url.full': summary.monitorUrl,
            'observer.geo.name': summary.observerLocation,
            'anomaly.start': summary.anomalyStartTimestamp,
            'anomaly.bucket_span.minutes': summary.bucketSpan as unknown as string,
            [ALERT_EVALUATION_VALUE]: anomaly.actualSort,
            [ALERT_EVALUATION_THRESHOLD]: anomaly.typicalSort,
            [ALERT_REASON]: alertReasonMessage,
          },
          state: {
            ...updateState(state, false),
            ...summary,
          },
        });

        const indexedStartedAt = start ?? startedAt.toISOString();
        const relativeViewInAppUrl = getMonitorRouteFromMonitorId({
          monitorId: alertId,
          dateRangeEnd: 'now',
          dateRangeStart: indexedStartedAt,
        });

        alertsClient.setAlertData({
          id: DURATION_ANOMALY.id,
          context: {
            [ALERT_DETAILS_URL]: await getAlertUrl(
              uuid,
              spaceId,
              indexedStartedAt,
              alertsLocator,
              basePath.publicBaseUrl
            ),
            [ALERT_REASON_MSG]: alertReasonMessage,
            [VIEW_IN_APP_URL]: getViewInAppUrl(basePath, spaceId, relativeViewInAppUrl),
            ...summary,
          },
        });
      });
    }

    await setRecoveredAlertsContext<ActionGroupIds>({
      alertsClient,
      alertsLocator,
      basePath,
      defaultStartedAt: startedAt.toISOString(),
      spaceId,
    });

    return { state: updateState(state, foundAnomalies) };
  },
  alerts: UptimeRuleTypeAlertDefinition,
  getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
    observabilityPaths.ruleDetails(rule.id),
});
