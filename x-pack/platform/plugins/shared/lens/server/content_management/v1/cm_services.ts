/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';

const apiError = schema.object({
  error: schema.string(),
  message: schema.string(),
  statusCode: schema.number(),
  metadata: schema.object({}, { unknowns: 'allow' }),
});

const referenceSchema = schema.object(
  {
    name: schema.maybe(schema.string()),
    type: schema.string(),
    id: schema.string(),
  },
  { unknowns: 'forbid' }
);

const referencesSchema = schema.arrayOf(referenceSchema);

export const lensAttributesSchema = schema.object(
  {
    title: schema.string(),
    description: schema.maybe(schema.nullable(schema.string())),
    visualizationType: schema.maybe(schema.string()),
    state: schema.maybe(schema.any()),
    uiStateJSON: schema.maybe(schema.string()),
    visState: schema.maybe(schema.string()),
    savedSearchRefName: schema.maybe(schema.string()),
  },
  { unknowns: 'forbid' }
);

export const lensSavedObjectSchema = schema.object(
  {
    id: schema.string(),
    type: schema.string(),
    version: schema.maybe(schema.string()),
    createdAt: schema.maybe(schema.string()),
    updatedAt: schema.maybe(schema.string()),
    error: schema.maybe(apiError),
    attributes: lensAttributesSchema,
    references: referencesSchema,
    namespaces: schema.maybe(schema.arrayOf(schema.string())),
    originId: schema.maybe(schema.string()),
  },
  { unknowns: 'allow' }
);

const lensGetResultSchema = schema.object(
  {
    item: lensSavedObjectSchema,
    meta: schema.object(
      {
        outcome: schema.oneOf([
          schema.literal('exactMatch'),
          schema.literal('aliasMatch'),
          schema.literal('conflict'),
        ]),
        aliasTargetId: schema.maybe(schema.string()),
        aliasPurpose: schema.maybe(
          schema.oneOf([
            schema.literal('savedObjectConversion'),
            schema.literal('savedObjectImport'),
          ])
        ),
      },
      { unknowns: 'forbid' }
    ),
  },
  { unknowns: 'forbid' }
);

export const lensCreateOptionsSchema = schema.object({
  overwrite: schema.maybe(schema.boolean()),
  references: schema.maybe(referencesSchema),
});

export const lensSearchOptionsSchema = schema.maybe(
  schema.object(
    {
      searchFields: schema.maybe(schema.arrayOf(schema.string())),
      types: schema.maybe(schema.arrayOf(schema.string())),
    },
    { unknowns: 'forbid' }
  )
);

const lensCreateResultSchema = schema.object(
  {
    item: lensSavedObjectSchema,
  },
  { unknowns: 'forbid' }
);

// Content management service definition.
// We need it for BWC support between different versions of the content
export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: lensGetResultSchema,
      },
    },
  },
  create: {
    in: {
      data: {
        schema: lensAttributesSchema,
      },
      options: {
        schema: lensCreateOptionsSchema,
      },
    },
    out: {
      result: {
        schema: lensCreateResultSchema,
      },
    },
  },
  update: {
    in: {
      data: {
        schema: lensAttributesSchema,
      },
      options: {
        schema: lensCreateOptionsSchema,
      },
    },
    out: {
      result: {
        schema: lensCreateResultSchema,
      },
    },
  },
  search: {
    in: {
      options: {
        schema: lensSearchOptionsSchema,
      },
    },
  },
};
