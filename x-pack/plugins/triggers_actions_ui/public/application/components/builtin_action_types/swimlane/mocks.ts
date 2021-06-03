/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const applicationFields = [
  {
    id: 'adnjls',
    name: 'Alert Source',
    key: 'alert-source',
    fieldType: 'text',
  },
  {
    id: 'adnlas',
    name: 'Severity',
    key: 'severity',
    fieldType: 'text',
  },
  {
    id: 'adnfls',
    name: 'Rule Name',
    key: 'rule-name',
    fieldType: 'text',
  },
  {
    id: 'a6sst',
    name: 'Case Id',
    key: 'case-id-name',
    fieldType: 'text',
  },
  {
    id: 'a6fst',
    name: 'Case Name',
    key: 'case-name',
    fieldType: 'text',
  },
  {
    id: 'a6fdf',
    name: 'Comments',
    key: 'comments',
    fieldType: 'notes',
  },
  {
    id: 'a6fde',
    name: 'Description',
    key: 'description',
    fieldType: 'text',
  },
];

export const mappings = {
  alertSourceConfig: applicationFields[0],
  severityConfig: applicationFields[1],
  ruleNameConfig: applicationFields[2],
  caseIdConfig: applicationFields[3],
  caseNameConfig: applicationFields[4],
  commentsConfig: applicationFields[5],
  descriptionConfig: applicationFields[6],
};
