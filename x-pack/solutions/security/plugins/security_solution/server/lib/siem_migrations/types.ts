/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IClusterClient } from '@kbn/core/server';
import type { SiemRuleMigrationsClient } from './rules/siem_rule_migrations_service';
import type { SiemDashboardMigrationsClient } from './dashboards/siem_dashboard_migration_service';

export interface SiemMigrationsSetupParams {
  esClusterClient: IClusterClient;
  tasksTimeoutMs?: number;
}

export interface SiemMigrationClients {
  getRulesClient: () => SiemRuleMigrationsClient;
  getDashboardsClient: () => SiemDashboardMigrationsClient;
}

export type Stored<T extends object> = T & { id: string };
