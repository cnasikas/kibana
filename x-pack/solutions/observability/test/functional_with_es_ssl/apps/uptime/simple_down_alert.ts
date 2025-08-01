/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { MonitorStatusTranslations } from '@kbn/uptime-plugin/common/rules/legacy_uptime/translations';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  describe('uptime simple status alert', () => {
    const pageObjects = getPageObjects(['common', 'header', 'uptime']);
    const uptimeService = getService('uptime');
    const retry = getService('retry');
    const supertest = getService('supertest');
    const toasts = getService('toasts');

    const testSubjects = getService('testSubjects');

    const monitorId = '0000-intermittent';

    const uptime = getService('uptime');

    const DEFAULT_DATE_START = 'Sep 10, 2019 @ 12:40:08.078';
    const DEFAULT_DATE_END = 'Sep 11, 2019 @ 19:40:08.078';

    const hideErrorToast = async () => {
      if (await testSubjects.exists('errorToastMessage', { timeout: 0 })) {
        await testSubjects.click('toastCloseButton');
      }
    };

    before(async () => {
      // delete the saved object
      await uptime.common.deleteUptimeSettingsObject();

      await uptime.navigation.goToUptime();

      await pageObjects.uptime.goToUptimeOverviewAndLoadData(DEFAULT_DATE_START, DEFAULT_DATE_END);
    });

    beforeEach(async () => {
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('displays to define default connector', async () => {
      await hideErrorToast();
      await testSubjects.click('uptimeDisplayDefineConnector');
      await testSubjects.existOrFail('uptimeSettingsDefineConnector');
    });

    it('go to settings to define connector', async () => {
      await uptimeService.overview.clickDefineSettings();
      await uptimeService.common.waitUntilDataIsLoaded();
      await testSubjects.existOrFail('comboBoxInput');
    });

    it('define default connector', async () => {
      await testSubjects.click('comboBoxInput');
      await testSubjects.click('Slack#xyztest');
      await testSubjects.click('apply-settings-button');
      await uptimeService.navigation.goToUptime();
    });

    it('enable simple status alert', async () => {
      await pageObjects.uptime.goToUptimeOverviewAndLoadData(DEFAULT_DATE_START, DEFAULT_DATE_END);
      await testSubjects.click('uptimeEnableSimpleDownAlert' + monitorId);
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('displays relevant alert in list drawer', async () => {
      await toasts.dismissAll();

      await testSubjects.click(`xpack.synthetics.monitorList.${monitorId}.expandMonitorDetail`);
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('uptimeMonitorListDrawerAlert0');
    });

    it('has created a valid simple alert with expected parameters', async () => {
      let alert: any;
      await retry.tryForTime(15000, async () => {
        const apiResponse = await supertest.get(
          `/api/alerting/rules/_find?search=Simple status alert`
        );
        const alertsFromThisTest = apiResponse.body.data.filter(({ params }: { params: any }) =>
          params.search.includes(monitorId)
        );
        expect(alertsFromThisTest).to.have.length(1);
        alert = alertsFromThisTest[0];
      });

      const { actions, rule_type_id: alertTypeId, consumer, tags } = alert ?? {};
      expect(actions).to.eql([
        {
          connector_type_id: '.slack',
          group: 'recovered',
          params: {
            message: MonitorStatusTranslations.defaultRecoveryMessage,
          },
          id: 'my-slack1',
          uuid: actions[0].uuid,
        },
        {
          connector_type_id: '.slack',
          group: 'xpack.uptime.alerts.actionGroups.monitorStatus',
          params: {
            message: MonitorStatusTranslations.defaultActionMessage,
          },
          id: 'my-slack1',
          uuid: actions[1].uuid,
        },
      ]);
      expect(alertTypeId).to.eql('xpack.uptime.alerts.monitorStatus');
      expect(consumer).to.eql('uptime');
      expect(tags).to.eql(['UPTIME_AUTO']);
    });

    it('disable simple status alert', async () => {
      await testSubjects.click('uptimeDisableSimpleDownAlert' + monitorId);
      await pageObjects.header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        await testSubjects.existOrFail('uptimeEnableSimpleDownAlert' + monitorId);
      });
    });
  });
};
