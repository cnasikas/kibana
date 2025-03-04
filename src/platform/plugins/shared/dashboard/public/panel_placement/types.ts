/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MaybePromise } from '@kbn/utility-types';
import { DashboardPanelState } from '../../common';
import type { GridData } from '../../server/content_management';
import { PanelPlacementStrategy } from '../plugin_constants';

export interface PanelPlacementSettings {
  strategy?: PanelPlacementStrategy;
  height?: number;
  width?: number;
}

export interface PanelPlacementReturn {
  newPanelPlacement: Omit<GridData, 'i'>;
  otherPanels: { [key: string]: DashboardPanelState };
}

export interface PanelPlacementProps {
  width: number;
  height: number;
  currentPanels: { [key: string]: DashboardPanelState };
}

export type GetPanelPlacementSettings<SerializedState extends object = object> = (
  serializedState?: SerializedState
) => MaybePromise<PanelPlacementSettings>;
