/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import type { DocLinksServiceSetup, UiSettingsParams } from '@kbn/core/server';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  DEFAULT_COLUMNS_SETTING,
  SAMPLE_SIZE_SETTING,
  SAMPLE_ROWS_PER_PAGE_SETTING,
  SORT_DEFAULT_ORDER_SETTING,
  SEARCH_ON_PAGE_LOAD_SETTING,
  DOC_HIDE_TIME_COLUMN_SETTING,
  FIELDS_LIMIT_SETTING,
  CONTEXT_DEFAULT_SIZE_SETTING,
  CONTEXT_STEP_SETTING,
  CONTEXT_TIE_BREAKER_FIELDS_SETTING,
  MODIFY_COLUMNS_ON_SWITCH,
  MAX_DOC_FIELDS_DISPLAYED,
  SHOW_MULTIFIELDS,
  SHOW_FIELD_STATISTICS,
  ROW_HEIGHT_OPTION,
} from '@kbn/discover-utils';
import { DEFAULT_ROWS_PER_PAGE, ROWS_PER_PAGE_OPTIONS } from '../common/constants';

export const getUiSettings: (
  docLinks: DocLinksServiceSetup,
  enableValidations: boolean
) => Record<string, UiSettingsParams> = (
  docLinks: DocLinksServiceSetup,
  enableValidations: boolean
) => ({
  [DEFAULT_COLUMNS_SETTING]: {
    name: i18n.translate('discover.advancedSettings.defaultColumnsTitle', {
      defaultMessage: 'Default columns',
    }),
    value: [],
    description: i18n.translate('discover.advancedSettings.defaultColumnsText', {
      defaultMessage:
        'Columns displayed by default in the Discover app. If empty, a summary of the document will be displayed.',
    }),
    category: ['discover'],
    schema: enableValidations
      ? schema.arrayOf(schema.string(), { maxSize: 50 })
      : schema.arrayOf(schema.string()),
  },
  [MAX_DOC_FIELDS_DISPLAYED]: {
    name: i18n.translate('discover.advancedSettings.maxDocFieldsDisplayedTitle', {
      defaultMessage: 'Maximum document fields displayed',
    }),
    value: 200,
    description: i18n.translate('discover.advancedSettings.maxDocFieldsDisplayedText', {
      defaultMessage: 'Maximum number of fields rendered in the document summary',
    }),
    category: ['discover'],
    schema: schema.number(),
  },
  [SAMPLE_SIZE_SETTING]: {
    name: i18n.translate('discover.advancedSettings.sampleSizeTitle', {
      defaultMessage: 'Maximum rows per table',
    }),
    value: 500,
    description: i18n.translate('discover.advancedSettings.sampleSizeText', {
      defaultMessage: 'Sets the maximum number of rows for the entire document table.',
    }),
    category: ['discover'],
    schema: schema.number(),
  },
  [SAMPLE_ROWS_PER_PAGE_SETTING]: {
    name: i18n.translate('discover.advancedSettings.sampleRowsPerPageTitle', {
      defaultMessage: 'Rows per page',
    }),
    value: DEFAULT_ROWS_PER_PAGE,
    options: ROWS_PER_PAGE_OPTIONS,
    type: 'select',
    description: i18n.translate('discover.advancedSettings.sampleRowsPerPageText', {
      defaultMessage: 'Limits the number of rows per page in the document table.',
    }),
    category: ['discover'],
    schema: schema.number(),
  },
  [SORT_DEFAULT_ORDER_SETTING]: {
    name: i18n.translate('discover.advancedSettings.sortDefaultOrderTitle', {
      defaultMessage: 'Default sort direction',
    }),
    value: 'desc',
    options: ['desc', 'asc'],
    optionLabels: {
      desc: i18n.translate('discover.advancedSettings.sortOrderDesc', {
        defaultMessage: 'Descending',
      }),
      asc: i18n.translate('discover.advancedSettings.sortOrderAsc', {
        defaultMessage: 'Ascending',
      }),
    },
    type: 'select',
    description: i18n.translate('discover.advancedSettings.sortDefaultOrderText', {
      defaultMessage:
        'Controls the default sort direction for time based data views in the Discover app.',
    }),
    category: ['discover'],
    schema: schema.oneOf([schema.literal('desc'), schema.literal('asc')]),
  },
  [SEARCH_ON_PAGE_LOAD_SETTING]: {
    name: i18n.translate('discover.advancedSettings.searchOnPageLoadTitle', {
      defaultMessage: 'Search on page load',
    }),
    value: true,
    type: 'boolean',
    description: i18n.translate('discover.advancedSettings.searchOnPageLoadText', {
      defaultMessage:
        'Controls whether a search is executed when Discover first loads. This setting does not ' +
        'have an effect when loading a Discover session.',
    }),
    category: ['discover'],
    schema: schema.boolean(),
  },
  [DOC_HIDE_TIME_COLUMN_SETTING]: {
    name: i18n.translate('discover.advancedSettings.docTableHideTimeColumnTitle', {
      defaultMessage: "Hide 'Time' column",
    }),
    value: false,
    description: i18n.translate('discover.advancedSettings.docTableHideTimeColumnText', {
      defaultMessage:
        "Hide the 'Time' column in Discover and in all Discover session panels on Dashboards.",
    }),
    category: ['discover'],
    schema: schema.boolean(),
  },
  [FIELDS_LIMIT_SETTING]: {
    name: i18n.translate('discover.advancedSettings.fieldsPopularLimitTitle', {
      defaultMessage: 'Popular fields limit',
    }),
    value: 10,
    description: i18n.translate('discover.advancedSettings.fieldsPopularLimitText', {
      defaultMessage: 'The top N most popular fields to show',
    }),
    schema: schema.number(),
  },
  [CONTEXT_DEFAULT_SIZE_SETTING]: {
    name: i18n.translate('discover.advancedSettings.context.defaultSizeTitle', {
      defaultMessage: 'Context size',
    }),
    value: 5,
    description: i18n.translate('discover.advancedSettings.context.defaultSizeText', {
      defaultMessage: 'The number of surrounding entries to show in the context view',
    }),
    category: ['discover'],
    schema: schema.number(),
  },
  [CONTEXT_STEP_SETTING]: {
    name: i18n.translate('discover.advancedSettings.context.sizeStepTitle', {
      defaultMessage: 'Context size step',
    }),
    value: 5,
    description: i18n.translate('discover.advancedSettings.context.sizeStepText', {
      defaultMessage: 'The step size to increment or decrement the context size by',
    }),
    category: ['discover'],
    schema: schema.number(),
  },
  [CONTEXT_TIE_BREAKER_FIELDS_SETTING]: {
    name: i18n.translate('discover.advancedSettings.context.tieBreakerFieldsTitle', {
      defaultMessage: 'Tie breaker fields',
    }),
    value: ['_doc'],
    description: i18n.translate('discover.advancedSettings.context.tieBreakerFieldsText', {
      defaultMessage:
        'A comma-separated list of fields to use for tie-breaking between documents that have the same timestamp value. ' +
        'From this list the first field that is present and sortable in the current data view is used.',
    }),
    category: ['discover'],
    schema: schema.arrayOf(schema.string()),
  },
  [MODIFY_COLUMNS_ON_SWITCH]: {
    name: i18n.translate('discover.advancedSettings.discover.modifyColumnsOnSwitchTitle', {
      defaultMessage: 'Modify columns when changing data views',
    }),
    value: true,
    description: i18n.translate('discover.advancedSettings.discover.modifyColumnsOnSwitchText', {
      defaultMessage: 'Remove columns that are not available in the new data view.',
    }),
    category: ['discover'],
    schema: schema.boolean(),
    metric: {
      type: METRIC_TYPE.CLICK,
      name: 'discover:modifyColumnsOnSwitchTitle',
    },
  },
  [SHOW_FIELD_STATISTICS]: {
    name: i18n.translate('discover.advancedSettings.discover.showFieldStatistics', {
      defaultMessage: 'Show field statistics',
    }),
    description: i18n.translate(
      'discover.advancedSettings.discover.showFieldStatisticsDescription',
      {
        defaultMessage: `Enable the {fieldStatisticsDocs} to show details such as the minimum and maximum values of a numeric field or a map of a geo field. This functionality is in beta and is subject to change.`,
        values: {
          fieldStatisticsDocs:
            `<a href=${docLinks.links.discover.fieldStatistics}
            target="_blank" rel="noopener">` +
            i18n.translate('discover.advancedSettings.discover.fieldStatisticsLinkText', {
              defaultMessage: 'Field statistics view',
            }) +
            '</a>',
        },
      }
    ),
    value: true,
    category: ['discover'],
    schema: schema.boolean(),
    metric: {
      type: METRIC_TYPE.CLICK,
      name: 'discover:showFieldStatistics',
    },
  },
  [SHOW_MULTIFIELDS]: {
    name: i18n.translate('discover.advancedSettings.discover.showMultifields', {
      defaultMessage: 'Show multi-fields',
    }),
    description: i18n.translate('discover.advancedSettings.discover.showMultifieldsDescription', {
      defaultMessage: `Controls whether {multiFields} display in the expanded document view. In most cases, multi-fields are the same as the original field. This option is only available when \`searchFieldsFromSource\` is off.`,
      values: {
        multiFields:
          `<a href=${docLinks.links.elasticsearch.mappingMultifields}
            target="_blank" rel="noopener">` +
          i18n.translate('discover.advancedSettings.discover.multiFieldsLinkText', {
            defaultMessage: 'multi-fields',
          }) +
          '</a>',
      },
    }),
    value: false,
    category: ['discover'],
    schema: schema.boolean(),
  },
  [ROW_HEIGHT_OPTION]: {
    name: i18n.translate('discover.advancedSettings.params.rowHeightTitle', {
      defaultMessage: 'Row height in the Document Explorer',
    }),
    value: 3,
    category: ['discover'],
    description: i18n.translate('discover.advancedSettings.params.rowHeightText', {
      defaultMessage:
        'The number of lines to allow in a row. A value of -1 automatically adjusts the row height to fit the contents. A value of 0 displays the content in a single line.',
    }),
    schema: schema.number({ min: -1 }),
  },
});
