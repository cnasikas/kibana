/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SIEM_MIGRATIONS_FEATURE_ID } from '@kbn/security-solution-features/constants';
import {
  SecurityPageName,
  SECURITY_FEATURE_ID,
  SIEM_MIGRATIONS_RULES_PATH,
} from '../../common/constants';
import type { LinkItem } from '../common/links/types';
import { SiemMigrationsIcon } from '../common/icons/siem_migrations';

export const siemMigrationsLinks: LinkItem = {
  id: SecurityPageName.siemMigrationsRules,
  title: i18n.translate('xpack.securitySolution.appLinks.automaticMigrationRules.title', {
    defaultMessage: 'Automatic migrations',
  }),
  description: i18n.translate('xpack.securitySolution.appLinks.siemMigrationsRules.description', {
    defaultMessage:
      'Our generative AI powered Automatic migration tool automates some of the most time consuming migrations tasks and processes.',
  }),
  landingIcon: SiemMigrationsIcon,
  path: SIEM_MIGRATIONS_RULES_PATH,
  capabilities: [[`${SECURITY_FEATURE_ID}.show`, `${SIEM_MIGRATIONS_FEATURE_ID}.all`]],
  skipUrlState: true,
  hideTimeline: true,
  hideWhenExperimentalKey: 'siemMigrationsDisabled',
};
