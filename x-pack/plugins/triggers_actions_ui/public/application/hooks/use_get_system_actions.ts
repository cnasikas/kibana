/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../common/lib/kibana';
import { getSystemActions } from '../lib/action_connector_api/get_system_actions';

export const useGetSystemActions = () => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryFn = () => {
    return getSystemActions({ http });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('xpack.triggersActionsUI.rulesSettings.modal.getRulesSettingsError', {
        defaultMessage: 'Failed to get system actions.',
      })
    );
  };

  const { data, isFetching, isLoading } = useQuery({
    queryKey: ['getSystemActions'],
    queryFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
  });

  return {
    isLoading,
    isFetching,
    data,
  };
};
