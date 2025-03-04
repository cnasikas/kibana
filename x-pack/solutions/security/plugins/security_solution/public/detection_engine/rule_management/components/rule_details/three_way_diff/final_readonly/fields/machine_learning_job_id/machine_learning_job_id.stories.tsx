/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MachineLearningJobIdReadOnly } from './machine_learning_job_id';
import { ThreeWayDiffStorybookProviders } from '../../storybook/three_way_diff_storybook_providers';
import { GET_MODULES_QUERY_KEY } from '../../../../../../../../common/components/ml_popover/hooks/use_fetch_modules_query';
import { GET_RECOGNIZER_QUERY_KEY } from '../../../../../../../../common/components/ml_popover/hooks/use_fetch_recognizer_query';
import { GET_JOBS_SUMMARY_QUERY_KEY } from '../../../../../../../../common/components/ml/hooks/use_fetch_jobs_summary_query';

export default {
  component: MachineLearningJobIdReadOnly,
  title:
    'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/machine_learning_job_id',
};

const mockedModulesData = [
  {
    id: 'security_auth',
    jobs: [
      {
        id: 'auth_high_count_logon_events',
        config: {
          groups: [],
          custom_settings: {
            security_app_display_name: 'Spike in Logon Events',
          },
        },
      },
    ],
  },
];

const mockedCompatibleModules = [
  {
    id: 'security_auth',
  },
];

function MockMlData({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  queryClient.setQueryData([GET_JOBS_SUMMARY_QUERY_KEY, {}], []);

  queryClient.setQueryData([GET_MODULES_QUERY_KEY, {}], mockedModulesData);

  queryClient.setQueryData([GET_RECOGNIZER_QUERY_KEY, {}], mockedCompatibleModules);

  return <>{children}</>;
}

export const Default = () => (
  <ThreeWayDiffStorybookProviders>
    <MockMlData>
      <MachineLearningJobIdReadOnly machineLearningJobId="auth_high_count_logon_events" />
    </MockMlData>
  </ThreeWayDiffStorybookProviders>
);
