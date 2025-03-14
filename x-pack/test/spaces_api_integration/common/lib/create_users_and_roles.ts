/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Agent as SuperTestAgent } from 'supertest';

import { AUTHENTICATION } from './authentication';

export const createUsersAndRoles = async (es: Client, supertest: SuperTestAgent) => {
  await supertest
    .put('/api/security/role/kibana_legacy_user')
    .send({
      elasticsearch: {
        indices: [
          {
            names: ['.kibana*'],
            privileges: ['manage', 'read', 'index', 'delete'],
          },
        ],
      },
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_dual_privileges_user')
    .send({
      elasticsearch: {
        indices: [
          {
            names: ['.kibana*'],
            privileges: ['manage', 'read', 'index', 'delete'],
          },
        ],
      },
      kibana: [
        {
          base: ['all'],
          spaces: ['*'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_dual_privileges_dashboard_only_user')
    .send({
      elasticsearch: {
        indices: [
          {
            names: ['.kibana*'],
            privileges: ['read', 'view_index_metadata'],
          },
        ],
      },
      kibana: [
        {
          base: ['read'],
          spaces: ['*'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_user')
    .send({
      kibana: [
        {
          base: ['all'],
          spaces: ['*'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_dashboard_only_user')
    .send({
      kibana: [
        {
          base: ['read'],
          spaces: ['*'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_default_space_all_user')
    .send({
      kibana: [
        {
          base: ['all'],
          spaces: ['default'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_default_space_read_user')
    .send({
      kibana: [
        {
          base: ['read'],
          spaces: ['default'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_space_1_all_user')
    .send({
      kibana: [
        {
          base: ['all'],
          spaces: ['space_1'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_space_1_read_user')
    .send({
      kibana: [
        {
          base: ['read'],
          spaces: ['space_1'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_space_2_all_user')
    .send({
      kibana: [
        {
          base: ['all'],
          spaces: ['space_2'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_space_2_read_user')
    .send({
      kibana: [
        {
          base: ['read'],
          spaces: ['space_2'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_space_1_2_all_user')
    .send({
      kibana: [
        {
          base: ['all'],
          spaces: ['space_1', 'space_2'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_space_1_2_read_user')
    .send({
      kibana: [
        {
          base: ['read'],
          spaces: ['space_1', 'space_2'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_space_3_all_user')
    .send({
      kibana: [
        {
          base: ['all'],
          spaces: ['space_3'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_space_3_read_user')
    .send({
      kibana: [
        {
          base: ['read'],
          spaces: ['space_3'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_default_space_saved_objects_all_user')
    .send({
      kibana: [
        {
          base: [],
          feature: {
            savedObjectsManagement: ['all'],
          },
          spaces: ['default'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_default_space_saved_objects_read_user')
    .send({
      kibana: [
        {
          base: [],
          feature: {
            savedObjectsManagement: ['read'],
          },
          spaces: ['default'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_space_1_saved_objects_all_user')
    .send({
      kibana: [
        {
          base: [],
          feature: {
            savedObjectsManagement: ['all'],
          },
          spaces: ['space_1'],
        },
      ],
    })
    .expect(204);

  await supertest
    .put('/api/security/role/kibana_rbac_space_1_saved_objects_read_user')
    .send({
      kibana: [
        {
          base: [],
          feature: {
            savedObjectsManagement: ['read'],
          },
          spaces: ['space_1'],
        },
      ],
    })
    .expect(204);

  await es.security.putUser({
    username: AUTHENTICATION.NOT_A_KIBANA_USER.username,
    password: AUTHENTICATION.NOT_A_KIBANA_USER.password,
    roles: [],
    full_name: 'not a kibana user',
    email: 'not_a_kibana_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_LEGACY_USER.username,
    password: AUTHENTICATION.KIBANA_LEGACY_USER.password,
    roles: ['kibana_legacy_user'],
    full_name: 'a kibana legacy user',
    email: 'a_kibana_legacy_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.username,
    password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_USER.password,
    roles: ['kibana_dual_privileges_user'],
    full_name: 'a kibana dual_privileges user',
    email: 'a_kibana_dual_privileges_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.username,
    password: AUTHENTICATION.KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER.password,
    roles: ['kibana_dual_privileges_dashboard_only_user'],
    full_name: 'a kibana dual_privileges dashboard only user',
    email: 'a_kibana_dual_privileges_dashboard_only_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_USER.password,
    roles: ['kibana_rbac_user'],
    full_name: 'a kibana user',
    email: 'a_kibana_rbac_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_DASHBOARD_ONLY_USER.password,
    roles: ['kibana_rbac_dashboard_only_user'],
    full_name: 'a kibana dashboard only user',
    email: 'a_kibana_rbac_dashboard_only_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_ALL_USER.password,
    roles: ['kibana_rbac_default_space_all_user'],
    full_name: 'a kibana default space all user',
    email: 'a_kibana_rbac_default_space_all_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_READ_USER.password,
    roles: ['kibana_rbac_default_space_read_user'],
    full_name: 'a kibana default space read-only user',
    email: 'a_kibana_rbac_default_space_read_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_ALL_USER.password,
    roles: ['kibana_rbac_space_1_all_user'],
    full_name: 'a kibana rbac space 1 all user',
    email: 'a_kibana_rbac_space_1_all_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_READ_USER.password,
    roles: ['kibana_rbac_space_1_read_user'],
    full_name: 'a kibana rbac space 1 read-only user',
    email: 'a_kibana_rbac_space_1_readonly_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_3_ALL_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_SPACE_3_ALL_USER.password,
    roles: ['kibana_rbac_space_3_all_user'],
    full_name: 'a kibana rbac space 3 all user',
    email: 'a_kibana_rbac_space_3_all_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_3_READ_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_SPACE_3_READ_USER.password,
    roles: ['kibana_rbac_space_3_read_user'],
    full_name: 'a kibana rbac space 3 read-only user',
    email: 'a_kibana_rbac_space_3_readonly_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_2_ALL_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_SPACE_2_ALL_USER.password,
    roles: ['kibana_rbac_space_2_all_user'],
    full_name: 'a kibana rbac space 2 all user',
    email: 'a_kibana_rbac_space_2_all_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_2_READ_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_SPACE_2_READ_USER.password,
    roles: ['kibana_rbac_space_2_read_user'],
    full_name: 'a kibana rbac space 2 read-only user',
    email: 'a_kibana_rbac_space_2_readonly_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_2_ALL_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_2_ALL_USER.password,
    roles: ['kibana_rbac_space_1_2_all_user'],
    full_name: 'a kibana rbac space 1 and 2 all user',
    email: 'a_kibana_rbac_space_1_2_all_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_2_READ_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_2_READ_USER.password,
    roles: ['kibana_rbac_space_1_2_read_user'],
    full_name: 'a kibana rbac space 1 and 2 read-only user',
    email: 'a_kibana_rbac_space_1_2_readonly_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_SAVED_OBJECTS_ALL_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_SAVED_OBJECTS_ALL_USER.password,
    roles: ['kibana_rbac_default_space_saved_objects_all_user'],
    full_name: 'a kibana rbac default space saved objects management all user',
    email: 'a_kibana_rbac_default_space_saved_objects_all_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_SAVED_OBJECTS_READ_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_DEFAULT_SPACE_SAVED_OBJECTS_READ_USER.password,
    roles: ['kibana_rbac_default_space_saved_objects_read_user'],
    full_name: 'a kibana rbac default space saved objects management read user',
    email: 'a_kibana_rbac_default_space_saved_objects_read_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_SAVED_OBJECTS_ALL_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_SAVED_OBJECTS_ALL_USER.password,
    roles: ['kibana_rbac_space_1_saved_objects_all_user'],
    full_name: 'a kibana rbac space 1 saved objects management all user',
    email: 'a_kibana_rbac_space_1_saved_objects_all_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.KIBANA_RBAC_SPACE_1_SAVED_OBJECTS_READ_USER.username,
    password: AUTHENTICATION.KIBANA_RBAC_SPACE_1_SAVED_OBJECTS_READ_USER.password,
    roles: ['kibana_rbac_space_1_saved_objects_read_user'],
    full_name: 'a kibana rbac space 1 saved objects management read user',
    email: 'a_kibana_rbac_space_1_saved_objects_read_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.MACHINE_LEARING_ADMIN.username,
    password: AUTHENTICATION.MACHINE_LEARING_ADMIN.password,
    roles: ['machine_learning_admin'],
    full_name: 'a machine learning admin',
    email: 'a_machine_learning_admin@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.MACHINE_LEARNING_USER.username,
    password: AUTHENTICATION.MACHINE_LEARNING_USER.password,
    roles: ['machine_learning_user'],
    full_name: 'a machine learning user',
    email: 'a_machine_learning_user@elastic.co',
  });

  await es.security.putUser({
    username: AUTHENTICATION.MONITORING_USER.username,
    password: AUTHENTICATION.MONITORING_USER.password,
    roles: ['monitoring_user'],
    full_name: 'a monitoring user',
    email: 'a_monitoring_user@elastic.co',
  });
};
