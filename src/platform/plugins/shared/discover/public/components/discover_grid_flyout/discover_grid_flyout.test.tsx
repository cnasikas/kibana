/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonIcon, EuiContextMenuItem, EuiPopover } from '@elastic/eui';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { Query, AggregateQuery } from '@kbn/es-query';
import type { DiscoverGridFlyoutProps } from './discover_grid_flyout';
import { DiscoverGridFlyout } from './discover_grid_flyout';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import type { DiscoverServices } from '../../build_services';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import { buildDataTableRecord, buildDataTableRecordList } from '@kbn/discover-utils';
import { act } from 'react-dom/test-utils';
import type { ReactWrapper } from 'enzyme';
import { setUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/plugin';
import { mockUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/__mocks__';
import type { FlyoutCustomization } from '../../customizations';
import { useDiscoverCustomization } from '../../customizations';
import { discoverServiceMock } from '../../__mocks__/services';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';

const mockFlyoutCustomization: FlyoutCustomization = {
  id: 'flyout',
  actions: {},
};

jest.mock('../../customizations', () => ({
  ...jest.requireActual('../../customizations'),
  useDiscoverCustomization: jest.fn(),
}));

let mockBreakpointSize: string | null = null;

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useIsWithinBreakpoints: jest.fn((breakpoints: string[]) => {
      if (mockBreakpointSize && breakpoints.includes(mockBreakpointSize)) {
        return true;
      }

      return original.useIsWithinBreakpoints(breakpoints);
    }),
    useResizeObserver: jest.fn(() => ({ width: 1000, height: 1000 })),
  };
});

const waitNextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

const waitNextUpdate = async (component: ReactWrapper) => {
  await act(async () => {
    await waitNextTick();
  });
  component.update();
};

