/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';

import { init } from '../integration_tests/helpers/http_requests';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import {
  retryLifecycleActionExtension,
  removeLifecyclePolicyActionExtension,
  addLifecyclePolicyActionExtension,
  ilmBannerExtension,
  ilmFilterExtension,
} from '../public/extend_index_management';
import { init as initHttp } from '../public/application/services/http';
import { init as initUiMetric } from '../public/application/services/ui_metric';
import { indexLifecycleTab } from '../public/extend_index_management/components/index_lifecycle_summary';
import { Index } from '@kbn/index-management-plugin/common';
import { findTestSubject } from '@elastic/eui/lib/test';
import { useEuiTheme } from '@elastic/eui';

const { httpSetup } = init();

initHttp(httpSetup);
initUiMetric(usageCollectionPluginMock.createSetupContract());

jest.mock('@kbn/index-management-plugin/public', async () => {
  const { indexManagementMock } = await import('@kbn/index-management-plugin/public/mocks');
  return indexManagementMock.createSetup();
});

// Mock useEuiTheme to return the desired theme
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({
    euiTheme: {
      themeName: 'EUI_THEME_BOREALIS',
      colors: {
        vis: {
          euiColorVis1: '#6092C0',
          euiColorVis2: '#D36086',
          euiColorVis4: '#CA8EAE',
          euiColorVis5: '#D6BF57',
          euiColorVis6: '#B9A888',
          euiColorVis9: '#E7664C',
        },
      },
    },
  }),
}));

const indexWithoutLifecyclePolicy: Index = {
  health: 'yellow',
  status: 'open',
  name: 'noPolicy',
  uuid: 'BJ-nrZYuSrG-jaofr6SeLg',
  primary: 1,
  replica: 1,
  documents: 1,
  documents_deleted: 0,
  size: '3.4kb',
  primary_size: '3.4kb',
  aliases: 'none',
  isFrozen: false,
  hidden: false,
  ilm: {
    index: 'testy1',
    managed: false,
  },
};

const indexWithLifecyclePolicy: Index = {
  health: 'yellow',
  status: 'open',
  name: 'testy3',
  uuid: 'XL11TLa3Tvq298_dMUzLHQ',
  primary: 1,
  replica: 1,
  documents: 2,
  documents_deleted: 0,
  size: '6.5kb',
  primary_size: '6.5kb',
  aliases: 'none',
  isFrozen: false,
  hidden: false,
  ilm: {
    index: 'testy3',
    managed: true,
    policy: 'testy',
    lifecycle_date_millis: 1544020872361,
    phase: 'new',
    phase_time_millis: 1544187775867,
    action: 'complete',
    action_time_millis: 1544187775867,
    step: 'complete',
    step_time_millis: 1544187775867,
  },
};

