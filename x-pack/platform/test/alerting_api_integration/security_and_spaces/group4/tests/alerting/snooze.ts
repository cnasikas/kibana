/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import { UserAtSpaceScenarios } from '../../../scenarios';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  AlertUtils,
  checkAAD,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getUnauthorizedErrorMessage,
} from '../../../../common/lib';

const NOW = new Date().toISOString();

const snoozeSchedule = {
  schedule: {
    custom: {
      duration: '240h',
      start: NOW,
      recurring: {
        occurrences: 1,
      },
    },
  },
};

export default function createSnoozeRuleTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('snooze', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      const alertUtils = new AlertUtils({ user, space, supertestWithoutAuth });

      describe(scenario.id, () => {
        it('should handle snooze rule request appropriately', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'MY action',
              connector_type_id: 'test.noop',
              config: {},
              secrets: {},
            })
            .expect(200);

          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                enabled: false,
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                ],
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await alertUtils.getSnoozeRequest(createdAlert.id).send(snoozeSchedule);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('snooze', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              break;
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to execute actions`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                schedule: {
                  ...snoozeSchedule.schedule,
                  id: response.body.schedule.id,
                  custom: {
                    ...snoozeSchedule.schedule.custom,
                    duration: '240h',
                    timezone: 'UTC',
                  },
                },
              });
              const { body: updatedAlert } = await supertestWithoutAuth
                .get(`${getUrlPrefix(space.id)}/internal/alerting/rule/${createdAlert.id}`)
                .set('kbn-xsrf', 'foo')
                .auth(user.username, user.password)
                .expect(200);
              expect(updatedAlert.snooze_schedule.length).to.eql(1);
              const { rRule, duration } = updatedAlert.snooze_schedule[0];
              expect(rRule.dtstart).to.eql(NOW);
              expect(duration).to.eql(864000000);
              expect(updatedAlert.mute_all).to.eql(false);
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: RULE_SAVED_OBJECT_TYPE,
                id: createdAlert.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle snooze rule request appropriately when consumer is the same as producer', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                enabled: false,
                rule_type_id: 'test.restricted-noop',
                consumer: 'alertsRestrictedFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await alertUtils.getSnoozeRequest(createdAlert.id).send(snoozeSchedule);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage(
                  'snooze',
                  'test.restricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                schedule: {
                  ...snoozeSchedule.schedule,
                  id: response.body.schedule.id,
                  custom: {
                    ...snoozeSchedule.schedule.custom,
                    duration: '240h',
                    timezone: 'UTC',
                  },
                },
              });
              const { body: updatedAlert } = await supertestWithoutAuth
                .get(`${getUrlPrefix(space.id)}/internal/alerting/rule/${createdAlert.id}`)
                .set('kbn-xsrf', 'foo')
                .auth(user.username, user.password)
                .expect(200);
              expect(updatedAlert.snooze_schedule.length).to.eql(1);
              const { rRule, duration } = updatedAlert.snooze_schedule[0];
              expect(rRule.dtstart).to.eql(NOW);
              expect(duration).to.eql(864000000);
              expect(updatedAlert.mute_all).to.eql(false);
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: RULE_SAVED_OBJECT_TYPE,
                id: createdAlert.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle snooze rule request appropriately when consumer is not the producer', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                enabled: false,
                rule_type_id: 'test.unrestricted-noop',
                consumer: 'alertsFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await alertUtils.getSnoozeRequest(createdAlert.id).send(snoozeSchedule);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage(
                  'snooze',
                  'test.unrestricted-noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                schedule: {
                  ...snoozeSchedule.schedule,
                  id: response.body.schedule.id,
                  custom: {
                    ...snoozeSchedule.schedule.custom,
                    duration: '240h',
                    timezone: 'UTC',
                  },
                },
              });
              const { body: updatedAlert } = await supertestWithoutAuth
                .get(`${getUrlPrefix(space.id)}/internal/alerting/rule/${createdAlert.id}`)
                .set('kbn-xsrf', 'foo')
                .auth(user.username, user.password)
                .expect(200);
              expect(updatedAlert.snooze_schedule.length).to.eql(1);
              const { rRule, duration } = updatedAlert.snooze_schedule[0];
              expect(rRule.dtstart).to.eql(NOW);
              expect(duration).to.eql(864000000);
              expect(updatedAlert.mute_all).to.eql(false);
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: RULE_SAVED_OBJECT_TYPE,
                id: createdAlert.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle snooze rule request appropriately when consumer is "alerts"', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                enabled: false,
                rule_type_id: 'test.restricted-noop',
                consumer: 'alerts',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await alertUtils.getSnoozeRequest(createdAlert.id).send(snoozeSchedule);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('snooze', 'test.restricted-noop', 'alerts'),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                schedule: {
                  ...snoozeSchedule.schedule,
                  id: response.body.schedule.id,
                  custom: {
                    ...snoozeSchedule.schedule.custom,
                    duration: '240h',
                    timezone: 'UTC',
                  },
                },
              });
              const { body: updatedAlert } = await supertestWithoutAuth
                .get(`${getUrlPrefix(space.id)}/internal/alerting/rule/${createdAlert.id}`)
                .set('kbn-xsrf', 'foo')
                .auth(user.username, user.password)
                .expect(200);
              expect(updatedAlert.snooze_schedule.length).to.eql(1);
              const { rRule, duration } = updatedAlert.snooze_schedule[0];
              expect(rRule.dtstart).to.eql(NOW);
              expect(duration).to.eql(864000000);
              expect(updatedAlert.mute_all).to.eql(false);
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: RULE_SAVED_OBJECT_TYPE,
                id: createdAlert.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
