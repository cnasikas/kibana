/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { FeatureCatalogueRegistry } from './feature_catalogue';

export type {
  FeatureCatalogueCategory,
  FeatureCatalogueEntry,
  FeatureCatalogueSolution,
  FeatureCatalogueRegistrySetup,
} from './feature_catalogue';

export { EnvironmentService } from './environment';
export type { Environment, EnvironmentServiceSetup } from './environment';

export { TutorialService } from './tutorials';

export type {
  TutorialVariables,
  TutorialServiceSetup,
  TutorialDirectoryHeaderLinkComponent,
  TutorialModuleNoticeComponent,
} from './tutorials';

export { AddDataService } from './add_data';
export type { AddDataServiceSetup, AddDataTab } from './add_data';

export { WelcomeService } from './welcome';
export type { WelcomeServiceSetup, WelcomeRenderTelemetryNotice } from './welcome';
