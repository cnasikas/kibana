/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { getEmptyTagValue } from '../../../empty_value';
import { Columns } from '../../../paginated_table';
import { CaseSavedObject } from '../../../../graphql/types';
import { FormattedRelativePreferenceDate } from '../../../formatted_date';

export type CasesColumns = [
  Columns<CaseSavedObject['attributes']['title']>,
  Columns<CaseSavedObject['id']>,
  Columns<CaseSavedObject['attributes']['created_by']['username']>,
  Columns<CaseSavedObject['attributes']['created_at']>,
  Columns<CaseSavedObject['updated_at']>,
  Columns<CaseSavedObject['attributes']['state']>
];

const renderStringField = (field: string) => (field != null ? field : getEmptyTagValue());

export const getCasesColumns = (): CasesColumns => [
  {
    field: 'attributes.title',
    name: 'Case Title',
    render: title => renderStringField(title),
  },
  {
    field: 'id',
    name: 'Case Id',
    render: id => renderStringField(id),
  },
  {
    field: 'attributes.created_at',
    name: 'Created at',
    render: createdAt => {
      if (createdAt != null) {
        return <FormattedRelativePreferenceDate value={createdAt} />;
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'attributes.created_by.username',
    name: 'Created by',
    render: createdBy => renderStringField(createdBy),
  },
  {
    field: 'updated_at',
    name: 'Last updated',
    render: updatedAt => {
      if (updatedAt != null) {
        return <FormattedRelativePreferenceDate value={updatedAt} />;
      }
      return getEmptyTagValue();
    },
  },
  {
    field: 'attributes.state',
    name: 'State',
    render: state => renderStringField(state),
  },
];
