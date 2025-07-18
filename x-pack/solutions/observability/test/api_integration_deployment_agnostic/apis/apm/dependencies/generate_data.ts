/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export const dataConfig = {
  rate: 20,
  errorRate: 5,
  transaction: {
    name: 'GET /api/product/list',
    duration: 1000,
  },
  span: {
    name: 'GET apm-*/_search',
    type: 'db',
    subType: 'elasticsearch',
    destination: 'elasticsearch',
  },
};

export const NUMBER_OF_DEPENDENCIES_PER_SERVICE = 50;

export async function generateData({
  apmSynthtraceEsClient,
  start,
  end,
}: {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
  start: number;
  end: number;
}) {
  const instance = apm
    .service({ name: 'synth-go', environment: 'production', agentName: 'go' })
    .instance('instance-a');
  const { rate, transaction, span, errorRate } = dataConfig;

  const successfulEvents = timerange(start, end)
    .interval('1m')
    .rate(rate)
    .generator((timestamp) =>
      instance
        .transaction({ transactionName: transaction.name })
        .timestamp(timestamp)
        .duration(transaction.duration)
        .success()
        .children(
          ...Array.from({ length: NUMBER_OF_DEPENDENCIES_PER_SERVICE }, (_, i) =>
            instance
              .span({
                spanName: `${span.name} ${i + 1}`,
                spanType: span.type,
                spanSubtype: span.subType,
              })
              .duration(transaction.duration)
              .destination(`${span.destination}/${i + 1}`)
              .timestamp(timestamp)
          )
        )
    );

  const failureEvents = timerange(start, end)
    .interval('1m')
    .rate(errorRate)
    .generator((timestamp) =>
      instance
        .transaction({ transactionName: transaction.name })
        .timestamp(timestamp)
        .duration(transaction.duration)
        .failure()
        .children(
          instance
            .span({ spanName: span.name, spanType: span.type, spanSubtype: span.subType })
            .duration(transaction.duration)
            .failure()
            .destination(span.destination)
            .timestamp(timestamp)
        )
    );

  await apmSynthtraceEsClient.index([successfulEvents, failureEvents]);
}