const indexWithLifecycleError: Index = {
  health: 'yellow',
  status: 'open',
  name: 'testy3',
  uuid: 'XL11TLa3Tvq298_dMUzLHQ',
  primary: 1,
  replica: 1,
  documents: 2,
  documents_deleted: 0,
  size: '6.5kb',
  primary_size: '6.5kb',
  aliases: 'none',
  isFrozen: false,
  hidden: false,
  ilm: {
    index: 'testy3',
    managed: true,
    policy: 'testy',
    lifecycle_date_millis: 1544020872361,
    phase: 'hot',
    phase_time_millis: 1544187775891,
    action: 'rollover',
    action_time_millis: 1544187775891,
    step: 'ERROR',
    step_time_millis: 1544187776208,
    failed_step: 'check-rollover-ready',
    step_info: {
      type: 'illegal_argument_exception',
      reason: 'setting [index.lifecycle.rollover_alias] for index [testy3] is empty or not defined',
    },
  },
};
const indexWithLifecyclePhaseDefinition: Index = {
  health: 'yellow',
  status: 'open',
  name: 'testy3',
  uuid: 'XL11TLa3Tvq298_dMUzLHQ',
  primary: 1,
  replica: 1,
  documents: 2,
  documents_deleted: 0,
  size: '6.5kb',
  primary_size: '6.5kb',
  aliases: 'none',
  isFrozen: false,
  hidden: false,
  ilm: {
    index: 'testy3',
    managed: true,
    policy: 'testy',
    lifecycle_date_millis: 1544020872361,
    phase: 'hot',
    phase_time_millis: 1544187775891,
    action: 'rollover',
    action_time_millis: 1544187775891,
    step: 'test',
    step_time_millis: 1544187776208,
    phase_execution: {
      policy: 'testy',
      phase_definition: { min_age: '0s', actions: { rollover: { max_size: '1gb' } } },
      version: 1,
      modified_date_in_millis: 1544031699844,
    },
  },
};
const indexWithLifecycleWaitingStep: Index = {
  health: 'yellow',
  status: 'open',
  name: 'testy3',
  uuid: 'XL11TLa3Tvq298_dMUzLHQ',
  primary: 1,
  replica: 1,
  documents: 2,
  documents_deleted: 0,
  size: '6.5kb',
  primary_size: '6.5kb',
  aliases: 'none',
  isFrozen: false,
  hidden: false,
  ilm: {
    index: 'testy3',
    managed: true,
    policy: 'testy',
    lifecycle_date_millis: 1544020872361,
    phase: 'hot',
    phase_time_millis: 1544187775891,
    action: 'rollover',
    action_time_millis: 1544187775891,
    step: 'test',
    step_time_millis: 1544187776208,
    step_info: {
      message: 'Waiting for all shard copies to be active',
      shards_left_to_allocate: -1,
      all_shards_active: false,
      number_of_replicas: 2,
    },
  },
};
const indexWithNonExistentPolicyError: Index = {
  health: 'yellow',
  status: 'open',
  name: 'testy3',
  uuid: 'XL11TLa3Tvq298_dMUzLHQ',
  primary: 1,
  replica: 1,
  documents: 2,
  documents_deleted: 0,
  size: '6.5kb',
  primary_size: '6.5kb',
  aliases: 'none',
  isFrozen: false,
  hidden: false,
  ilm: {
    index: 'testy3',
    managed: true,
    policy: 'testy',
    index_creation_date_millis: 1753074916462,
    step: 'ERROR',
    step_info: {
      type: 'illegal_argument_exception',
      reason: 'policy [testy] does not exist',
    },
  },
};

moment.tz.setDefault('utc');

const getUrlForApp = (appId: string, options: any) => {
  return appId + '/' + (options ? options.path : '');
};

const reloadIndices = () => {};

