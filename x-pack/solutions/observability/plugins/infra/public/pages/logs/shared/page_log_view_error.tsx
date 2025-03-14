/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiCallOut, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import {
  FetchLogViewStatusError,
  FetchLogViewError,
  ResolveLogViewError,
} from '@kbn/logs-shared-plugin/common';
import { LogsPageTemplate } from './page_template';

export const LogViewErrorPage: React.FC<{
  errors: Error[];
  onRetry?: () => void;
}> = ({ errors, onRetry }) => {
  const settingsLinkProps = useLinkProps({ app: 'logs', pathname: '/settings' });

  return (
    <LogsPageTemplate isEmptyState={true}>
      <EuiEmptyPrompt
        iconType="warning"
        iconColor="danger"
        title={
          <h2>
            <FormattedMessage
              id="xpack.infra.logSourceErrorPage.failedToLoadSourceTitle"
              defaultMessage="Failed to load configuration"
            />
          </h2>
        }
        body={
          <>
            <p>
              <FormattedMessage
                id="xpack.infra.logSourceErrorPage.failedToLoadSourceMessage"
                defaultMessage="Errors occurred while attempting to load the configuration. Try again or change the configuration to fix the problem."
              />
            </p>
            {errors.map((error) => (
              <React.Fragment key={error.name}>
                <LogSourceErrorMessage error={error} />
                <EuiSpacer />
              </React.Fragment>
            ))}
          </>
        }
        actions={
          onRetry
            ? [
                <EuiButton
                  data-test-subj="infraLogViewErrorPageTryAgainButton"
                  onClick={onRetry}
                  iconType="refresh"
                  fill
                >
                  <FormattedMessage
                    id="xpack.infra.logSourceErrorPage.tryAgainButtonLabel"
                    defaultMessage="Try again"
                  />
                </EuiButton>,
                <EuiButtonEmpty
                  data-test-subj="infraLogViewErrorPageChangeConfigurationButton"
                  iconType="gear"
                  {...settingsLinkProps}
                >
                  <FormattedMessage
                    id="xpack.infra.logSourceErrorPage.navigateToSettingsButtonLabel"
                    defaultMessage="Change configuration"
                  />
                </EuiButtonEmpty>,
              ]
            : undefined
        }
      />
    </LogsPageTemplate>
  );
};

export const LogSourceErrorPage = LogViewErrorPage;

const LogSourceErrorMessage: React.FC<{ error: Error }> = ({ error }) => {
  if (error instanceof ResolveLogViewError) {
    return (
      <LogSourceErrorCallout
        title={
          <FormattedMessage
            id="xpack.infra.logSourceErrorPage.resolveLogSourceConfigurationErrorTitle"
            defaultMessage="Failed to resolve the log source configuration"
          />
        }
      >
        {error.cause instanceof SavedObjectNotFound ? (
          // the SavedObjectNotFound error message contains broken markup
          <FormattedMessage
            id="xpack.infra.logSourceErrorPage.savedObjectNotFoundErrorMessage"
            defaultMessage="Failed to locate that {savedObjectType}: {savedObjectId}"
            values={{
              savedObjectType: error.cause.savedObjectType,
              savedObjectId: error.cause.savedObjectId,
            }}
          />
        ) : (
          `${error.cause?.message ?? error.message}`
        )}
      </LogSourceErrorCallout>
    );
  } else if (error instanceof FetchLogViewError) {
    return (
      <LogSourceErrorCallout
        title={
          <FormattedMessage
            id="xpack.infra.logSourceErrorPage.fetchLogSourceConfigurationErrorTitle"
            defaultMessage="Failed to load the log source configuration"
          />
        }
      >
        {`${error.cause?.message ?? error.message}`}
      </LogSourceErrorCallout>
    );
  } else if (error instanceof FetchLogViewStatusError) {
    return (
      <LogSourceErrorCallout
        title={
          <FormattedMessage
            id="xpack.infra.logSourceErrorPage.fetchLogSourceStatusErrorTitle"
            defaultMessage="Failed to determine the status of the log source"
          />
        }
      >
        {`${error.cause?.message ?? error.message}`}
      </LogSourceErrorCallout>
    );
  } else {
    return <LogSourceErrorCallout title={error.name}>{`${error.message}`}</LogSourceErrorCallout>;
  }
};

const LogSourceErrorCallout: FC<PropsWithChildren<{ title: React.ReactNode }>> = ({
  title,
  children,
}) => (
  <EuiCallOut className="eui-textLeft" color="danger" iconType="warning" title={title}>
    <p>{children}</p>
  </EuiCallOut>
);
