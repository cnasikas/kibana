/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { loadAllActions } from '.';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('loadAllActions', () => {
  test('should call getAll actions API', async () => {
    http.get.mockResolvedValueOnce([]);

    const result = await loadAllActions({ http });
    expect(result).toEqual([]);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/actions/connectors",
      ]
    `);
  });

  test('should filter out system actions', async () => {
    const apiResponseValue = [
      {
        id: '123',
        name: 'Test',
        connector_type_id: 'test',
        is_preconfigured: false,
        is_deprecated: false,
        referenced_by_count: 0,
        is_system_action: false,
      },
      {
        id: '456',
        name: 'System action',
        connector_type_id: 'system-action',
        is_preconfigured: false,
        is_deprecated: false,
        referenced_by_count: 0,
        is_system_action: true,
      },
    ];

    const resolvedValue = [
      {
        id: '123',
        name: 'Test',
        actionTypeId: 'test',
        isPreconfigured: false,
        isDeprecated: false,
        referencedByCount: 0,
        isSystemAction: false,
        isMissingSecrets: undefined,
      },
    ];

    http.get.mockResolvedValueOnce(apiResponseValue);

    const result = await loadAllActions({ http });
    expect(result).toEqual(resolvedValue);
  });
});