describe('extend index management', () => {
  describe('retry lifecycle action extension', () => {
    test('should return null when no indices have index lifecycle policy', () => {
      const extension = retryLifecycleActionExtension({ indices: [indexWithoutLifecyclePolicy] });
      expect(extension).toBeNull();
    });

    test('should return null when no index has failed step lifecycle errors', () => {
      const extension = retryLifecycleActionExtension({
        indices: [indexWithLifecyclePolicy, indexWithLifecyclePolicy],
      });
      expect(extension).toBeNull();
    });

    test('should return extension with only indices that have failed step lifecycle errors', () => {
      const extension = retryLifecycleActionExtension({
        indices: [
          indexWithLifecyclePolicy,
          indexWithLifecycleError,
          indexWithNonExistentPolicyError,
        ],
      });
      expect(extension).toBeDefined();
      expect(extension).toMatchSnapshot();
    });

    test('should return extension when all indices have failed step lifecycle errors', () => {
      const extension = retryLifecycleActionExtension({
        indices: [indexWithLifecycleError, indexWithLifecycleError],
      });
      expect(extension).toBeDefined();
      expect(extension).toMatchSnapshot();
    });
  });

  describe('remove lifecycle action extension', () => {
    test('should return null when no indices have index lifecycle policy', () => {
      const extension = removeLifecyclePolicyActionExtension({
        indices: [indexWithoutLifecyclePolicy],
        reloadIndices,
      });
      expect(extension).toBeNull();
    });

    test('should return null when some indices have index lifecycle policy', () => {
      const extension = removeLifecyclePolicyActionExtension({
        indices: [indexWithoutLifecyclePolicy, indexWithLifecyclePolicy],
        reloadIndices,
      });
      expect(extension).toBeNull();
    });

    test('should return extension when all indices have lifecycle policy', () => {
      const extension = removeLifecyclePolicyActionExtension({
        indices: [indexWithLifecycleError, indexWithLifecycleError],
        reloadIndices,
      });
      expect(extension).toBeDefined();
      expect(extension).toMatchSnapshot();
    });
  });

  describe('add lifecycle policy action extension', () => {
    test('should return null when index has index lifecycle policy', () => {
      const extension = addLifecyclePolicyActionExtension({
        indices: [indexWithLifecyclePolicy],
        reloadIndices,
        getUrlForApp,
      });
      expect(extension).toBeNull();
    });

    test('should return null when more than one index is passed', () => {
      const extension = addLifecyclePolicyActionExtension({
        indices: [indexWithoutLifecyclePolicy, indexWithoutLifecyclePolicy],
        reloadIndices,
        getUrlForApp,
      });
      expect(extension).toBeNull();
    });

    test('should return extension when one index is passed and it does not have lifecycle policy', () => {
      const extension = addLifecyclePolicyActionExtension({
        indices: [indexWithoutLifecyclePolicy],
        reloadIndices,
        getUrlForApp,
      });
      expect(extension?.renderConfirmModal).toBeDefined();
      const component = extension!.renderConfirmModal(jest.fn());
      const rendered = mountWithIntl(component);
      expect(rendered.exists('.euiModal--confirmation'));
    });
  });

  describe('ilm banner extension', () => {
    test('should return null when no index has index lifecycle policy', () => {
      const extension = ilmBannerExtension([
        indexWithoutLifecyclePolicy,
        indexWithoutLifecyclePolicy,
      ]);
      expect(extension).toBeNull();
    });

    test('should return null no index has lifecycle error', () => {
      const extension = ilmBannerExtension([indexWithoutLifecyclePolicy, indexWithLifecyclePolicy]);
      expect(extension).toBeNull();
    });

    test('should return extension when any index has lifecycle error', () => {
      const extension = ilmBannerExtension([
        indexWithoutLifecyclePolicy,
        indexWithLifecyclePolicy,
        indexWithLifecycleError,
      ]);
      expect(extension).toBeDefined();
      expect(extension).toMatchSnapshot();
    });

    test('should return action definition when any index has failed step lifecycle error', () => {
      const extension = ilmBannerExtension([
        indexWithoutLifecyclePolicy,
        indexWithLifecyclePolicy,
        indexWithLifecycleError,
        indexWithNonExistentPolicyError,
      ]);
      const { requestMethod, successMessage, buttonLabel } =
        retryLifecycleActionExtension({
          indices: [indexWithLifecycleError],
        }) ?? {};
      expect(extension?.action).toEqual({
        requestMethod,
        successMessage,
        buttonLabel,
        indexNames: [indexWithLifecycleError.name],
      });
    });

    test('should not return action definition when index has lifecycle error other than failed step', () => {
      const extension = ilmBannerExtension([
        indexWithoutLifecyclePolicy,
        indexWithLifecyclePolicy,
        indexWithNonExistentPolicyError,
      ]);
      expect(extension?.action).toBeUndefined();
    });
  });

  describe('ilm summary extension', () => {
    const IlmComponent = indexLifecycleTab.renderTabContent;
    const policyPropertiesPanel = 'policyPropertiesPanel';
    const policyStepPanel = 'policyStepPanel';
    const policyErrorPanel = 'policyErrorPanel';
    const phaseDefinitionPanel = 'phaseDefinitionPanel';

    const IlmContentComponent = ({ index }: { index: Index }) => {
      const { euiTheme } = useEuiTheme();
      return <IlmComponent index={index} getUrlForApp={getUrlForApp} euiTheme={euiTheme} />;
    };

    test('should not render the tab when index has no index lifecycle policy', () => {
      const shouldRenderTab =
        indexLifecycleTab.shouldRenderTab &&
        indexLifecycleTab.shouldRenderTab({
          index: indexWithoutLifecyclePolicy,
        });
      expect(shouldRenderTab).toBeFalsy();
    });

    test('should render the tab when index has lifecycle policy', () => {
      const shouldRenderTab =
        indexLifecycleTab.shouldRenderTab &&
        indexLifecycleTab.shouldRenderTab({
          index: indexWithLifecyclePolicy,
        });
      expect(shouldRenderTab).toBeTruthy();
      const rendered = mountWithIntl(<IlmContentComponent index={indexWithLifecyclePolicy} />);
      expect(rendered.render()).toMatchSnapshot();
      expect(findTestSubject(rendered, policyPropertiesPanel).exists()).toBeTruthy();
      expect(findTestSubject(rendered, phaseDefinitionPanel).exists()).toBeFalsy();
      expect(findTestSubject(rendered, policyStepPanel).exists()).toBeFalsy();
      expect(findTestSubject(rendered, policyErrorPanel).exists()).toBeFalsy();
    });

    test('should render an error panel when index has lifecycle error', () => {
      const rendered = mountWithIntl(<IlmContentComponent index={indexWithLifecycleError} />);
      expect(rendered.render()).toMatchSnapshot();
      expect(findTestSubject(rendered, policyPropertiesPanel).exists()).toBeTruthy();
      expect(findTestSubject(rendered, phaseDefinitionPanel).exists()).toBeFalsy();
      expect(findTestSubject(rendered, policyStepPanel).exists()).toBeFalsy();
      expect(findTestSubject(rendered, policyErrorPanel).exists()).toBeTruthy();
    });

    test('should render a phase definition panel when lifecycle has phase definition', () => {
      const rendered = mountWithIntl(
        <IlmContentComponent index={indexWithLifecyclePhaseDefinition} />
      );
      expect(rendered.render()).toMatchSnapshot();
      expect(findTestSubject(rendered, policyPropertiesPanel).exists()).toBeTruthy();
      expect(findTestSubject(rendered, phaseDefinitionPanel).exists()).toBeTruthy();
      expect(findTestSubject(rendered, policyStepPanel).exists()).toBeFalsy();
      expect(findTestSubject(rendered, policyErrorPanel).exists()).toBeFalsy();
    });

    test('should render a step info panel when lifecycle is waiting for a step completion', () => {
      const rendered = mountWithIntl(<IlmContentComponent index={indexWithLifecycleWaitingStep} />);
      expect(rendered.render()).toMatchSnapshot();
      expect(findTestSubject(rendered, policyPropertiesPanel).exists()).toBeTruthy();
      expect(findTestSubject(rendered, phaseDefinitionPanel).exists()).toBeFalsy();
      expect(findTestSubject(rendered, policyStepPanel).exists()).toBeTruthy();
      expect(findTestSubject(rendered, policyErrorPanel).exists()).toBeFalsy();
    });
  });

  describe('ilm filter extension', () => {
    test('should return empty array when no indices have index lifecycle policy', () => {
      const extension = ilmFilterExtension([
        indexWithoutLifecyclePolicy,
        indexWithoutLifecyclePolicy,
      ]);
      expect(extension.length).toBe(0);
    });

    test('should return extension when any index has lifecycle policy', () => {
      const extension = ilmFilterExtension([
        indexWithLifecyclePolicy,
        indexWithoutLifecyclePolicy,
        indexWithoutLifecyclePolicy,
      ]);
      expect(extension).toBeDefined();
      expect(extension).toMatchSnapshot();
    });
  });
});
