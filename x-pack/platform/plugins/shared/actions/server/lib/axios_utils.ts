/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObjectLike, isEmpty } from 'lodash';
import type {
  AxiosInstance,
  Method,
  AxiosResponse,
  AxiosRequestConfig,
  AxiosHeaderValue,
} from 'axios';
import { AxiosHeaders } from 'axios';
import type { Logger } from '@kbn/core/server';
import { getCustomAgents } from './get_custom_agents';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorUsageCollector, SSLSettings } from '../types';
import { combineHeadersWithBasicAuthHeader } from './get_basic_auth_header';

export const request = async <T = unknown>({
  axios,
  url,
  logger,
  method = 'get',
  data,
  configurationUtilities,
  headers,
  sslOverrides,
  timeout,
  connectorUsageCollector,
  ...config
}: {
  axios: AxiosInstance;
  url: string;
  logger: Logger;
  method?: Method;
  data?: T;
  configurationUtilities: ActionsConfigurationUtilities;
  headers?: Record<string, AxiosHeaderValue>;
  timeout?: number;
  sslOverrides?: SSLSettings;
  connectorUsageCollector?: ConnectorUsageCollector;
} & AxiosRequestConfig): Promise<AxiosResponse> => {
  if (!isEmpty(axios?.defaults?.baseURL ?? '')) {
    throw new Error(
      `Do not use "baseURL" in the creation of your axios instance because you will mostly break proxy`
    );
  }
  const { httpAgent, httpsAgent } = getCustomAgents(
    configurationUtilities,
    logger,
    url,
    sslOverrides
  );
  const { maxContentLength, timeout: settingsTimeout } =
    configurationUtilities.getResponseSettings();

  const { auth, ...restConfig } = config;

  const headersWithBasicAuth = combineHeadersWithBasicAuthHeader({
    username: auth?.username,
    password: auth?.password,
    headers,
  });

  try {
    const result = await axios(url, {
      ...restConfig,
      method,
      headers: headersWithBasicAuth,
      ...(data ? { data } : {}),
      // use httpAgent and httpsAgent and set axios proxy: false, to be able to handle fail on invalid certs
      httpAgent,
      httpsAgent,
      proxy: false,
      maxContentLength,
      timeout: Math.max(settingsTimeout, timeout ?? 0),
    });

    if (connectorUsageCollector) {
      connectorUsageCollector.addRequestBodyBytes(result, data);
    }

    return result;
  } catch (error) {
    if (connectorUsageCollector) {
      connectorUsageCollector.addRequestBodyBytes(error, data);
    }
    throw error;
  }
};

export const patch = async <T = unknown>({
  axios,
  url,
  data,
  logger,
  configurationUtilities,
  connectorUsageCollector,
}: {
  axios: AxiosInstance;
  url: string;
  data: T;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  connectorUsageCollector?: ConnectorUsageCollector;
}): Promise<AxiosResponse> => {
  return request({
    axios,
    url,
    logger,
    method: 'patch',
    data,
    configurationUtilities,
    connectorUsageCollector,
  });
};

export const addTimeZoneToDate = (date: string, timezone = 'GMT'): string => {
  return `${date} ${timezone}`;
};

export const getErrorMessage = (connector: string, msg: string) => {
  return `[Action][${connector}]: ${msg}`;
};

export const throwIfResponseIsNotValid = ({
  res,
  requiredAttributesToBeInTheResponse = [],
}: {
  res: AxiosResponse;
  requiredAttributesToBeInTheResponse?: string[];
}) => {
  const requiredContentType = 'application/json';
  const contentType = res.headers['content-type'] ?? 'undefined';
  const data = res.data;
  const statusCode = res.status;

  /**
   * Some external services may return a 204
   * status code but with unsupported content type like text/html.
   * To avoid throwing on valid requests we return.
   */
  if (statusCode === 204) {
    return;
  }

  /**
   * Check that the content-type of the response is application/json.
   * Then includes is added because the header can be application/json;charset=UTF-8.
   */
  if (!contentType.includes(requiredContentType)) {
    throw new Error(
      `Unsupported content type: ${contentType} in ${res.config.method} ${res.config.url}. Supported content types: ${requiredContentType}`
    );
  }

  /**
   * Check if the response is a JS object (data != null && typeof data === 'object')
   * in case the content type is application/json but for some reason the response is not.
   * Empty responses (204 No content) are ignored because the typeof data will be string and
   * isObjectLike will fail.
   * Axios converts automatically JSON to JS objects.
   */
  if (!isEmpty(data) && !isObjectLike(data)) {
    throw new Error('Response is not a valid JSON');
  }

  if (requiredAttributesToBeInTheResponse.length > 0) {
    const requiredAttributesError = new Error(
      `Response is missing at least one of the expected fields: ${requiredAttributesToBeInTheResponse.join(
        ','
      )}`
    );

    /**
     * If the response is an array and requiredAttributesToBeInTheResponse
     * are not empty then we thrown an error assuming that the consumer
     * expects an object response and not an array.
     */

    if (Array.isArray(data)) {
      throw requiredAttributesError;
    }

    requiredAttributesToBeInTheResponse.forEach((attr) => {
      // Check only for undefined as null is a valid value
      if (data[attr] === undefined) {
        throw requiredAttributesError;
      }
    });
  }
};

export const createAxiosResponse = (res: Partial<AxiosResponse>): AxiosResponse => ({
  data: {},
  status: 200,
  statusText: 'OK',
  headers: { ['content-type']: 'application/json' },
  config: {
    method: 'GET',
    url: 'https://example.com',
    headers: new AxiosHeaders(),
  },
  ...res,
});
