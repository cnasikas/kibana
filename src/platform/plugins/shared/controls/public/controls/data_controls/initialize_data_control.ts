/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  first,
  map,
  merge,
  skip,
  switchMap,
  tap,
} from 'rxjs';

import {
  DATA_VIEW_SAVED_OBJECT_TYPE,
  DataView,
  DataViewField,
} from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';
import { StateComparators, SerializedPanelState } from '@kbn/presentation-publishing';

import { i18n } from '@kbn/i18n';
import type { DefaultDataControlState } from '../../../common';
import { dataViewsService } from '../../services/kibana_services';
import type { ControlGroupApi } from '../../control_group/types';
import {
  defaultControlComparators,
  initializeDefaultControlApi,
} from '../initialize_default_control_api';
import type { ControlApiInitialization, ControlStateManager } from '../types';
import { openDataControlEditor } from './open_data_control_editor';
import { getReferenceName } from './reference_name_utils';
import type { DataControlApi, DataControlFieldFormatter } from './types';

export const defaultDataControlComparators: StateComparators<DefaultDataControlState> = {
  ...defaultControlComparators,
  title: 'referenceEquality',
  dataViewId: 'referenceEquality',
  fieldName: 'referenceEquality',
};

export const initializeDataControl = <EditorState extends object = {}>(
  controlId: string,
  controlType: string,
  referenceNameSuffix: string,
  state: DefaultDataControlState,
  /**
   * `This state manager` should only include the state that the data control editor is
   * responsible for managing
   */
  editorStateManager: ControlStateManager<EditorState>,
  controlGroupApi: ControlGroupApi
): {
  api: Omit<ControlApiInitialization<DataControlApi>, 'hasUnsavedChanges$' | 'resetUnsavedChanges'>;
  cleanup: () => void;
  anyStateChange$: Observable<void>;
  setters: {
    onSelectionChange: () => void;
    setOutputFilter: (filter: Filter | undefined) => void;
  };
  stateManager: ControlStateManager<DefaultDataControlState>;
  getLatestState: () => SerializedPanelState<DefaultDataControlState>;
  reinitializeState: (lastSaved?: DefaultDataControlState) => void;
} => {
  const defaultControl = initializeDefaultControlApi(state);

  const title$ = new BehaviorSubject<string | undefined>(state.title);
  const defaultTitle$ = new BehaviorSubject<string | undefined>(undefined);
  const dataViewId = new BehaviorSubject<string>(state.dataViewId);
  const fieldName = new BehaviorSubject<string>(state.fieldName);
  const dataViews$ = new BehaviorSubject<DataView[] | undefined>(undefined);
  const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const filtersReady$ = new BehaviorSubject<boolean>(false);
  const field$ = new BehaviorSubject<DataViewField | undefined>(undefined);
  const fieldFormatter = new BehaviorSubject<DataControlFieldFormatter>((toFormat: any) =>
    String(toFormat)
  );

  const stateManager: ControlStateManager<DefaultDataControlState> = {
    ...defaultControl.stateManager,
    dataViewId,
    fieldName,
    title: title$,
  };

  const dataViewIdSubscription = dataViewId
    .pipe(
      tap(() => {
        filtersReady$.next(false);
        if (defaultControl.api.blockingError$.value) {
          defaultControl.api.setBlockingError(undefined);
        }
      }),
      switchMap(async (currentDataViewId) => {
        let dataView: DataView | undefined;
        try {
          dataView = await dataViewsService.get(currentDataViewId);
          return { dataView };
        } catch (error) {
          return { error };
        }
      })
    )
    .subscribe(({ dataView, error }) => {
      if (error) {
        defaultControl.api.setBlockingError(error);
      }
      dataViews$.next(dataView ? [dataView] : undefined);
    });

  const fieldNameSubscription = combineLatest([dataViews$, fieldName])
    .pipe(
      tap(() => {
        filtersReady$.next(false);
      })
    )
    .subscribe(([nextDataViews, nextFieldName]) => {
      const dataView = nextDataViews
        ? nextDataViews.find(({ id }) => dataViewId.value === id)
        : undefined;
      if (!dataView) {
        return;
      }

      const field = dataView.getFieldByName(nextFieldName);
      if (!field) {
        defaultControl.api.setBlockingError(
          new Error(
            i18n.translate('controls.dataControl.fieldNotFound', {
              defaultMessage: 'Could not locate field: {fieldName}',
              values: { fieldName: nextFieldName },
            })
          )
        );
      } else if (defaultControl.api.blockingError$.value) {
        defaultControl.api.setBlockingError(undefined);
      }

      field$.next(field);
      defaultTitle$.next(field ? field.displayName || field.name : nextFieldName);
      const spec = field?.toSpec();
      if (spec) {
        fieldFormatter.next(dataView.getFormatterForField(spec).getConverterFor('text'));
      }
    });

  const onEdit = async () => {
    // get the initial state from the state manager
    const mergedStateManager = {
      ...stateManager,
      ...editorStateManager,
    } as ControlStateManager<DefaultDataControlState & EditorState>;

    const initialState = (
      Object.keys(mergedStateManager) as Array<keyof DefaultDataControlState & EditorState>
    ).reduce((prev, key) => {
      return {
        ...prev,
        [key]: mergedStateManager[key]?.getValue(),
      };
    }, {} as DefaultDataControlState & EditorState);

    // open the editor to get the new state
    openDataControlEditor<DefaultDataControlState & EditorState>({
      onSave: ({ type: newType, state: newState }) => {
        if (newType === controlType) {
          // apply the changes from the new state via the state manager
          (Object.keys(initialState) as Array<keyof DefaultDataControlState & EditorState>).forEach(
            (key) => {
              if (!isEqual(mergedStateManager[key].getValue(), newState[key])) {
                mergedStateManager[key].next(
                  newState[key] as DefaultDataControlState & EditorState[typeof key]
                );
              }
            }
          );
        } else {
          // replace the control with a new one of the updated type
          controlGroupApi.replacePanel(controlId, {
            panelType: newType,
            serializedState: { rawState: newState },
          });
        }
      },
      initialState: {
        ...initialState,
      },
      controlType,
      controlId,
      initialDefaultPanelTitle: defaultTitle$.getValue(),
      controlGroupApi,
    });
  };

  const filtersReadySubscription = filters$.pipe(skip(1), debounceTime(0)).subscribe(() => {
    // Set filtersReady$.next(true); in filters$ subscription instead of setOutputFilter
    // to avoid signaling filters ready until after filters have been emitted
    // to avoid timing issues
    filtersReady$.next(true);
  });

  return {
    api: {
      ...defaultControl.api,
      title$,
      defaultTitle$,
      dataViews$,
      field$,
      fieldFormatter,
      onEdit,
      filters$,
      isEditingEnabled: () => true,
      untilFiltersReady: async () => {
        return new Promise((resolve) => {
          combineLatest([defaultControl.api.blockingError$, filtersReady$])
            .pipe(
              first(([blockingError, filtersReady]) => filtersReady || blockingError !== undefined)
            )
            .subscribe(() => {
              resolve();
            });
        });
      },
    },
    cleanup: () => {
      dataViewIdSubscription.unsubscribe();
      fieldNameSubscription.unsubscribe();
      filtersReadySubscription.unsubscribe();
    },
    anyStateChange$: merge(title$, dataViewId, fieldName).pipe(map(() => undefined)),
    setters: {
      onSelectionChange: () => {
        filtersReady$.next(false);
      },
      setOutputFilter: (newFilter: Filter | undefined) => {
        filters$.next(newFilter ? [newFilter] : undefined);
      },
    },
    stateManager,
    getLatestState: () => {
      return {
        rawState: {
          ...defaultControl.getLatestState().rawState,
          dataViewId: dataViewId.getValue(),
          fieldName: fieldName.getValue(),
          title: title$.getValue(),
        },
        references: [
          {
            name: getReferenceName(controlId, referenceNameSuffix),
            type: DATA_VIEW_SAVED_OBJECT_TYPE,
            id: dataViewId.getValue(),
          },
        ],
      };
    },
    reinitializeState: (lastSaved?: DefaultDataControlState) => {
      defaultControl.reinitializeState(lastSaved);
      title$.next(lastSaved?.title);
      dataViewId.next(lastSaved?.dataViewId ?? '');
      fieldName.next(lastSaved?.fieldName ?? '');
    },
  };
};
