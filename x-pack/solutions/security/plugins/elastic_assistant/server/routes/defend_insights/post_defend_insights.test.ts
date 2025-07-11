/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { DefendInsightsPostRequestBody } from '@kbn/elastic-assistant-common';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { DefendInsightStatus, DefendInsightType } from '@kbn/elastic-assistant-common';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import type { DefendInsightsDataClient } from '../../lib/defend_insights/persistence';
import { serverMock } from '../../__mocks__/server';
import {
  ElasticAssistantRequestHandlerContextMock,
  requestContextMock,
} from '../../__mocks__/request_context';
import { transformESSearchToDefendInsights } from '../../lib/defend_insights/persistence/helpers';
import { getDefendInsightsSearchEsMock } from '../../__mocks__/defend_insights_schema.mock';
import { postDefendInsightsRequest } from '../../__mocks__/request';
import { createDefendInsight, isDefendInsightsEnabled, invokeDefendInsightsGraph } from './helpers';
import { postDefendInsightsRoute } from './post_defend_insights';

jest.mock('@kbn/security-ai-prompts');
jest.mock('./helpers');

describe('postDefendInsightsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ElasticAssistantRequestHandlerContextMock;
  let mockUser: AuthenticatedUser;
  let mockDataClient: DefendInsightsDataClient;
  let mockApiConfig: any;
  let mockRequestBody: DefendInsightsPostRequestBody;
  let mockCurrentInsight: any;

  function getDefaultUser(): AuthenticatedUser {
    return {
      username: 'my_username',
      authentication_realm: {
        type: 'my_realm_type',
        name: 'my_realm_name',
      },
    } as AuthenticatedUser;
  }

  function getDefaultDataClient(): DefendInsightsDataClient {
    return {
      findDefendInsightsByParams: jest.fn().mockResolvedValueOnce(mockCurrentInsight),
      updateDefendInsight: jest.fn(),
      createDefendInsight: jest.fn(),
    } as unknown as DefendInsightsDataClient;
  }

  function getDefaultApiConfig() {
    return {
      connectorId: 'connector-id',
      actionTypeId: '.bedrock',
      model: 'model',
      provider: OpenAiProviderType.OpenAi,
    };
  }

  function getDefaultRequestBody(): DefendInsightsPostRequestBody {
    return {
      endpointIds: [],
      insightType: DefendInsightType.Enum.incompatible_antivirus,
      subAction: 'invokeAI',
      apiConfig: mockApiConfig,
      anonymizationFields: [],
      replacements: {},
      model: 'gpt-4',
      langSmithProject: 'langSmithProject',
      langSmithApiKey: 'langSmithApiKey',
    };
  }

  beforeEach(() => {
    const tools = requestContextMock.createTools();
    context = tools.context;
    server = serverMock.create();
    tools.clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

    mockCurrentInsight = transformESSearchToDefendInsights(getDefendInsightsSearchEsMock())[0];
    mockCurrentInsight.status = DefendInsightStatus.Enum.running;

    mockUser = getDefaultUser();
    mockDataClient = getDefaultDataClient();
    mockApiConfig = getDefaultApiConfig();
    mockRequestBody = getDefaultRequestBody();
    (createDefendInsight as jest.Mock).mockResolvedValue({
      currentInsight: mockCurrentInsight,
      defendInsightId: mockCurrentInsight.id,
    });
    (isDefendInsightsEnabled as jest.Mock).mockResolvedValue(true);
    (invokeDefendInsightsGraph as jest.Mock).mockResolvedValue({
      anonymizedEvents: [],
      insights: [mockCurrentInsight],
    });

    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
    context.elasticAssistant.getDefendInsightsDataClient.mockResolvedValue(mockDataClient);
    context.elasticAssistant.actions = actionsMock.createStart();

    postDefendInsightsRoute(server.router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Insufficient license', async () => {
    const insufficientLicense = licensingMock.createLicense({ license: { type: 'basic' } });
    const tools = requestContextMock.createTools();
    tools.context.licensing.license = insufficientLicense;
    jest.spyOn(insufficientLicense, 'hasAtLeast').mockReturnValue(false);

    const response = await server.inject(
      postDefendInsightsRequest(mockRequestBody),
      requestContextMock.convertContext(tools.context)
    );
    expect(response.status).toEqual(403);
    expect(response.body).toEqual({
      message: 'Your license does not support Defend Workflows. Please upgrade your license.',
    });
  });

  it('should handle successful request', async () => {
    const response = await server.inject(
      postDefendInsightsRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(mockCurrentInsight);
  });

  it('should handle missing authenticated user', async () => {
    context.elasticAssistant.getCurrentUser.mockResolvedValueOnce(null);
    const response = await server.inject(
      postDefendInsightsRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(401);
    expect(response.body).toEqual({
      message: 'Authenticated user not found',
      status_code: 401,
    });
  });

  it('should handle missing data client', async () => {
    context.elasticAssistant.getDefendInsightsDataClient.mockResolvedValueOnce(null);
    const response = await server.inject(
      postDefendInsightsRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'Defend insights data client not initialized',
      status_code: 500,
    });
  });

  it('should 404 if feature flag disabled', async () => {
    (isDefendInsightsEnabled as jest.Mock).mockReturnValueOnce(false);
    const response = await server.inject(
      postDefendInsightsRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(404);
  });

  it('should handle createDefendInsight error', async () => {
    (createDefendInsight as jest.Mock).mockRejectedValueOnce(new Error('Oh no!'));
    const response = await server.inject(
      postDefendInsightsRequest(mockRequestBody),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: {
        error: 'Oh no!',
        success: false,
      },
      status_code: 500,
    });
  });

  describe('runExternalCallbacks', () => {
    it('should handle error thrown by runExternalCallbacks', async () => {
      const runExternalCallbacks = jest.requireMock('./helpers').runExternalCallbacks as jest.Mock;
      runExternalCallbacks.mockRejectedValueOnce(new Error('External callback failed'));

      const response = await server.inject(
        postDefendInsightsRequest(mockRequestBody),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: {
          error: 'External callback failed',
          success: false,
        },
        status_code: 500,
      });

      expect(createDefendInsight).not.toHaveBeenCalled();
    });
  });
});
