/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { EuiBasicTableColumn, EuiTableSelectionType } from '@elastic/eui';
import {
  useEuiTheme,
  useEuiBackgroundColor,
  EuiInMemoryTable,
  EuiButtonIcon,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import type { Action } from '@elastic/eui/src/components/basic_table/action_types';

import { i18n } from '@kbn/i18n';
import type { UseTableState } from '@kbn/ml-in-memory-table';

import { css } from '@emotion/react';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';

import { MiniHistogram } from '../../mini_histogram';

import type { EventRate } from '../use_categorize_request';

import { ExpandedRow } from './expanded_row';
import { FormattedPatternExamples, FormattedTokens } from '../format_category';

interface Props {
  categories: Category[];
  eventRate: EventRate;
  mouseOver?: {
    pinnedCategory: Category | null;
    setPinnedCategory: (category: Category | null) => void;
    highlightedCategory: Category | null;
    setHighlightedCategory: (category: Category | null) => void;
  };
  setSelectedCategories: (category: Category[]) => void;
  tableState: UseTableState<Category>;
  actions: Array<Action<Category>>;
  enableRowActions?: boolean;
  displayExamples?: boolean;
  selectable?: boolean;
  onRenderComplete?: () => void;
}

export const CategoryTable: FC<Props> = ({
  categories,
  eventRate,
  mouseOver,
  setSelectedCategories,
  tableState,
  actions,
  enableRowActions = true,
  displayExamples = true,
  selectable = true,
  onRenderComplete,
}) => {
  const { euiTheme } = useEuiTheme();
  const primaryBackgroundColor = useEuiBackgroundColor('primary');
  const { onTableChange, pagination, sorting } = tableState;

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );

  const showSparkline = useMemo(() => {
    return categories.some((category) => category.sparkline !== undefined);
  }, [categories]);

  const toggleDetails = useCallback(
    (category: Category) => {
      const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
      if (itemIdToExpandedRowMapValues[category.key]) {
        delete itemIdToExpandedRowMapValues[category.key];
      } else {
        itemIdToExpandedRowMapValues[category.key] = (
          <ExpandedRow category={category} displayExamples={displayExamples} />
        );
      }
      setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
    },
    [displayExamples, itemIdToExpandedRowMap]
  );

  const columns: Array<EuiBasicTableColumn<Category>> = [
    {
      align: 'left',
      width: '40px',
      isExpander: true,
      render: (item: Category) => (
        <EuiButtonIcon
          data-test-subj="aiopsLogPatternsColumnsButton"
          onClick={() => toggleDetails(item)}
          aria-label={
            itemIdToExpandedRowMap[item.key]
              ? i18n.translate('xpack.aiops.logCategorization.column.collapseRow', {
                  defaultMessage: 'Collapse',
                })
              : i18n.translate('xpack.aiops.logCategorization.column.expandRow', {
                  defaultMessage: 'Expand',
                })
          }
          iconType={itemIdToExpandedRowMap[item.key] ? 'arrowDown' : 'arrowRight'}
        />
      ),
      'data-test-subj': 'aiopsLogPatternsExpandRowToggle',
    },
    {
      field: 'count',
      name: i18n.translate('xpack.aiops.logCategorization.column.count', {
        defaultMessage: 'Count',
      }),
      sortable: true,
      width: '80px',
    },
    {
      name: i18n.translate('xpack.aiops.logCategorization.column.examples', {
        defaultMessage: 'Examples',
      }),
      sortable: true,
      render: (item: Category) => <FormattedPatternExamples category={item} count={1} />,
    },
    {
      name: i18n.translate('xpack.aiops.logCategorization.column.actions', {
        defaultMessage: 'Actions',
      }),
      sortable: false,
      width: '65px',
      actions,
    },
  ] as Array<EuiBasicTableColumn<Category>>;

  if (displayExamples === false) {
    // on the rare occasion that examples are not available, replace the examples column with tokens
    columns.splice(2, 1, {
      name: (
        <EuiToolTip
          position="top"
          content={i18n.translate('xpack.aiops.logCategorization.column.tokens.tooltip', {
            defaultMessage:
              'If the selected field is an alias, example documents cannot be displayed. Showing pattern tokens instead.',
          })}
        >
          <>
            {i18n.translate('xpack.aiops.logCategorization.column.tokens', {
              defaultMessage: 'Tokens',
            })}
            <EuiIcon size="s" color="subdued" type="question" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (item: Category) => <FormattedTokens category={item} count={1} />,
    });
  }

  if (showSparkline === true) {
    columns.splice(2, 0, {
      field: 'sparkline',
      name: i18n.translate('xpack.aiops.logCategorization.column.logRate', {
        defaultMessage: 'Log rate',
      }),
      sortable: false,
      width: '100px',
      render: (sparkline: Category['sparkline']) => {
        if (sparkline === undefined) {
          return null;
        }
        const histogram = eventRate.map(({ key: catKey, docCount }) => {
          const term = sparkline[catKey] ?? 0;
          const newTerm = term > docCount ? docCount : term;
          const adjustedDocCount = docCount - newTerm;

          return {
            doc_count_overall: adjustedDocCount,
            doc_count_significant_item: newTerm,
            key: catKey,
            key_as_string: `${catKey}`,
          };
        });

        return (
          <MiniHistogram
            chartData={histogram}
            isLoading={categories === null && histogram === undefined}
            label={''}
          />
        );
      },
    });
  }

  const selectionValue: EuiTableSelectionType<Category> | undefined = selectable
    ? {
        selectable: () => true,
        onSelectionChange: (selectedItems) => setSelectedCategories(selectedItems),
      }
    : undefined;

  const getRowStyle = (category: Category) => {
    if (mouseOver === undefined) {
      return {};
    }

    if (
      mouseOver.pinnedCategory &&
      mouseOver.pinnedCategory.key === category.key &&
      mouseOver.pinnedCategory.key === category.key
    ) {
      return {
        backgroundColor: primaryBackgroundColor,
      };
    }

    if (mouseOver.highlightedCategory && mouseOver.highlightedCategory.key === category.key) {
      return {
        backgroundColor: euiTheme.colors.lightestShade,
      };
    }

    return {
      backgroundColor: euiTheme.colors.emptyShade,
    };
  };

  const tableStyle = css({
    thead: {
      position: 'sticky',
      insetBlockStart: 0,
      zIndex: 1,
      backgroundColor: euiTheme.colors.emptyShade,
      boxShadow: `inset 0 0px 0, inset 0 -1px 0 ${euiTheme.border.color}`,
    },
  });

  const chartWrapperRef = useRef<HTMLDivElement>(null);

  const renderCompleteListener = useCallback(
    (event: Event) => {
      if (event.target !== chartWrapperRef.current) {
        return;
      }
      if (typeof onRenderComplete === 'function') {
        onRenderComplete();
      }
    },
    [onRenderComplete]
  );

  useEffect(() => {
    if (!chartWrapperRef.current) {
      throw new Error('Reference to the chart wrapper is not set');
    }
    const chartWrapper = chartWrapperRef.current;
    chartWrapper.addEventListener('renderComplete', renderCompleteListener);
    return () => {
      chartWrapper.removeEventListener('renderComplete', renderCompleteListener);
    };
  }, [renderCompleteListener]);

  return (
    <div ref={chartWrapperRef}>
      <EuiInMemoryTable<Category>
        compressed
        items={categories}
        columns={columns}
        selection={selectionValue}
        itemId="key"
        onTableChange={onTableChange}
        pagination={pagination}
        sorting={sorting}
        data-test-subj="aiopsLogPatternsTable"
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        css={tableStyle}
        rowProps={(category) => {
          return mouseOver
            ? {
                onClick: () => {
                  if (category.key === mouseOver.pinnedCategory?.key) {
                    mouseOver.setPinnedCategory(null);
                  } else {
                    mouseOver.setPinnedCategory(category);
                  }
                },
                onMouseEnter: () => {
                  mouseOver.setHighlightedCategory(category);
                },
                onMouseLeave: () => {
                  mouseOver.setHighlightedCategory(null);
                },
                style: getRowStyle(category),
              }
            : undefined;
        }}
      />
    </div>
  );
};
