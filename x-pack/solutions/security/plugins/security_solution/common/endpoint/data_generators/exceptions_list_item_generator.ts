/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ExceptionListItemSchema,
  type CreateExceptionListItemSchema,
  type UpdateExceptionListItemSchema,
  type EntriesArray,
  ListOperatorTypeEnum,
  type ListOperatorType,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LISTS, ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import { ConditionEntryField } from '@kbn/securitysolution-utils';
import { LIST_ITEM_ENTRY_OPERATOR_TYPES } from './common/artifact_list_item_entry_values';
import { BaseDataGenerator } from './base_data_generator';
import { BY_POLICY_ARTIFACT_TAG_PREFIX, GLOBAL_ARTIFACT_TAG } from '../service/artifacts/constants';
import { ENDPOINT_EVENTS_LOG_INDEX_FIELDS } from './common/alerts_ecs_fields';

/** Utility that removes null and undefined from a Type's property value */
type NonNullableTypeProperties<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};

/**
 * Normalizes the create type to remove `undefined`/`null` from the returned type since the generator or sure to
 * create a value for (almost) all properties
 */
type CreateExceptionListItemSchemaWithNonNullProps = NonNullableTypeProperties<
  Omit<CreateExceptionListItemSchema, 'meta' | 'expire_time'>
> &
  Pick<CreateExceptionListItemSchema, 'meta' | 'expire_time'>;

type UpdateExceptionListItemSchemaWithNonNullProps = NonNullableTypeProperties<
  Omit<UpdateExceptionListItemSchema, 'meta' | 'expire_time'>
> &
  Pick<UpdateExceptionListItemSchema, 'meta' | 'expire_time'>;

export const exceptionItemToCreateExceptionItem = (
  exceptionItem: ExceptionListItemSchema
): CreateExceptionListItemSchemaWithNonNullProps => {
  const {
    /* eslint-disable @typescript-eslint/naming-convention */
    description,
    entries,
    expire_time,
    list_id,
    name,
    type,
    comments,
    item_id,
    meta,
    namespace_type,
    os_types,
    tags,
    /* eslint-enable @typescript-eslint/naming-convention */
  } = exceptionItem;

  return {
    description,
    entries,
    expire_time,
    list_id,
    name,
    type,
    comments,
    item_id,
    meta,
    namespace_type,
    os_types,
    tags,
  };
};

const exceptionItemToUpdateExceptionItem = (
  exceptionItem: ExceptionListItemSchema
): UpdateExceptionListItemSchemaWithNonNullProps => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { id, item_id, _version } = exceptionItem;
  const { list_id: _, ...updateAttributes } = exceptionItemToCreateExceptionItem(exceptionItem);

  return {
    ...updateAttributes,
    id,
    item_id,
    _version: _version ?? 'some value',
  };
};

const EFFECTIVE_SCOPE: readonly string[] = [
  `${BY_POLICY_ARTIFACT_TAG_PREFIX}123-456`, // Policy Specific
  GLOBAL_ARTIFACT_TAG,
];

export class ExceptionsListItemGenerator extends BaseDataGenerator<ExceptionListItemSchema> {
  generate(overrides: Partial<ExceptionListItemSchema> = {}): ExceptionListItemSchema {
    const exceptionItem: ExceptionListItemSchema = {
      _version: this.randomString(5),
      comments: [],
      created_at: this.randomPastDate(),
      created_by: this.randomUser(),
      description: 'created by ExceptionListItemGenerator',
      entries: [
        {
          field: 'process.hash.md5',
          operator: 'included',
          type: 'match',
          value: '741462ab431a22233C787BAAB9B653C7',
        },
      ],
      expire_time: undefined,
      id: this.seededUUIDv4(),
      item_id: this.seededUUIDv4(),
      list_id: 'endpoint_list_id',
      meta: undefined,
      name: `Generated Exception (${this.randomString(5)})`,
      namespace_type: 'agnostic',
      os_types: [this.randomOSFamily()] as ExceptionListItemSchema['os_types'],
      tags: [this.randomChoice(EFFECTIVE_SCOPE)],
      tie_breaker_id: this.seededUUIDv4(),
      type: 'simple',
      updated_at: '2020-04-20T15:25:31.830Z',
      updated_by: this.randomUser(),
      ...(overrides || {}),
    };

    // If the `entries` was not overwritten, then add in the PATH condition with a
    // value that is OS appropriate
    if (!overrides.entries) {
      exceptionItem.entries.push({
        field: ConditionEntryField.PATH,
        operator: 'included',
        type: 'match',
        value: exceptionItem.os_types[0] === 'windows' ? 'c:\\fol\\bin.exe' : '/one/two/three',
      });
    }

    return exceptionItem;
  }

