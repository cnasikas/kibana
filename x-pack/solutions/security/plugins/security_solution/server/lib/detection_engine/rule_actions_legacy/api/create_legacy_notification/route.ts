/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';

import type { SecuritySolutionPluginRouter } from '../../../../../types';
// eslint-disable-next-line no-restricted-imports
import { legacyUpdateOrCreateRuleActionsSavedObject } from '../../logic/rule_actions/legacy_update_or_create_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { legacyReadNotifications } from '../../logic/notifications/legacy_read_notifications';
// eslint-disable-next-line no-restricted-imports
import type { LegacyRuleNotificationRuleTypeParams } from '../../logic/notifications/legacy_types';
// eslint-disable-next-line no-restricted-imports
import { legacyCreateNotifications } from '../../logic/notifications/legacy_create_notifications';
import { UPDATE_OR_CREATE_LEGACY_ACTIONS } from '../../../../../../common/constants';

/**
 * Given an "alert_id" and a valid "action_id" this will create a legacy notification. This is for testing
 * purposes only and should not be used for production. It is behind a route with the words "internal" and
 * "legacy" to announce its legacy and internal intent.
 * @deprecated Once we no longer have legacy notifications and "side car actions" this can be removed.
 * @param router The router
 */
export const legacyCreateLegacyNotificationRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
): void => {
  router.versioned
    .post({
      path: UPDATE_OR_CREATE_LEGACY_ACTIONS,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({ alert_id: schema.string() }),
            body: schema.object({
              name: schema.string(),
              interval: schema.string(),
              actions: schema.arrayOf(
                schema.object({
                  id: schema.string(),
                  group: schema.string(),
                  params: schema.object({
                    message: schema.string(),
                  }),
                  actionTypeId: schema.string(),
                })
              ),
            }),
          },
        },
      },
      async (context, request, response) => {
        const rulesClient = await (await context.alerting).getRulesClient();
        const savedObjectsClient = (await context.core).savedObjects.client;
        const { alert_id: ruleAlertId } = request.query;
        const { actions, interval, name } = request.body;
        try {
          // This is to ensure it exists before continuing.
          await rulesClient.get({ id: ruleAlertId });
          const notification = await legacyReadNotifications({
            rulesClient,
            id: undefined,
            ruleAlertId,
          });
          if (notification != null) {
            await rulesClient.update<LegacyRuleNotificationRuleTypeParams>({
              id: notification.id,
              data: {
                tags: [],
                name,
                schedule: {
                  interval,
                },
                actions,
                params: {
                  ruleAlertId,
                },
                throttle: null,
                notifyWhen: null,
              },
            });
          } else {
            await legacyCreateNotifications({
              rulesClient,
              actions,
              enabled: true,
              ruleAlertId,
              interval,
              name,
            });
          }
          await legacyUpdateOrCreateRuleActionsSavedObject({
            ruleAlertId,
            savedObjectsClient,
            actions,
            throttle: interval,
            logger,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown';
          return response.badRequest({ body: message });
        }
        return response.ok({
          body: {
            ok: 'acknowledged',
          },
        });
      }
    );
};
