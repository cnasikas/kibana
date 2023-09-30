/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorsInformationMockResponse } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { getConnectors } from './connectors';
import { CaseStatuses, UserActionActions, UserActionTypes } from '../../../common/types/domain';

describe('connectors', () => {
  const latestUserAction = {
    type: 'cases-user-actions',
    id: 'mock-user-action',
    attributes: {
      payload: { status: CaseStatuses['in-progress'] },
      type: UserActionTypes.status,
      created_at: '2023-09-30T07:59:34.148Z',
      created_by: {
        username: 'elastic',
        full_name: null,
        email: null,
      },
      owner: 'cases',
      action: UserActionActions.update,
      comment_id: null,
    },
    references: [{ type: 'cases', name: 'associated-cases', id: 'mock-id-1' }],
    updated_at: '2023-09-30T07:59:34.170Z',
    created_at: '2023-09-30T07:59:34.170Z',
    version: 'WzEwNSwyXQ==',
  };

  const connectors = [
    {
      id: 'mock-connector-1',
      actionTypeId: '.jira',
      name: 'Jira',
      isMissingSecrets: false,
      config: { apiUrl: 'https://example.com', projectKey: 'ROC' },
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false,
    },
  ];

  const latestUserActions = new Map([[latestUserAction.attributes.type, latestUserAction]]);
  const connectorFieldsForPushes = new Map();

  const clientArgs = createCasesClientMockArgs();
  clientArgs.services.userActionService.getCaseConnectorInformation.mockResolvedValue(
    connectorsInformationMockResponse
  );

  clientArgs.services.userActionService.getMostRecentUserActions.mockResolvedValue(
    latestUserActions
  );

  clientArgs.services.userActionService.getConnectorFieldsBeforeLatestPush.mockResolvedValue(
    connectorFieldsForPushes
  );
  clientArgs.actionsClient.getBulk.mockResolvedValue(connectors);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConnectors', () => {
    it('returns the connectors correctly', async () => {
      const res = await getConnectors({ caseId: 'test-case-id' }, clientArgs);
      expect(res).toMatchInlineSnapshot(`
        Object {
          "mock-connector-1": Object {
            "fields": Object {
              "issueType": "10006",
              "parent": null,
              "priority": "High",
            },
            "id": "mock-connector-1",
            "name": "Jira",
            "push": Object {
              "hasBeenPushed": false,
              "needsToBePushed": true,
            },
            "type": ".jira",
          },
        }
      `);
    });
  });
});
