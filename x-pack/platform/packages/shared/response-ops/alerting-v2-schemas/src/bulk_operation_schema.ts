/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

import {
  BULK_FILTER_MAX_RULES,
  BULK_QUERY_SAMPLE_SIZE,
  ID_MAX_LENGTH,
  MAX_BULK_ITEMS,
  MAX_KQL_LENGTH,
  MAX_SEARCH_LENGTH,
} from './constants';

export const bulkByIdsSchema = z
  .object({
    ids: z
      .array(z.string().min(1).max(ID_MAX_LENGTH))
      .min(1)
      .max(MAX_BULK_ITEMS)
      .describe('Explicit list of IDs to operate on.'),
  })
  .strict();

export type BulkByIdsParams = z.infer<typeof bulkByIdsSchema>;

export const bulkByQuerySchema = z
  .object({
    filter: z
      .string()
      .max(MAX_KQL_LENGTH)
      .optional()
      .describe(
        `KQL filter string to match rules. At most ${BULK_FILTER_MAX_RULES} matching rules are processed per request.`
      ),
    search: z
      .string()
      .max(MAX_SEARCH_LENGTH)
      .optional()
      .describe('Free-text search string to match rules by name and description.'),
    match_all: z
      .literal(true)
      .optional()
      .describe('When true, targets every rule. Requires an explicit opt-in. Omitted by default.'),
    force: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'When true, executes the operation. When false (default), returns a dry-run preview with `match_count` and a `sample` of matching rule IDs so the client can verify before committing.'
      ),
  })
  .strict()
  .refine((data) => data.filter != null || data.search != null || data.match_all === true, {
    message: 'At least one of filter, search, or match_all must be provided.',
  });

// Use `z.input` so `force` (which has a `.default(false)`) is optional at the
// call site. The server applies the default via the route's Zod parser.
export type BulkByQueryParams = z.input<typeof bulkByQuerySchema>;

/**
 * Error shape for a single rule that failed inside a bulk operation.
 * `code` is a stable, machine-readable identifier
 * (e.g. `RULE_NOT_FOUND`, `RULE_VERSION_CONFLICT`). See the alerting v2
 * error-code catalog on the server for the canonical list.
 */
const bulkErrorSchema = z.object({
  id: z.string().describe('The identifier of the rule that failed.'),
  error: z.object({
    code: z.string().describe('Stable, machine-readable error code (e.g. RULE_NOT_FOUND).'),
    message: z.string().describe('Human-readable error message.'),
  }),
});

/**
 * Response shape for an executed bulk operation. Identical across
 * bulk routes and the executed
 * (`force: true`) variant of each by-query endpoint.
 */
export const bulkResponseSchema = z
  .object({
    affected_count: z
      .number()
      .int()
      .nonnegative()
      .describe('Number of rules the operation successfully touched.'),
    errors: z.array(bulkErrorSchema).describe('Errors encountered during the operation.'),
  })
  .describe('Result of an executed bulk rule operation.');

export type BulkResponse = z.infer<typeof bulkResponseSchema>;

/**
 * Response shape for the dry-run (default) mode of the by-query endpoints.
 * Callers can inspect `match_count` and `sample` to confirm the query
 * targets the intended rules before re-sending with `force: true`.
 */
export const dryRunResponseSchema = z
  .object({
    match_count: z
      .number()
      .int()
      .nonnegative()
      .describe('Total number of rules matching the query.'),
    sample: z
      .array(z.string())
      .max(BULK_QUERY_SAMPLE_SIZE)
      .describe(
        `Sample of matching rule IDs (up to ${BULK_QUERY_SAMPLE_SIZE}) for spot-checking before executing.`
      ),
  })
  .describe('Dry-run preview returned by a by-query bulk endpoint when `force` is false.');

export type DryRunResponse = z.infer<typeof dryRunResponseSchema>;

/** Union of dry-run and executed responses returned by the by-query endpoints. */
export const bulkByQueryResultSchema = z.union([dryRunResponseSchema, bulkResponseSchema]);

export type BulkByQueryResult = z.infer<typeof bulkByQueryResultSchema>;
