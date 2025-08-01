/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlPanelsState, DefaultDataControlState } from '../../common';
import type { DefaultControlApi } from '../controls/types';
import { getLastUsedDataViewId, initControlsManager } from './init_controls_manager';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('delta'),
}));

describe('PresentationContainer api', () => {
  const intialControlsState = {
    alpha: { type: 'testControl', order: 0 },
    bravo: { type: 'testControl', order: 1 },
    charlie: { type: 'testControl', order: 2 },
  };

  test('addNewPanel should add control at end of controls', async () => {
    const controlsManager = initControlsManager(intialControlsState);
    const addNewPanelPromise = controlsManager.api.addNewPanel({
      panelType: 'testControl',
      serializedState: { rawState: {} },
    });
    controlsManager.setControlApi('delta', {} as unknown as DefaultControlApi);
    await addNewPanelPromise;
    expect(controlsManager.controlsInOrder$.value.map((element) => element.id)).toEqual([
      'alpha',
      'bravo',
      'charlie',
      'delta',
    ]);
  });

  test('removePanel should remove control', () => {
    const controlsManager = initControlsManager(intialControlsState);
    controlsManager.api.removePanel('bravo');
    expect(controlsManager.controlsInOrder$.value.map((element) => element.id)).toEqual([
      'alpha',
      'charlie',
    ]);
  });

  test('replacePanel should replace control', async () => {
    const controlsManager = initControlsManager(intialControlsState);
    const replacePanelPromise = controlsManager.api.replacePanel('bravo', {
      panelType: 'testControl',
      serializedState: { rawState: {} },
    });
    controlsManager.setControlApi('delta', {} as unknown as DefaultControlApi);
    await replacePanelPromise;
    expect(controlsManager.controlsInOrder$.value.map((element) => element.id)).toEqual([
      'alpha',
      'delta',
      'charlie',
    ]);
  });

  describe('untilInitialized', () => {
    test('should not resolve until all controls are initialized', async () => {
      const controlsManager = initControlsManager(intialControlsState);
      let isDone = false;
      controlsManager.api.untilInitialized().then(() => {
        isDone = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isDone).toBe(false);

      controlsManager.setControlApi('alpha', {} as unknown as DefaultControlApi);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isDone).toBe(false);

      controlsManager.setControlApi('bravo', {} as unknown as DefaultControlApi);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isDone).toBe(false);

      controlsManager.setControlApi('charlie', {} as unknown as DefaultControlApi);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isDone).toBe(true);
    });

    test('should resolve when all control already initialized ', async () => {
      const controlsManager = initControlsManager(intialControlsState);
      controlsManager.setControlApi('alpha', {} as unknown as DefaultControlApi);
      controlsManager.setControlApi('bravo', {} as unknown as DefaultControlApi);
      controlsManager.setControlApi('charlie', {} as unknown as DefaultControlApi);

      let isDone = false;
      controlsManager.api.untilInitialized().then(() => {
        isDone = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isDone).toBe(true);
    });
  });
});

describe('getLastUsedDataViewId', () => {
  test('should return last used data view id', () => {
    const dataViewId = getLastUsedDataViewId(
      [
        { id: 'alpha', type: 'testControl' },
        { id: 'bravo', type: 'testControl' },
        { id: 'charlie', type: 'testControl' },
      ],
      {
        alpha: { dataViewId: '1', type: 'testControl', order: 0 },
        bravo: { dataViewId: '2', type: 'testControl', order: 1 },
        charlie: { type: 'testControl', order: 2 },
      }
    );
    expect(dataViewId).toBe('2');
  });

  test('should return undefined when there are no controls', () => {
    const dataViewId = getLastUsedDataViewId([], {});
    expect(dataViewId).toBeUndefined();
  });

  test('should return undefined when there are no controls with data views', () => {
    const dataViewId = getLastUsedDataViewId([{ id: 'alpha', type: 'testControl' }], {
      alpha: { type: 'testControl', order: 0 },
    });
    expect(dataViewId).toBeUndefined();
  });
});

