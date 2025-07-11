/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiLinkButtonProps, EuiPopoverProps } from '@elastic/eui';
import { EuiButtonEmpty, EuiButtonIcon, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
import styled from '@emotion/styled';

const PopoverContent = styled(EuiText)`
  max-width: 480px;
  max-height: 40vh;
`;

export function HelpPopoverButton({
  buttonTextEnabled = false,
  onClick,
}: {
  buttonTextEnabled?: boolean;
  onClick: EuiLinkButtonProps['onClick'];
}) {
  const buttonText = i18n.translate('xpack.apm.helpPopover.ariaLabel', {
    defaultMessage: 'Help',
  });

  if (buttonTextEnabled) {
    return (
      <EuiButtonEmpty
        data-test-subj="apmHelpPopoverButtonButton"
        className="apmHelpPopover__buttonIcon"
        size="s"
        iconType="question"
        aria-label={buttonText}
        onClick={onClick}
      >
        {buttonText}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiButtonIcon
      data-test-subj="apmHelpPopoverButtonButton"
      className="apmHelpPopover__buttonIcon"
      size="s"
      iconType="question"
      aria-label={buttonText}
      onClick={onClick}
    />
  );
}

export function HelpPopover({
  anchorPosition,
  button,
  children,
  closePopover,
  isOpen,
  title,
}: {
  anchorPosition?: EuiPopoverProps['anchorPosition'];
  button: EuiPopoverProps['button'];
  children: ReactNode;
  closePopover: EuiPopoverProps['closePopover'];
  isOpen: EuiPopoverProps['isOpen'];
  title?: string;
}) {
  return (
    <EuiPopover
      anchorPosition={anchorPosition}
      button={button}
      closePopover={closePopover}
      isOpen={isOpen}
      panelPaddingSize="s"
      ownFocus
    >
      {title && <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>}

      <PopoverContent size="s">{children}</PopoverContent>
    </EuiPopover>
  );
}
