/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import { Spaces } from '../../../scenarios';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import type { TaskManagerDoc } from '../../../../common/lib';
import {
  AlertUtils,
  checkAAD,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
} from '../../../../common/lib';

export default function createEnableAlertTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('enable', () => {
    const objectRemover = new ObjectRemover(supertestWithoutAuth);
    const alertUtils = new AlertUtils({ space: Spaces.space1, supertestWithoutAuth });

    after(() => objectRemover.removeAll());

    async function getScheduledTask(id: string): Promise<TaskManagerDoc> {
      const scheduledTask = await es.get<TaskManagerDoc>({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
      return scheduledTask._source!;
    }

    describe('handle enable alert request', function () {
      this.tags('skipFIPS');
      it('should handle enable alert request appropriately', async () => {
        const { body: createdAlert } = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData({ enabled: false }))
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

        await alertUtils.enable(createdAlert.id);

        const { body: updatedAlert } = await supertestWithoutAuth
          .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${createdAlert.id}`)
          .set('kbn-xsrf', 'foo')
          .expect(200);
        expect(typeof updatedAlert.scheduled_task_id).to.eql('string');
        const taskRecord = await getScheduledTask(updatedAlert.scheduled_task_id);
        expect(taskRecord.type).to.eql('task');
        expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
        expect(JSON.parse(taskRecord.task.params)).to.eql({
          alertId: createdAlert.id,
          spaceId: Spaces.space1.id,
          consumer: 'alertsFixture',
        });
        expect(taskRecord.task.enabled).to.eql(true);

        // Ensure revision was not updated
        expect(updatedAlert.revision).to.eql(0);

        // Ensure AAD isn't broken
        await checkAAD({
          supertest: supertestWithoutAuth,
          spaceId: Spaces.space1.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: createdAlert.id,
        });
      });
    });

    describe(`shouldn't enable alert from another space`, function () {
      this.tags('skipFIPS');
      it(`shouldn't enable alert from another space`, async () => {
        const { body: createdAlert } = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.other.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData({ enabled: false }))
          .expect(200);
        objectRemover.add(Spaces.other.id, createdAlert.id, 'rule', 'alerting');

        await alertUtils.getEnableRequest(createdAlert.id).expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [alert/${createdAlert.id}] not found`,
        });
      });
    });
  });
}
