/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { isEmpty, sortBy } from 'lodash';
import {
  EuiSelectable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiTextColor,
  EuiHighlight,
  EuiIcon,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import { useIsUserTyping } from '../../../common/use_is_user_typing';
import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import type { Case } from '../../../../common';
import * as i18n from './translations';
import { useItemsState } from '../use_items_state';
import type { ItemSelectableOption, ItemsSelectionState } from '../types';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { EmptyMessage } from '../../user_profiles/empty_message';
import { NoMatches } from '../../user_profiles/no_matches';

interface Props {
  selectedCases: Case[];
  userProfiles: Map<string, UserProfileWithAvatar>;
  isLoading: boolean;
  onChangeAssignees: (args: ItemsSelectionState) => void;
}

type AssigneeSelectableOption = ItemSelectableOption<Partial<UserProfileWithAvatar>>;

const EditAssigneesSelectableComponent: React.FC<Props> = ({
  selectedCases,
  userProfiles,
  isLoading,
  onChangeAssignees,
}) => {
  const { owner: owners } = useCasesContext();
  const { euiTheme } = useEuiTheme();
  const { isUserTyping, onContentChange, onDebounce } = useIsUserTyping();
  // TODO: Include unknown users
  const userProfileIds = [...userProfiles.keys()];

  const [searchValue, setSearchValue] = useState<string>('');
  const { data: searchResultUserProfiles, isLoading: isLoadingSuggest } = useSuggestUserProfiles({
    name: searchValue,
    owners,
    onDebounce,
  });

  const itemToSelectableOption = useCallback(
    (item: { key: string; data: Record<string, unknown> }): AssigneeSelectableOption => {
      // TODO: Fix types
      const userProfileFromData = item.data as unknown as UserProfileWithAvatar;
      const userProfile = isEmpty(userProfileFromData)
        ? userProfiles.get(item.key)
        : userProfileFromData;

      if (userProfile) {
        return toSelectableOption(userProfile);
      }

      const profileInSuggestedUsers = searchResultUserProfiles?.find(
        (profile) => profile.uid === item.data.uid
      );

      if (profileInSuggestedUsers) {
        return toSelectableOption(profileInSuggestedUsers);
      }

      // TODO: Put unknown label
      return {
        key: item.key,
        label: item.key,
        'data-test-subj': `cases-actions-assignees-edit-selectable-assignee-${item.key}`,
      } as AssigneeSelectableOption;
    },
    [searchResultUserProfiles, userProfiles]
  );

  const { options, totalSelectedItems, onChange } = useItemsState({
    items: userProfileIds,
    selectedCases,
    fieldSelector: (theCase) => theCase.assignees.map(({ uid }) => uid),
    onChangeItems: onChangeAssignees,
    itemToSelectableOption,
  });

  const finalOptions = getDisplayOptions({
    searchResultUserProfiles: searchResultUserProfiles ?? [],
    options,
    searchValue,
    initialUserProfiles: userProfiles,
  });

  const isLoadingData = isLoading || isLoadingSuggest || isUserTyping;

  const renderOption = useCallback(
    (option: AssigneeSelectableOption, search: string) => {
      const icon = option.itemIcon ?? 'empty';
      const dataTestSubj = `cases-actions-assignees-edit-selectable-assignee-${option.key}-icon-${icon}`;

      if (!option.user) {
        return <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>;
      }

      return (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              justifyContent="center"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type={icon} data-test-subj={dataTestSubj} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <UserAvatar user={option.user} avatar={option.data?.avatar} size="s" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem>
              <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
            </EuiFlexItem>
            {option.user.email && option.user.email !== option.label ? (
              <EuiFlexItem grow={false}>
                <EuiTextColor color={option.disabled ? 'disabled' : 'subdued'}>
                  {searchValue ? (
                    <EuiHighlight search={searchValue}>{option.user.email}</EuiHighlight>
                  ) : (
                    option.user.email
                  )}
                </EuiTextColor>
              </EuiFlexItem>
            ) : undefined}
          </EuiFlexGroup>
        </EuiFlexGroup>
      );
    },
    [searchValue]
  );

  const onSearchChange = useCallback(
    (value) => {
      setSearchValue(value);
      onContentChange(value);
    },
    [onContentChange]
  );

  return (
    <EuiSelectable
      options={finalOptions}
      searchable
      searchProps={{
        placeholder: i18n.SEARCH_PLACEHOLDER,
        isLoading: isLoadingData,
        isClearable: !isLoadingData,
        onChange: onSearchChange,
        value: searchValue,
        'data-test-subj': 'cases-actions-assignees-edit-selectable-search-input',
      }}
      renderOption={renderOption}
      listProps={{ showIcons: false }}
      onChange={onChange}
      noMatchesMessage={!isLoadingData ? <NoMatches /> : <EmptyMessage />}
      emptyMessage={<EmptyMessage />}
      data-test-subj="cases-actions-assignees-edit-selectable"
      height="full"
    >
      {(list, search) => {
        return (
          <>
            {search}
            <EuiSpacer size="s" />
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              responsive={false}
              direction="row"
              css={{ flexGrow: 0 }}
              gutterSize="none"
            >
              <EuiFlexItem
                grow={false}
                css={{
                  paddingLeft: euiTheme.size.s,
                }}
              >
                <EuiText size="xs" color="subdued">
                  {i18n.SELECTED_ASSIGNEES(totalSelectedItems)}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="m" />
            {list}
          </>
        );
      }}
    </EuiSelectable>
  );
};

EditAssigneesSelectableComponent.displayName = 'EditAssigneesSelectable';

export const EditAssigneesSelectable = React.memo(EditAssigneesSelectableComponent);

const getDisplayOptions = ({
  searchResultUserProfiles,
  options,
  searchValue,
  initialUserProfiles,
}: {
  searchResultUserProfiles: UserProfileWithAvatar[];
  options: AssigneeSelectableOption[];
  searchValue: string;
  initialUserProfiles: Map<string, UserProfileWithAvatar>;
}) => {
  /**
   * If the user does not perform any search we do not want to show
   * the results of an empty search to the initial list of users.
   * We also filter out users that appears both in the initial list
   * and the search results
   */
  const searchResultsOptions = isEmpty(searchValue)
    ? []
    : searchResultUserProfiles
        ?.filter((profile) => !options.find((option) => isMatchingOption(option, profile)))
        ?.map((profile) => toSelectableOption(profile)) ?? [];
  /**
   * In the initial view, when the user does not perform any search,
   * we want to filter out options that are not in the initial user profile
   * mapping or profiles returned by the search result that are not selected
   */
  const filteredOptions = isEmpty(searchValue)
    ? options.filter(
        (option) => initialUserProfiles.has(option?.data?.uid) || option?.data?.itemIcon !== 'empty'
      )
    : [...options];

  const finalOptions = sortOptionsAlphabetically([...searchResultsOptions, ...filteredOptions]);

  return finalOptions;
};

const sortOptionsAlphabetically = (options: AssigneeSelectableOption[]) =>
  /**
   * sortBy will not mutate the original array.
   * It will return a new sorted array
   *  */
  sortBy(options, (option) => option.label);

const toSelectableOption = (userProfile: UserProfileWithAvatar): AssigneeSelectableOption => {
  return {
    key: userProfile.uid,
    label: getUserDisplayName(userProfile.user),
    data: userProfile,
    'data-test-subj': `cases-actions-assignees-edit-selectable-assignee-${userProfile.uid}`,
  } as unknown as AssigneeSelectableOption;
};

const isMatchingOption = <Option extends UserProfileWithAvatar | null>(
  option: AssigneeSelectableOption,
  profile: UserProfileWithAvatar
) => {
  return option.key === profile.uid;
};
