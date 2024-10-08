/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { getLineageMap } from './lineage_map';
import { CONTROL_TYPES, newControl } from '../editor_utils';

test('creates lineage map', () => {
  const control1 = newControl(CONTROL_TYPES.LIST);
  control1.id = '1';
  const control2 = newControl(CONTROL_TYPES.LIST);
  control2.id = '2';
  const control3 = newControl(CONTROL_TYPES.LIST);
  control3.id = '3';

  control2.parent = control1.id;
  control3.parent = control2.id;

  const lineageMap = getLineageMap([control1, control2, control3]);
  expect([control1.id]).to.eql(lineageMap.get(control1.id));
  expect([control2.id, control1.id]).to.eql(lineageMap.get(control2.id));
  expect([control3.id, control2.id, control1.id]).to.eql(lineageMap.get(control3.id));
});

test('safely handles circular graph', () => {
  const control1 = newControl(CONTROL_TYPES.LIST);
  control1.id = '1';
  const control2 = newControl(CONTROL_TYPES.LIST);
  control2.id = '2';

  control1.parent = control2.id;
  control2.parent = control1.id;

  const lineageMap = getLineageMap([control1, control2]);
  expect([control1.id, control2.id]).to.eql(lineageMap.get(control1.id));
  expect([control2.id, control1.id]).to.eql(lineageMap.get(control2.id));
});
