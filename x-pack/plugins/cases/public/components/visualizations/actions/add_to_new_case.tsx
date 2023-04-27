/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { Router } from 'react-router-dom';

import { createAction } from '@kbn/ui-actions-plugin/public';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { canUseCases } from '../../../client/helpers/can_use_cases';
import { CommentType } from '../../../../common';
import { isLensEmbeddable } from './utils';
import { KibanaContextProvider } from '../../../common/lib/kibana';

import { OWNER_INFO } from '../../../../common/constants';
import type { CaseUIActionProps, DashboardVisualizationEmbeddable } from './types';
import CasesProvider from '../../cases_context';
import { ADD_TO_CASE_SUCCESS } from './translations';
import { useCasesAddToNewCaseFlyout } from '../../create/flyout/use_cases_add_to_new_case_flyout';

export const ACTION_ID = 'embeddable_addToNewCase';
export const DEFAULT_DARK_MODE = 'theme:darkMode' as const;

interface Props {
  embeddable: DashboardVisualizationEmbeddable;
  onSuccess: () => void;
  onClose: () => void;
}

const AddToNewCaseFlyoutWrapper: React.FC<Props> = ({ embeddable, onClose, onSuccess }) => {
  const { attributes, timeRange } = embeddable.getInput();
  const flyout = useCasesAddToNewCaseFlyout({
    onClose,
    onSuccess,
    toastContent: ADD_TO_CASE_SUCCESS,
  });

  const attachments = [
    {
      comment: `!{lens${JSON.stringify({
        timeRange,
        attributes,
      })}}`,
      type: CommentType.user as const,
    },
  ];

  useEffect(() => {
    flyout.open({ attachments });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

AddToNewCaseFlyoutWrapper.displayName = 'AddToNewCaseFlyoutWrapper';

export const createAddToNewCaseLensAction = ({
  core,
  plugins,
  storage,
  history,
  caseContextProps,
}: CaseUIActionProps) => {
  const { application: applicationService, theme, uiSettings } = core;
  let currentAppId: string | undefined;
  applicationService?.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  return createAction<{ embeddable: DashboardVisualizationEmbeddable; coreStart: CoreStart }>({
    id: ACTION_ID,
    type: 'actionButton',
    getIconType: () => 'casesApp',
    getDisplayName: () =>
      i18n.translate('xpack.cases.actions.visualizationActions.addToNewCase.displayName', {
        defaultMessage: 'Add to new case',
      }),
    isCompatible: async ({ embeddable }) =>
      !isErrorEmbeddable(embeddable) && isLensEmbeddable(embeddable),
    execute: async ({ embeddable }) => {
      const { attributes, timeRange } = embeddable.getInput();
      const owner = Object.values(OWNER_INFO)
        .filter((info) => info.appId === currentAppId)
        .map((i) => i.id);

      const casePermissions = canUseCases(applicationService.capabilities)(
        owner.length > 0 ? owner : undefined
      );

      if (
        attributes == null ||
        timeRange == null ||
        !casePermissions.update ||
        !casePermissions.read
      ) {
        return;
      }

      const targetDomElement = document.createElement('div');

      const cleanupDom = () => {
        if (targetDomElement != null) {
          unmountComponentAtNode(targetDomElement);
        }
      };

      const onFlyoutClose = () => {
        cleanupDom();
      };

      const mount = toMountPoint(
        <KibanaContextProvider
          services={{
            ...core,
            ...plugins,
            storage,
          }}
        >
          <EuiThemeProvider darkMode={uiSettings.get(DEFAULT_DARK_MODE)}>
            <Router history={history}>
              <CasesProvider
                value={{
                  ...caseContextProps,
                  owner,
                  permissions: casePermissions,
                }}
              >
                <AddToNewCaseFlyoutWrapper
                  embeddable={embeddable}
                  onClose={onFlyoutClose}
                  onSuccess={onFlyoutClose}
                />
              </CasesProvider>
            </Router>
          </EuiThemeProvider>
        </KibanaContextProvider>,
        { theme$: theme.theme$ }
      );

      mount(targetDomElement);
    },
  });
};
