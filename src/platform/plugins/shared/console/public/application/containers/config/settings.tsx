/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { AutocompleteOptions, SettingsEditor } from '../../components/settings';

import { useServicesContext, useEditorActionContext } from '../../contexts';
import { DevToolsSettings, Settings as SettingsService } from '../../../services';

const getAutocompleteDiff = (
  newSettings: DevToolsSettings,
  prevSettings: DevToolsSettings
): AutocompleteOptions[] => {
  return Object.keys(newSettings.autocomplete).filter((key) => {
    // @ts-ignore
    return prevSettings.autocomplete[key] !== newSettings.autocomplete[key];
  }) as AutocompleteOptions[];
};

export function Settings() {
  const {
    services: { settings, autocompleteInfo, esHostService },
  } = useServicesContext();

  const dispatch = useEditorActionContext();

  const refreshAutocompleteSettings = (
    settingsService: SettingsService,
    selectedSettings: DevToolsSettings['autocomplete']
  ) => {
    autocompleteInfo.retrieve(settingsService, selectedSettings);
  };

  const fetchAutocompleteSettingsIfNeeded = (
    settingsService: SettingsService,
    newSettings: DevToolsSettings,
    prevSettings: DevToolsSettings
  ) => {
    // We'll only retrieve settings if polling is on. The expectation here is that if the user
    // disables polling it's because they want manual control over the fetch request (possibly
    // because it's a very expensive request given their cluster and bandwidth). In that case,
    // they would be unhappy with any request that's sent automatically.
    if (newSettings.polling) {
      const autocompleteDiff = getAutocompleteDiff(newSettings, prevSettings);

      const isSettingsChanged = autocompleteDiff.length > 0;
      const isPollingChanged = prevSettings.polling !== newSettings.polling;

      if (isSettingsChanged) {
        // If the user has changed one of the autocomplete settings, then we'll fetch just the
        // ones which have changed.
        const changedSettings: DevToolsSettings['autocomplete'] = autocompleteDiff.reduce(
          (changedSettingsAccum, setting) => {
            changedSettingsAccum[setting] = newSettings.autocomplete[setting];
            return changedSettingsAccum;
          },
          {} as DevToolsSettings['autocomplete']
        );
        autocompleteInfo.retrieve(settingsService, {
          ...settingsService.getAutocomplete(),
          ...changedSettings,
        });
      } else if (isPollingChanged && newSettings.polling) {
        // If the user has turned polling on, then we'll fetch all selected autocomplete settings.
        autocompleteInfo.retrieve(settingsService, settingsService.getAutocomplete());
      }
    }
  };

  const onSaveSettings = (newSettings: DevToolsSettings) => {
    const prevSettings = settings.toJSON();
    fetchAutocompleteSettingsIfNeeded(settings, newSettings, prevSettings);

    // Update the new settings in localStorage
    settings.updateSettings(newSettings);

    // Let the rest of the application know settings have updated.
    dispatch({
      type: 'updateSettings',
      payload: newSettings,
    });
  };

  return (
    <SettingsEditor
      onSaveSettings={onSaveSettings}
      refreshAutocompleteSettings={(selectedSettings) =>
        refreshAutocompleteSettings(settings, selectedSettings)
      }
      settings={settings.toJSON()}
      esHostService={esHostService}
    />
  );
}
