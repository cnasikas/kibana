/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '../../../common/types/domain';
import {
  alertComment,
  basicCase,
  basicCaseMetrics,
  caseUserActions,
  getAlertUserAction,
} from '../../containers/mock';
import type { CaseUI, UserActionUI } from '../../containers/types';
import type { CaseViewProps } from './types';

export const alertsHit = [
  {
    _id: 'alert-id-1',
    _index: 'alert-index-1',
    _source: {
      signal: {
        rule: {
          id: 'rule-id-1',
          name: 'Awesome rule',
        },
      },
    },
  },
  {
    _id: 'alert-id-2',
    _index: 'alert-index-2',
    _source: {
      signal: {
        rule: {
          id: 'rule-id-2',
          name: 'Awesome rule 2',
        },
      },
    },
  },
];

export const caseViewProps: CaseViewProps = {
  onComponentInitialized: jest.fn(),
  actionsNavigation: {
    href: jest.fn(),
    onClick: jest.fn(),
  },
  ruleDetailsNavigation: {
    href: jest.fn(),
    onClick: jest.fn(),
  },
  showAlertDetails: jest.fn(),
  useFetchAlertData: () => [
    false,
    {
      'alert-id-1': alertsHit[0],
      'alert-id-2': alertsHit[1],
    },
  ],
};

export const caseData: CaseUI = {
  ...basicCase,
  comments: [...basicCase.comments, alertComment],
  connector: {
    id: 'resilient-2',
    name: 'Resilient',
    type: ConnectorTypes.resilient,
    fields: null,
  },
};
export const defaultGetCase = {
  isLoading: false,
  isError: false,
  data: {
    case: caseData,
    outcome: 'exactMatch',
  },
  refetch: jest.fn(),
};

export const defaultGetCaseMetrics = {
  isLoading: false,
  isError: false,
  data: {
    metrics: basicCaseMetrics,
  },
  refetch: jest.fn(),
};

export const defaultUpdateCaseState = {
  isLoading: false,
  isError: false,
  updateKey: null,
  mutate: jest.fn(),
};

const generateLatestAttachments = ({
  userActions,
  overrides,
}: {
  userActions: UserActionUI[];
  overrides: Array<{ commentId: string; comment: string }>;
}) => {
  return userActions
    .filter(
      (
        userAction
      ): userAction is UserActionUI & {
        type: 'comment';
        payload: { comment: { comment: string } };
      } => userAction.type === 'comment' && Boolean(userAction.commentId)
    )
    .map((userAction) => {
      const override = overrides.find(({ commentId }) => commentId === userAction.commentId);
      return {
        comment: override ? override.comment : userAction.payload.comment?.comment,
        createdAt: userAction.createdAt,
        createdBy: userAction.createdBy,
        id: userAction.commentId,
        owner: userAction.owner,
        pushed_at: null,
        pushed_by: null,
        type: 'user',
        updated_at: null,
        updated_by: null,
        version: userAction.version,
      };
    });
};

export const defaultUseFindCaseUserActions = {
  data: {
    total: 4,
    perPage: 10,
    page: 1,
    userActions: [...caseUserActions, getAlertUserAction()],
    latestAttachments: generateLatestAttachments({
      userActions: [...caseUserActions, getAlertUserAction()],
      overrides: [{ commentId: 'basic-comment-id', comment: 'Solve this fast!' }],
    }),
  },
  refetch: jest.fn(),
  isLoading: false,
  isFetching: false,
  isError: false,
};

export const defaultInfiniteUseFindCaseUserActions = {
  data: {
    pages: [
      {
        total: 4,
        perPage: 10,
        page: 1,
        userActions: [...caseUserActions, getAlertUserAction()],
        latestAttachments: [],
      },
    ],
  },
  isLoading: false,
  isFetching: false,
  isError: false,
  hasNextPage: false,
  fetchNextPage: jest.fn(),
};