describe('resetControlsUnsavedChanges', () => {
  test(`should remove previous sessions's unsaved changes on reset`, () => {
    // last session's unsaved changes added 1 control
    const intialControlsState = {
      alpha: { type: 'testControl', order: 0 },
    };
    // last saved state is empty control group
    const controlsManager = initControlsManager(intialControlsState);
    controlsManager.setControlApi('alpha', {} as unknown as DefaultControlApi);

    expect(controlsManager.controlsInOrder$.value).toEqual([
      {
        id: 'alpha',
        type: 'testControl',
      },
    ]);

    // last saved state is empty control group
    controlsManager.resetControlsUnsavedChanges({});
    expect(controlsManager.controlsInOrder$.value).toEqual([]);
  });

  test('should restore deleted control on reset', () => {
    const intialControlsState = {
      alpha: { type: 'testControl', order: 0 },
    };
    const controlsManager = initControlsManager(intialControlsState);
    controlsManager.setControlApi('alpha', {} as unknown as DefaultControlApi);

    // delete control
    controlsManager.api.removePanel('alpha');

    // deleted control should exist on reset
    controlsManager.resetControlsUnsavedChanges(intialControlsState);
    expect(controlsManager.controlsInOrder$.value).toEqual([
      {
        id: 'alpha',
        type: 'testControl',
      },
    ]);
  });

  test('should restore controls to last saved state', () => {
    const intialControlsState = {};
    const controlsManager = initControlsManager(intialControlsState);

    // add control
    controlsManager.api.addNewPanel({ panelType: 'testControl' });
    controlsManager.setControlApi('delta', {} as unknown as DefaultControlApi);

    // saved control should exist on reset
    controlsManager.resetControlsUnsavedChanges({ delta: { type: 'testControl', order: 0 } });
    expect(controlsManager.controlsInOrder$.value).toEqual([
      {
        id: 'delta',
        type: 'testControl',
      },
    ]);
  });

  // Test edge case where adding a panel and resetting left orphaned control in children$
  test('should remove orphaned children on reset', () => {
    // baseline last saved state contains a single control
    const intialControlsState = {
      alpha: { type: 'testControl', order: 0 },
    };
    const controlsManager = initControlsManager(intialControlsState);
    controlsManager.setControlApi('alpha', {} as unknown as DefaultControlApi);

    // add another control
    controlsManager.api.addNewPanel({ panelType: 'testControl' });
    controlsManager.setControlApi('delta', {} as unknown as DefaultControlApi);
    expect(Object.keys(controlsManager.api.children$.value).length).toBe(2);

    // reset to lastSavedControlsState
    controlsManager.resetControlsUnsavedChanges(intialControlsState);
    // children$ should no longer contain control removed by resetting back to original control baseline
    expect(Object.keys(controlsManager.api.children$.value).length).toBe(1);
  });
});

describe('getNewControlState', () => {
  test('should contain defaults when there are no existing controls', () => {
    const controlsManager = initControlsManager({});
    expect(controlsManager.getNewControlState()).toEqual({
      grow: false,
      width: 'medium',
      dataViewId: undefined,
    });
  });

  test('should start with defaults if there are existing controls', () => {
    const intialControlsState: ControlPanelsState<DefaultDataControlState> = {
      alpha: {
        type: 'testControl',
        order: 1,
        dataViewId: 'myOtherDataViewId',
        fieldName: 'foo',
        width: 'small',
        grow: false,
      },
    };
    const controlsManager = initControlsManager(intialControlsState);
    expect(controlsManager.getNewControlState()).toEqual({
      grow: false,
      width: 'medium',
      dataViewId: 'myOtherDataViewId',
    });
  });

  test('should contain values of last added control', () => {
    const controlsManager = initControlsManager({});
    controlsManager.api.addNewPanel({
      panelType: 'testControl',
      serializedState: {
        rawState: {
          grow: false,
          width: 'small',
          dataViewId: 'myOtherDataViewId',
        },
      },
    });
    expect(controlsManager.getNewControlState()).toEqual({
      grow: false,
      width: 'small',
      dataViewId: 'myOtherDataViewId',
    });
  });
});
