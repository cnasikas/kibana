/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { HomeLink } from '../../../../shared/links/apm/home_link';
import { useFleetCloudAgentPolicyHref } from '../../../../shared/links/kibana';

export function CardFooterContent() {
  const fleetCloudAgentPolicyHref = useFleetCloudAgentPolicyHref();

  return (
    <div>
      <EuiButton
        data-test-subj="apmCardFooterContentViewTheApmIntegrationInFleetButton"
        href={fleetCloudAgentPolicyHref}
      >
        {i18n.translate('xpack.apm.settings.schema.success.viewIntegrationInFleet.buttonText', {
          defaultMessage: 'View the APM integration in Fleet',
        })}
      </EuiButton>
      <EuiSpacer size="xs" />
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.apm.settings.schema.success.returnText"
            defaultMessage="or simply return to the {serviceInventoryLink}."
            values={{
              serviceInventoryLink: (
                <HomeLink>
                  {i18n.translate(
                    'xpack.apm.settings.schema.success.returnText.serviceInventoryLink',
                    { defaultMessage: 'Service inventory' }
                  )}
                </HomeLink>
              ),
            }}
          />
        </p>
      </EuiText>
    </div>
  );
}