describe('Discover flyout', function () {
  const getServices = () => {
    return {
      ...discoverServiceMock,
      contextLocator: { getRedirectUrl: jest.fn(() => 'mock-context-redirect-url') },
      singleDocLocator: { getRedirectUrl: jest.fn(() => 'mock-doc-redirect-url') },
      toastNotifications: {
        addSuccess: jest.fn(),
      },
    } as unknown as DiscoverServices;
  };

  const mountComponent = async ({
    dataView,
    records,
    expandedHit,
    query,
    services = getServices(),
  }: {
    dataView?: DataView;
    records?: DataTableRecord[];
    expandedHit?: EsHitRecord;
    query?: Query | AggregateQuery;
    services?: DiscoverServices;
  }) => {
    const onClose = jest.fn();
    setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

    const currentRecords =
      records ||
      esHitsMock.map((entry: EsHitRecord) => buildDataTableRecord(entry, dataView || dataViewMock));

    const props = {
      columns: ['date'],
      dataView: dataView || dataViewMock,
      hit: expandedHit
        ? buildDataTableRecord(expandedHit, dataView || dataViewMock)
        : currentRecords[0],
      hits: currentRecords,
      query,
      onAddColumn: jest.fn(),
      onClose,
      onFilter: jest.fn(),
      onRemoveColumn: jest.fn(),
      setExpandedDoc: jest.fn(),
    };

    const Proxy = (newProps: DiscoverGridFlyoutProps) => (
      <DiscoverTestProvider services={services}>
        <DiscoverGridFlyout {...newProps} />
      </DiscoverTestProvider>
    );

    const component = mountWithIntl(<Proxy {...props} />);
    await waitNextUpdate(component);

    return { component, props, services };
  };

  beforeEach(() => {
    mockFlyoutCustomization.actions.defaultActions = undefined;
    mockFlyoutCustomization.Content = undefined;
    mockFlyoutCustomization.title = undefined;
    jest.clearAllMocks();

    (useDiscoverCustomization as jest.Mock).mockImplementation(() => mockFlyoutCustomization);
  });

  it('should be rendered correctly using an data view without timefield', async () => {
    const { component, props } = await mountComponent({});

    const url = findTestSubject(component, 'docTableRowAction').prop('href');
    expect(url).toMatchInlineSnapshot(`"mock-doc-redirect-url"`);
    findTestSubject(component, 'euiFlyoutCloseButton').simulate('click');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('should be rendered correctly using an data view with timefield', async () => {
    const { component, props } = await mountComponent({ dataView: dataViewWithTimefieldMock });

    const actions = findTestSubject(component, 'docTableRowAction');
    expect(actions.length).toBe(2);
    expect(actions.first().prop('href')).toMatchInlineSnapshot(`"mock-doc-redirect-url"`);
    expect(actions.last().prop('href')).toMatchInlineSnapshot(`"mock-context-redirect-url"`);
    findTestSubject(component, 'euiFlyoutCloseButton').simulate('click');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('displays document navigation when there is more than 1 doc available', async () => {
    const { component } = await mountComponent({ dataView: dataViewWithTimefieldMock });
    const docNav = findTestSubject(component, 'docViewerFlyoutNavigation');
    expect(docNav.length).toBeTruthy();
  });

  it('displays no document navigation when there are 0 docs available', async () => {
    const { component } = await mountComponent({ records: [], expandedHit: esHitsMock[0] });
    const docNav = findTestSubject(component, 'docViewerFlyoutNavigation');
    expect(docNav.length).toBeFalsy();
  });

  it('displays no document navigation when the expanded doc is not part of the given docs', async () => {
    // scenario: you've expanded a doc, and in the next request differed docs where fetched
    const records = [
      {
        _index: 'new',
        _id: '1',
        _score: 1,
        _type: '_doc',
        _source: { date: '2020-20-01T12:12:12.123', message: 'test1', bytes: 20 },
      },
      {
        _index: 'new',
        _id: '2',
        _score: 1,
        _type: '_doc',
        _source: { date: '2020-20-01T12:12:12.124', name: 'test2', extension: 'jpg' },
      },
    ].map((hit) => buildDataTableRecord(hit, dataViewMock));
    const { component } = await mountComponent({ records, expandedHit: esHitsMock[0] });
    const docNav = findTestSubject(component, 'docViewerFlyoutNavigation');
    expect(docNav.length).toBeFalsy();
  });

  it('allows you to navigate to the next doc, if expanded doc is the first', async () => {
    // scenario: you've expanded a doc, and in the next request different docs where fetched
    const { component, props } = await mountComponent({});
    findTestSubject(component, 'pagination-button-next').simulate('click');
    // we selected 1, so we'd expect 2
    expect(props.setExpandedDoc.mock.calls[0][0].raw._id).toBe('2');
  });

  it('doesnt allow you to navigate to the previous doc, if expanded doc is the first', async () => {
    // scenario: you've expanded a doc, and in the next request differed docs where fetched
    const { component, props } = await mountComponent({});
    findTestSubject(component, 'pagination-button-previous').simulate('click');
    expect(props.setExpandedDoc).toHaveBeenCalledTimes(0);
  });

  it('doesnt allow you to navigate to the next doc, if expanded doc is the last', async () => {
    // scenario: you've expanded a doc, and in the next request differed docs where fetched
    const { component, props } = await mountComponent({
      expandedHit: esHitsMock[esHitsMock.length - 1],
    });
    findTestSubject(component, 'pagination-button-next').simulate('click');
    expect(props.setExpandedDoc).toHaveBeenCalledTimes(0);
  });

  it('allows you to navigate to the previous doc, if expanded doc is the last', async () => {
    // scenario: you've expanded a doc, and in the next request differed docs where fetched
    const { component, props } = await mountComponent({
      expandedHit: esHitsMock[esHitsMock.length - 1],
    });
    findTestSubject(component, 'pagination-button-previous').simulate('click');
    expect(props.setExpandedDoc).toHaveBeenCalledTimes(1);
    expect(props.setExpandedDoc.mock.calls[0][0].raw._id).toBe('4');
  });

  it('allows navigating with arrow keys through documents', async () => {
    const { component, props } = await mountComponent({});
    findTestSubject(component, 'docViewerFlyout').simulate('keydown', { key: 'ArrowRight' });
    expect(props.setExpandedDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'i::2::' }));
    component.setProps({ ...props, hit: props.hits[1] });
    findTestSubject(component, 'docViewerFlyout').simulate('keydown', { key: 'ArrowLeft' });
    expect(props.setExpandedDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'i::1::' }));
  });

  it('should not navigate with keypresses when already at the border of documents', async () => {
    const { component, props } = await mountComponent({});
    findTestSubject(component, 'docViewerFlyout').simulate('keydown', { key: 'ArrowLeft' });
    expect(props.setExpandedDoc).not.toHaveBeenCalled();
    component.setProps({ ...props, hit: props.hits[props.hits.length - 1] });
    findTestSubject(component, 'docViewerFlyout').simulate('keydown', { key: 'ArrowRight' });
    expect(props.setExpandedDoc).not.toHaveBeenCalled();
  });

  it('should not navigate with arrow keys through documents if an input is in focus', async () => {
    mockFlyoutCustomization.Content = () => {
      return <input data-test-subj="flyoutCustomInput" />;
    };

    const { component, props } = await mountComponent({});
    findTestSubject(component, 'flyoutCustomInput').simulate('keydown', {
      key: 'ArrowRight',
    });
    findTestSubject(component, 'flyoutCustomInput').simulate('keydown', {
      key: 'ArrowLeft',
    });
    expect(props.setExpandedDoc).not.toHaveBeenCalled();
  });

  it('should not render single/surrounding views for ES|QL', async () => {
    const { component } = await mountComponent({
      query: { esql: 'FROM indexpattern' },
    });
    const singleDocumentView = findTestSubject(component, 'docTableRowAction');
    expect(singleDocumentView.length).toBeFalsy();
    const flyoutTitle = findTestSubject(component, 'docViewerRowDetailsTitle');
    expect(flyoutTitle.text()).toBe('Result');
  });

  describe('with applied customizations', () => {
    describe('when title is customized', () => {
      it('should display the passed string as title', async () => {
        const customTitle = 'Custom flyout title';
        mockFlyoutCustomization.title = customTitle;

        const { component } = await mountComponent({});

        const titleNode = findTestSubject(component, 'docViewerRowDetailsTitle');

        expect(titleNode.text()).toBe(customTitle);
      });
    });

    describe('when actions are customized', () => {
      it('should display actions added by getActionItems', async () => {
        mockBreakpointSize = 'xl';
        mockFlyoutCustomization.actions = {
          getActionItems: jest.fn(() => [
            {
              id: 'action-item-1',
              enabled: true,
              label: 'Action 1',
              iconType: 'document',
              dataTestSubj: 'customActionItem1',
              onClick: jest.fn(),
            },
            {
              id: 'action-item-2',
              enabled: true,
              label: 'Action 2',
              iconType: 'document',
              dataTestSubj: 'customActionItem2',
              onClick: jest.fn(),
            },
            {
              id: 'action-item-3',
              enabled: false,
              label: 'Action 3',
              iconType: 'document',
              dataTestSubj: 'customActionItem3',
              onClick: jest.fn(),
            },
          ]),
        };

        const { component } = await mountComponent({});

        const action1 = findTestSubject(component, 'customActionItem1');
        const action2 = findTestSubject(component, 'customActionItem2');

        expect(action1.text()).toBe('Action 1');
        expect(action2.text()).toBe('Action 2');
        expect(findTestSubject(component, 'customActionItem3').exists()).toBe(false);
        mockBreakpointSize = null;
      });

      it('should display multiple actions added by getActionItems', async () => {
        mockFlyoutCustomization.actions = {
          getActionItems: jest.fn(() =>
            Array.from({ length: 5 }, (_, i) => ({
              id: `action-item-${i}`,
              enabled: true,
              label: `Action ${i}`,
              iconType: 'document',
              dataTestSubj: `customActionItem${i}`,
              onClick: jest.fn(),
            }))
          ),
        };

        const { component } = await mountComponent({});
        expect(
          findTestSubject(component, 'docViewerFlyoutActions')
            .find(EuiButtonIcon)
            .map((button) => button.prop('data-test-subj'))
        ).toEqual([
          'docTableRowAction',
          'customActionItem0',
          'customActionItem1',
          'docViewerMoreFlyoutActionsButton',
        ]);

        act(() => {
          findTestSubject(component, 'docViewerMoreFlyoutActionsButton').simulate('click');
        });

        component.update();

        expect(
          component
            .find(EuiPopover)
            .find(EuiContextMenuItem)
            .map((button) => button.prop('data-test-subj'))
        ).toEqual(['customActionItem2', 'customActionItem3', 'customActionItem4']);
      });

      it('should display multiple actions added by getActionItems in mobile view', async () => {
        mockBreakpointSize = 's';

        mockFlyoutCustomization.actions = {
          getActionItems: jest.fn(() =>
            Array.from({ length: 3 }, (_, i) => ({
              id: `action-item-${i}`,
              enabled: true,
              label: `Action ${i}`,
              iconType: 'document',
              dataTestSubj: `customActionItem${i}`,
              onClick: jest.fn(),
            }))
          ),
        };

        const { component } = await mountComponent({});
        expect(findTestSubject(component, 'docViewerFlyoutActions').length).toBe(0);

        act(() => {
          findTestSubject(component, 'docViewerMobileActionsButton').simulate('click');
        });

        component.update();

        expect(
          component
            .find(EuiPopover)
            .find(EuiContextMenuItem)
            .map((button) => button.prop('data-test-subj'))
        ).toEqual([
          'docTableRowAction',
          'customActionItem0',
          'customActionItem1',
          'customActionItem2',
        ]);

        mockBreakpointSize = null;
      });

      it('should allow disabling default actions', async () => {
        mockFlyoutCustomization.actions = {
          defaultActions: {
            viewSingleDocument: { disabled: true },
            viewSurroundingDocument: { disabled: true },
          },
        };

        const { component } = await mountComponent({});

        const singleDocumentView = findTestSubject(component, 'docTableRowAction');
        expect(singleDocumentView.length).toBeFalsy();
      });
    });

    describe('when content is customized', () => {
      it('should display the component passed to the Content customization', async () => {
        mockFlyoutCustomization.Content = () => (
          <span data-test-subj="flyoutCustomContent">Custom content</span>
        );

        const { component } = await mountComponent({});

        const customContent = findTestSubject(component, 'flyoutCustomContent');

        expect(customContent.text()).toBe('Custom content');
      });

      it('should provide a doc property to display details about the current document overview', async () => {
        mockFlyoutCustomization.Content = ({ doc }) => {
          return (
            <span data-test-subj="flyoutCustomContent">{doc.flattened.message as string}</span>
          );
        };

        const { component } = await mountComponent({});

        const customContent = findTestSubject(component, 'flyoutCustomContent');

        expect(customContent.text()).toBe('test1');
      });

      it('should provide an actions prop collection to optionally update the grid content', async () => {
        mockFlyoutCustomization.Content = ({ actions }) => (
          <>
            <button data-test-subj="addColumn" onClick={() => actions.onAddColumn?.('message')} />
            <button
              data-test-subj="removeColumn"
              onClick={() => actions.onRemoveColumn?.('message')}
            />
            <button
              data-test-subj="addFilter"
              onClick={() => actions.filter?.('_exists_', 'message', '+')}
            />
          </>
        );

        const { component, props, services } = await mountComponent({});

        findTestSubject(component, 'addColumn').simulate('click');
        findTestSubject(component, 'removeColumn').simulate('click');
        findTestSubject(component, 'addFilter').simulate('click');

        expect(props.onAddColumn).toHaveBeenCalled();
        expect(props.onRemoveColumn).toHaveBeenCalled();
        expect(services.toastNotifications.addSuccess).toHaveBeenCalledTimes(2);
        expect(props.onFilter).toHaveBeenCalled();
      });
    });

    describe('context awareness', () => {
      it('should render flyout per the defined document profile', async () => {
        const services = getServices();
        const hits = [
          {
            _index: 'new',
            _id: '1',
            _score: 1,
            _type: '_doc',
            _source: { date: '2020-20-01T12:12:12.123', message: 'test1', bytes: 20 },
          },
          {
            _index: 'new',
            _id: '2',
            _score: 1,
            _type: '_doc',
            _source: { date: '2020-20-01T12:12:12.124', name: 'test2', extension: 'jpg' },
          },
        ];
        const scopedProfilesManager = services.profilesManager.createScopedProfilesManager({
          scopedEbtManager: services.ebtManager.createScopedEBTManager(),
        });
        const records = buildDataTableRecordList({
          records: hits as EsHitRecord[],
          dataView: dataViewMock,
          processRecord: (record) => scopedProfilesManager.resolveDocumentProfile({ record }),
        });
        const { component } = await mountComponent({ records, services });
        const title = findTestSubject(component, 'docViewerRowDetailsTitle');
        expect(title.text()).toBe('Document #new::1::');
        const content = findTestSubject(component, 'kbnDocViewer');
        expect(content.text()).toBe('Mock tab');
      });
    });
  });
});
