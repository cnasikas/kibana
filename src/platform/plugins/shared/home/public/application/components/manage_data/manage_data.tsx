/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, MouseEvent } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiSpacer,
  EuiTitle,
  EuiFlexItem,
  UseEuiTheme,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { FormattedMessage } from '@kbn/i18n-react';
import { METRIC_TYPE } from '@kbn/analytics';
import { ApplicationStart } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { FeatureCatalogueEntry } from '../../../services';
import { createAppNavigationHandler } from '../app_navigation_handler';
import { Synopsis } from '../synopsis';
import { getServices } from '../../kibana_services';

interface Props {
  addBasePath: (path: string) => string;
  application: ApplicationStart;
  features: FeatureCatalogueEntry[];
}

export const ManageData: FC<Props> = ({ addBasePath, application, features }) => {
  const { share, trackUiMetric } = getServices();

  const consoleHref = share.url.locators.get('CONSOLE_APP_LOCATOR')?.useUrl({});
  const managementHref = share.url.locators
    .get('MANAGEMENT_APP_LOCATOR')
    ?.useUrl({ sectionId: '' });

  if (features.length) {
    const { management: isManagementEnabled, dev_tools: isDevToolsEnabled } =
      application.capabilities.navLinks;

    return (
      <KibanaPageTemplate.Section
        bottomBorder
        paddingSize="xl"
        aria-labelledby="homeDataManage__title"
        data-test-subj="homeDataManage"
      >
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={1}>
            <EuiTitle size="s">
              <h2 id="homeDataManage__title">
                <FormattedMessage id="home.manageData.sectionTitle" defaultMessage="Management" />
              </h2>
            </EuiTitle>
          </EuiFlexItem>

          {isDevToolsEnabled || isManagementEnabled ? (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" responsive={false} wrap>
                {/* Check if both the Dev Tools UI and the Console UI are enabled. */}
                {isDevToolsEnabled && consoleHref !== undefined ? (
                  <EuiFlexItem grow={false}>
                    <RedirectAppLinks
                      coreStart={{
                        application,
                      }}
                    >
                      <EuiButtonEmpty
                        data-test-subj="homeDevTools"
                        flush="both"
                        iconType="wrench"
                        href={consoleHref}
                      >
                        <FormattedMessage
                          id="home.manageData.devToolsButtonLabel"
                          defaultMessage="Dev Tools"
                        />
                      </EuiButtonEmpty>
                    </RedirectAppLinks>
                  </EuiFlexItem>
                ) : null}

                {isManagementEnabled ? (
                  <EuiFlexItem grow={false}>
                    <RedirectAppLinks
                      coreStart={{
                        application,
                      }}
                    >
                      <EuiButtonEmpty
                        data-test-subj="homeManage"
                        flush="both"
                        iconType="gear"
                        href={managementHref}
                      >
                        <FormattedMessage
                          id="home.manageData.stackManagementButtonLabel"
                          defaultMessage="Stack Management"
                        />
                      </EuiButtonEmpty>
                    </RedirectAppLinks>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>

        <EuiSpacer />

        <EuiFlexGroup>
          {features.map((feature) => (
            <EuiFlexItem
              css={({ euiTheme }: UseEuiTheme) =>
                css({
                  [`@media (min-width: ${euiTheme.breakpoint.l}px)`]: {
                    maxWidth: `calc(33.33% - ${euiTheme.size.l})`,
                  },
                })
              }
              key={feature.id}
            >
              <Synopsis
                description={feature.description}
                iconType={feature.icon}
                id={feature.id}
                onClick={(event: MouseEvent) => {
                  trackUiMetric(METRIC_TYPE.CLICK, `manage_data_card_${feature.id}`);
                  createAppNavigationHandler(feature.path)(event);
                }}
                title={feature.title}
                url={addBasePath(feature.path)}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    );
  } else {
    return null;
  }
};
