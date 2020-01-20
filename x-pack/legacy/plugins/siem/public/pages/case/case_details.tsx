/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import chrome from 'ui/chrome';

import { useKibana } from '../../lib/kibana';
import { EmptyPage } from '../../components/empty_page';
import { HeaderPage } from '../../components/header_page';
import { WrapperPage } from '../../components/wrapper_page';
import { WithSource, indicesExistOrDataTemporarilyUnavailable } from '../../containers/source';
import { CaseView } from '../../components/page/case/case_view';
import * as i18n from './translations';
import { SpyRoute } from '../../utils/route/spy_routes';

const basePath = chrome.getBasePath();

interface Props {
  caseId: string;
}

export const CaseDetails = React.memo(({ caseId }: Props) => {
  const docLinks = useKibana().services.docLinks;
  return (
    <>
      <WrapperPage>
        <HeaderPage
          badgeOptions={{
            beta: true,
            text: i18n.PAGE_BADGE_LABEL,
            tooltip: i18n.PAGE_BADGE_TOOLTIP,
          }}
          border
          subtitle={caseId}
          title="OMG ITS CASE DETAILS!!!!!!!"
        />

        <WithSource sourceId="default">
          {({ indicesExist }) =>
            indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
              <EuiFlexGroup>
                <CaseView caseId={caseId} />
              </EuiFlexGroup>
            ) : (
              <EmptyPage
                actionPrimaryIcon="gear"
                actionPrimaryLabel={i18n.EMPTY_ACTION_PRIMARY}
                actionPrimaryUrl={`${basePath}/app/kibana#/home/tutorial_directory/siem`}
                actionSecondaryIcon="popout"
                actionSecondaryLabel={i18n.EMPTY_ACTION_SECONDARY}
                actionSecondaryTarget="_blank"
                actionSecondaryUrl={docLinks.links.siem.gettingStarted}
                data-test-subj="empty-page"
                title={i18n.EMPTY_TITLE}
              />
            )
          }
        </WithSource>
      </WrapperPage>
      <SpyRoute />
    </>
  );
});

CaseDetails.displayName = 'CaseDetails';
