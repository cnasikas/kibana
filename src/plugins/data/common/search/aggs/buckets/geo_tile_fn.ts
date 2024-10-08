/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { AggExpressionType, AggExpressionFunctionArgs, BUCKET_TYPES } from '..';

export const aggGeoTileFnName = 'aggGeoTile';

type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.GEOTILE_GRID>;

type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<
  typeof aggGeoTileFnName,
  Input,
  AggArgs,
  Output
>;

export const aggGeoTile = (): FunctionDefinition => ({
  name: aggGeoTileFnName,
  help: i18n.translate('data.search.aggs.function.buckets.geoTile.help', {
    defaultMessage: 'Generates a serialized agg config for a Geo Tile agg',
  }),
  type: 'agg_type',
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.geoTile.id.help', {
        defaultMessage: 'ID for this aggregation',
      }),
    },
    enabled: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('data.search.aggs.buckets.geoTile.enabled.help', {
        defaultMessage: 'Specifies whether this aggregation should be enabled',
      }),
    },
    schema: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.geoTile.schema.help', {
        defaultMessage: 'Schema to use for this aggregation',
      }),
    },
    field: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.aggs.buckets.geoTile.field.help', {
        defaultMessage: 'Field to use for this aggregation',
      }),
    },
    useGeocentroid: {
      types: ['boolean'],
      help: i18n.translate('data.search.aggs.buckets.geoTile.useGeocentroid.help', {
        defaultMessage: 'Specifies whether to use geocentroid for this aggregation',
      }),
    },
    precision: {
      types: ['number'],
      help: i18n.translate('data.search.aggs.buckets.geoTile.precision.help', {
        defaultMessage: 'Precision to use for this aggregation.',
      }),
    },
    json: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.geoTile.json.help', {
        defaultMessage: 'Advanced json to include when the agg is sent to Elasticsearch',
      }),
    },
    customLabel: {
      types: ['string'],
      help: i18n.translate('data.search.aggs.buckets.geoTile.customLabel.help', {
        defaultMessage: 'Represents a custom label for this aggregation',
      }),
    },
  },
  fn: (input, args) => {
    const { id, enabled, schema, ...rest } = args;

    return {
      type: 'agg_type',
      value: {
        id,
        enabled,
        schema,
        type: BUCKET_TYPES.GEOTILE_GRID,
        params: {
          ...rest,
        },
      },
    };
  },
});