  generateForCreate(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): CreateExceptionListItemSchemaWithNonNullProps {
    return Object.assign(exceptionItemToCreateExceptionItem(this.generate()), overrides);
  }

  generateEndpointException(
    overrides: Partial<ExceptionListItemSchema> = {}
  ): ExceptionListItemSchema {
    return this.generate({
      name: `Endpoint exception (${this.randomString(5)})`,
      list_id: ENDPOINT_LIST_ID,
      entries: this.randomEndpointExceptionEntries(1),
      tags: [],
      ...overrides,
    });
  }

  generateEndpointExceptionForCreate(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): CreateExceptionListItemSchema {
    return {
      ...exceptionItemToCreateExceptionItem(this.generateEndpointException()),
      ...overrides,
    };
  }

  protected randomEndpointExceptionEntries(
    count: number = this.randomN(5)
  ): ExceptionListItemSchema['entries'] {
    const operatorTypes = LIST_ITEM_ENTRY_OPERATOR_TYPES.filter(
      (item) =>
        !(
          [
            ListOperatorTypeEnum.LIST,
            ListOperatorTypeEnum.NESTED,
            ListOperatorTypeEnum.EXISTS,
          ] as ListOperatorType[]
        ).includes(item)
    );
    const fieldList = ENDPOINT_EVENTS_LOG_INDEX_FIELDS.filter((field) => field.endsWith('.text'));

    return Array.from({ length: count || 1 }, () => {
      const operatorType = this.randomChoice(operatorTypes);

      return {
        field: this.randomChoice(fieldList),
        operator: 'included',
        type: operatorType,
        value:
          operatorType === ListOperatorTypeEnum.MATCH_ANY
            ? [this.randomString(10), this.randomString(10)]
            : this.randomString(10),
      };
    }) as ExceptionListItemSchema['entries'];
  }

  generateTrustedApp(overrides: Partial<ExceptionListItemSchema> = {}): ExceptionListItemSchema {
    return this.generate({
      name: `Trusted app (${this.randomString(5)})`,
      list_id: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
      ...overrides,
    });
  }

  generateTrustedAppForCreate(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): CreateExceptionListItemSchemaWithNonNullProps {
    return {
      ...exceptionItemToCreateExceptionItem(this.generateTrustedApp()),
      ...overrides,
    };
  }

  generateTrustedAppForUpdate(
    overrides: Partial<UpdateExceptionListItemSchema> = {}
  ): UpdateExceptionListItemSchemaWithNonNullProps {
    return {
      ...exceptionItemToUpdateExceptionItem(this.generateTrustedApp()),
      ...overrides,
    };
  }

  generateTrustedAppSignerEntry(os = 'windows'): EntriesArray {
    return [
      {
        field: os === 'windows' ? 'process.Ext.code_signature' : 'process.code_signature',
        entries: [
          {
            field: 'trusted',
            value: 'true',
            type: 'match',
            operator: 'included',
          },
          {
            field: 'subject_name',
            value: 'foo',
            type: 'match',
            operator: 'included',
          },
        ],
        type: 'nested',
      },
    ];
  }

  generateEventFilter(overrides: Partial<ExceptionListItemSchema> = {}): ExceptionListItemSchema {
    return this.generate({
      name: `Event filter (${this.randomString(5)})`,
      list_id: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
      entries: [
        {
          field: 'process.pe.company',
          operator: 'excluded',
          type: 'match',
          value: 'elastic',
        },
        {
          entries: [
            {
              field: 'status',
              operator: 'included',
              type: 'match',
              value: 'dfdfd',
            },
          ],
          field: 'process.Ext.code_signature',
          type: 'nested',
        },
      ],
      ...overrides,
    });
  }

