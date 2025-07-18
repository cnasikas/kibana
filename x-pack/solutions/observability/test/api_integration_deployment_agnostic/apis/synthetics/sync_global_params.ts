/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import {
  ConfigKey,
  HTTPFields,
  LocationStatus,
  PrivateLocation,
  ServiceLocation,
  SyntheticsParams,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import expect from '@kbn/expect';
import { syntheticsParamType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';
import { comparePolicies, getTestSyntheticsPolicy } from './sample_data/test_policy';
import { addMonitorAPIHelper, omitMonitorKeys } from './create_monitor';

export const LOCAL_LOCATION = {
  id: 'dev',
  label: 'Dev Service',
  geo: {
    lat: 0,
    lon: 0,
  },
  isServiceManaged: true,
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe.skip('SyncGlobalParams', function () {
    this.tags('skipCloud');
    const supertestAPI = getService('supertestWithoutAuth');
    const supertestWithAuth = getService('supertest');
    const kServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');

    let testFleetPolicyID: string;
    let _browserMonitorJson: HTTPFields;
    let browserMonitorJson: HTTPFields;

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;

    let newMonitorId: string;
    let newHttpMonitorId: string;
    let privateLocations: PrivateLocation[] = [];

    let editorUser: RoleCredentials;

    const testPrivateLocations = new PrivateLocationTestService(getService);
    const params: Record<string, string> = {};

    const addMonitorAPI = async (monitor: any, statusCode = 200) => {
      return addMonitorAPIHelper(supertestAPI, monitor, statusCode, editorUser, samlAuth);
    };

    before(async () => {
      await kServer.savedObjects.cleanStandardList();
      await testPrivateLocations.installSyntheticsPackage();

      _browserMonitorJson = getFixtureJson('browser_monitor');
      _httpMonitorJson = getFixtureJson('http_monitor');
      await kServer.savedObjects.clean({ types: [syntheticsParamType] });
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
    });

    beforeEach(() => {
      browserMonitorJson = _browserMonitorJson;
      httpMonitorJson = _httpMonitorJson;
    });

    const testPolicyName = 'Fleet test server policy' + Date.now();

    it('adds a test fleet policy', async () => {
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testFleetPolicyID = apiResponse.body.item.id;
    });

    it('add a test private location', async () => {
      privateLocations = await testPrivateLocations.setTestLocations([testFleetPolicyID]);

      const apiResponse = await supertestAPI.get(SYNTHETICS_API_URLS.SERVICE_LOCATIONS);

      const testLocations: Array<PrivateLocation | ServiceLocation> = [
        {
          id: 'dev',
          label: 'Dev Service',
          geo: { lat: 0, lon: 0 },
          url: 'mockDevUrl',
          isServiceManaged: true,
          status: LocationStatus.EXPERIMENTAL,
          isInvalid: false,
        },
        {
          id: 'dev2',
          label: 'Dev Service 2',
          geo: { lat: 0, lon: 0 },
          url: 'mockDevUrl',
          isServiceManaged: true,
          status: LocationStatus.EXPERIMENTAL,
          isInvalid: false,
        },
        {
          id: testFleetPolicyID,
          isInvalid: false,
          isServiceManaged: false,
          label: privateLocations[0].label,
          geo: {
            lat: 0,
            lon: 0,
          },
          agentPolicyId: testFleetPolicyID,
        },
      ];

      expect(apiResponse.body.locations).eql(testLocations);
    });

    it('adds a monitor in private location', async () => {
      const newMonitor = browserMonitorJson;

      const pvtLoc = {
        id: testFleetPolicyID,
        agentPolicyId: testFleetPolicyID,
        label: privateLocations[0].label,
        isServiceManaged: false,
        geo: {
          lat: 0,
          lon: 0,
        },
      };

      newMonitor.locations.push(pvtLoc);

      const apiResponse = await addMonitorAPI(newMonitor);

      expect(apiResponse.body).eql(
        omitMonitorKeys({
          ...newMonitor,
          [ConfigKey.MONITOR_QUERY_ID]: apiResponse.body.id,
          [ConfigKey.CONFIG_ID]: apiResponse.body.id,
          locations: [LOCAL_LOCATION, pvtLoc],
        })
      );
      newMonitorId = apiResponse.rawBody.id;
    });

    it('added an integration for previously added monitor', async () => {
      const apiResponse = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponse.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy?.policy_id).eql(
        testFleetPolicyID,
        JSON.stringify({ testFleetPolicyID, newMonitorId })
      );

      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: browserMonitorJson.name,
          id: newMonitorId,
          isBrowser: true,
          location: { id: testFleetPolicyID },
        })
      );
    });

    it('adds a test param', async () => {
      const apiResponse = await supertestAPI
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ key: 'test', value: 'http://proxy.com' });

      expect(apiResponse.status).eql(200);
    });

    it('get list of params', async () => {
      const apiResponse = await supertestAPI
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ key: 'test', value: 'http://proxy.com' });

      expect(apiResponse.status).eql(200);

      apiResponse.body.forEach(({ key, value }: SyntheticsParams) => {
        params[key] = value;
      });
    });

    it('added params to for previously added integration', async () => {
      const apiResponse = await supertestWithAuth.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponse.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: browserMonitorJson.name,
          id: newMonitorId,
          params,
          isBrowser: true,
          location: { id: testFleetPolicyID },
        })
      );
    });

    it('add a http monitor using param', async () => {
      const newMonitor = httpMonitorJson;
      const pvtLoc = {
        id: testFleetPolicyID,
        agentPolicyId: testFleetPolicyID,
        label: privateLocations[0].label,
        isServiceManaged: false,
        geo: {
          lat: 0,
          lon: 0,
        },
      };
      newMonitor.locations.push(pvtLoc);

      newMonitor.proxy_url = '${test}';

      const apiResponse = await addMonitorAPI(newMonitor);

      expect(apiResponse.body).eql(
        omitMonitorKeys({
          ...newMonitor,
          [ConfigKey.MONITOR_QUERY_ID]: apiResponse.body.id,
          [ConfigKey.CONFIG_ID]: apiResponse.body.id,
          locations: [LOCAL_LOCATION, pvtLoc],
        })
      );
      newHttpMonitorId = apiResponse.rawBody.id;
    });

    it('parsed params for previously added http monitors', async () => {
      const apiResponse = await supertestWithAuth.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponse.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newHttpMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      const pPolicy = getTestSyntheticsPolicy({
        name: httpMonitorJson.name,
        id: newHttpMonitorId,
        isTLSEnabled: false,
        namespace: 'testnamespace',
        location: { id: testFleetPolicyID },
      });

      comparePolicies(packagePolicy, pPolicy);
    });

    it('delete all params and sync again', async () => {
      await supertestAPI
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ key: 'get', value: 'test' });
      const getResponse = await supertestAPI
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(getResponse.body.length).eql(2);

      const paramsResponse = getResponse.body || [];
      const ids = paramsResponse.map((param: any) => param.id);

      const deleteResponse = await supertestAPI
        .delete(SYNTHETICS_API_URLS.PARAMS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ids })
        .expect(200);

      expect(deleteResponse.body).to.have.length(2);

      const getResponseAfterDelete = await supertestAPI
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(getResponseAfterDelete.body.length).eql(0);

      const apiResponse = await supertestWithAuth.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponse.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: browserMonitorJson.name,
          id: newMonitorId,
          isBrowser: true,
          location: { id: testFleetPolicyID },
        })
      );
    });
  });
}