  generateEventFilterForCreate(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): CreateExceptionListItemSchemaWithNonNullProps {
    return {
      ...exceptionItemToCreateExceptionItem(this.generateEventFilter()),
      ...overrides,
    };
  }

  generateEventFilterForUpdate(
    overrides: Partial<UpdateExceptionListItemSchema> = {}
  ): UpdateExceptionListItemSchemaWithNonNullProps {
    return {
      ...exceptionItemToUpdateExceptionItem(this.generateEventFilter()),
      ...overrides,
    };
  }

  generateHostIsolationException(
    overrides: Partial<ExceptionListItemSchema> = {}
  ): ExceptionListItemSchema {
    return this.generate({
      name: `Host Isolation (${this.randomString(5)})`,
      list_id: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
      os_types: ['macos', 'linux', 'windows'],
      entries: [
        {
          field: 'destination.ip',
          operator: 'included',
          type: 'match',
          value: '0.0.0.0/24',
        },
      ],
      ...overrides,
    });
  }

  generateHostIsolationExceptionForCreate(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): CreateExceptionListItemSchemaWithNonNullProps {
    return {
      ...exceptionItemToCreateExceptionItem(this.generateHostIsolationException()),
      ...overrides,
    };
  }
  generateHostIsolationExceptionForUpdate(
    overrides: Partial<UpdateExceptionListItemSchema> = {}
  ): UpdateExceptionListItemSchemaWithNonNullProps {
    return {
      ...exceptionItemToUpdateExceptionItem(this.generateHostIsolationException()),
      ...overrides,
    };
  }

  generateBlocklist(overrides: Partial<ExceptionListItemSchema> = {}): ExceptionListItemSchema {
    const os = this.randomOSFamily() as ExceptionListItemSchema['os_types'][number];
    const entriesList: CreateExceptionListItemSchema['entries'] = [
      {
        field: 'file.path',
        value:
          os === 'windows'
            ? ['C:\\some\\path', 'C:\\some\\other\\path', 'C:\\yet\\another\\path']
            : ['/some/path', 'some/other/path', 'yet/another/path'],
        type: 'match_any',
        operator: 'included',
      },
      {
        field: 'file.hash.sha256',
        value: [
          'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
          '2C26B46B68FFC68FF99B453C1D30413413422D706483BFA0F98A5E886266E7AE',
          'FCDE2B2EDBA56BF408601FB721FE9B5C338D10EE429EA04FAE5511B68FBF8FB9',
        ],
        type: 'match_any',
        operator: 'included',
      },
      {
        field: 'file.hash.md5',
        value: ['741462ab431a22233C787BAAB9B653C7'],
        type: 'match_any',
        operator: 'included',
      },
      {
        field: 'file.hash.sha1',
        value: ['aedb279e378BED6C2DB3C9DC9e12ba635e0b391c'],
        type: 'match_any',
        operator: 'included',
      },
    ];

    if (os === 'windows') {
      entriesList.push({
        field: 'file.Ext.code_signature',
        entries: [
          {
            field: 'subject_name',
            value: ['notsus.exe', 'verynotsus.exe', 'superlegit.exe'],
            type: 'match_any',
            operator: 'included',
          },
        ],
        type: 'nested',
      });
    }

    return this.generate({
      name: `Blocklist ${this.randomString(5)}`,
      list_id: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
      item_id: `generator_endpoint_blocklist_${this.seededUUIDv4()}`,
      tags: [this.randomChoice([BY_POLICY_ARTIFACT_TAG_PREFIX, GLOBAL_ARTIFACT_TAG])],
      os_types: [os],
      entries: [entriesList[this.randomN(entriesList.length)]],
      ...overrides,
    });
  }

  generateBlocklistForCreate(
    overrides: Partial<CreateExceptionListItemSchema> = {}
  ): CreateExceptionListItemSchemaWithNonNullProps {
    return {
      ...exceptionItemToCreateExceptionItem(this.generateBlocklist()),
      ...overrides,
    };
  }

  generateBlocklistForUpdate(
    overrides: Partial<UpdateExceptionListItemSchema> = {}
  ): UpdateExceptionListItemSchemaWithNonNullProps {
    return {
      ...exceptionItemToUpdateExceptionItem(this.generateBlocklist()),
      ...overrides,
    };
  }
}
