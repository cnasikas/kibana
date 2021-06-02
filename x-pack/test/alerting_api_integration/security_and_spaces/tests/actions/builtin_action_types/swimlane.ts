/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import httpProxy from 'http-proxy';
import expect from '@kbn/expect';

import { getHttpProxyServer } from '../../../../common/lib/get_proxy_server';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default function swimlaneTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');

  const mockSwimlane = {
    name: 'A swimlane action',
    actionTypeId: '.swimlane',
    config: {
      apiUrl: 'http://swimlane.mynonexistent.com',
      appId: '123456asdf',
      connectorType: 'all',
      mappings: {
        alertSourceConfig: {
          id: 'adnjls',
          name: 'Alert Source',
          key: 'alert-source',
          fieldType: 'text',
        },
        severityConfig: {
          id: 'adnlas',
          name: 'Severity',
          key: 'severity',
          fieldType: 'text',
        },
        alertNameConfig: {
          id: 'adnfls',
          name: 'Alert Name',
          key: 'alert-name',
          fieldType: 'text',
        },
        caseIdConfig: {
          id: 'a6sst',
          name: 'Case Id',
          key: 'case-id-name',
          fieldType: 'text',
        },
        caseNameConfig: {
          id: 'a6fst',
          name: 'Case Name',
          key: 'case-name',
          fieldType: 'text',
        },
        commentsConfig: {
          id: 'a6fdf',
          name: 'Comments',
          key: 'comments',
          fieldType: 'notes',
        },
        descriptionConfig: {
          id: 'a6fdf',
          name: 'Description',
          key: 'description',
          fieldType: 'text',
        },
      },
    },
    secrets: {
      apiToken: 'swimlane-api-key',
    },
    params: {
      subAction: 'pushToService',
      subActionParams: {
        incident: {
          alertName: 'Alert Name',
          severity: 'Critical',
          alertSource: 'Elastic',
          caseName: 'Case Name',
          caseId: 'es3456789',
          description: 'This is a description',
          externalId: null,
        },
        comments: [
          {
            comment: 'first comment',
            commentId: '123',
          },
        ],
      },
    },
  };

  describe('Swimlane', () => {
    let swimlaneSimulatorURL: string = '<could not determine kibana url>';
    // need to wait for kibanaServer to settle ...
    before(async () => {
      swimlaneSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.SWIMLANE)
      );
    });

    describe('Swimlane - Action Creation', () => {
      it('should return 200 when creating a swimlane action successfully', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A swimlane action',
            connector_type_id: '.swimlane',
            config: {
              ...mockSwimlane.config,
              apiUrl: swimlaneSimulatorURL,
            },
            secrets: mockSwimlane.secrets,
          })
          .expect(200);

        expect(createdAction).to.eql({
          config: {
            ...mockSwimlane.config,
            apiUrl: swimlaneSimulatorURL,
          },
          connector_type_id: '.swimlane',
          id: createdAction.id,
          is_missing_secrets: false,
          is_preconfigured: false,
          name: 'A swimlane action',
        });

        expect(typeof createdAction.id).to.be('string');

        const { body: fetchedAction } = await supertest
          .get(`/api/actions/connector/${createdAction.id}`)
          .expect(200);

        expect(fetchedAction).to.eql({
          id: fetchedAction.id,
          is_preconfigured: false,
          is_missing_secrets: false,
          name: 'A swimlane action',
          connector_type_id: '.swimlane',
          config: {
            ...mockSwimlane.config,
            apiUrl: swimlaneSimulatorURL,
          },
        });
      });

      it('should respond with a 400 Bad Request when creating a swimlane action with no apiUrl', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A swimlane action',
            connector_type_id: '.swimlane',
            config: {
              appId: mockSwimlane.config.appId,
              mappings: mockSwimlane.config.mappings,
            },
            secrets: mockSwimlane.secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [apiUrl]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a swimlane action with no appId', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A swimlane action',
            connector_type_id: '.swimlane',
            config: {
              mappings: mockSwimlane.config.mappings,
              apiUrl: swimlaneSimulatorURL,
            },
            secrets: mockSwimlane.secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [appId]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a swimlane action without secrets', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A swimlane action',
            connector_type_id: '.swimlane',
            config: {
              ...mockSwimlane.config,
              apiUrl: swimlaneSimulatorURL,
            },
            secrets: {},
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: [apiToken]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should respond with a 400 Bad Request default swimlane url is not present in allowedHosts', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A swimlane action',
            connector_type_id: '.swimlane',
            config: mockSwimlane.config,
            secrets: mockSwimlane.secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: `error validating action type config: error configuring connector action: target url "${mockSwimlane.config.apiUrl}" is not added to the Kibana config xpack.actions.allowedHosts`,
            });
          });
      });
    });

    describe('Swimlane - Executor', () => {
      let simulatedActionId: string;
      let proxyServer: httpProxy | undefined;
      let proxyHaveBeenCalled = false;
      before(async () => {
        const { body } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A swimlane simulator',
            connector_type_id: '.swimlane',
            config: {
              ...mockSwimlane.config,
              apiUrl: swimlaneSimulatorURL,
            },
            secrets: mockSwimlane.secrets,
          });
        simulatedActionId = body.id;

        proxyServer = await getHttpProxyServer(
          kibanaServer.resolveUrl('/'),
          configService.get('kbnTestServer.serverArgs'),
          () => {
            proxyHaveBeenCalled = true;
          }
        );
      });

      describe('Validation', () => {
        it('should handle failing with a simulated success without action', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {},
            })
            .then((resp: any) => {
              expect(Object.keys(resp.body)).to.eql(['status', 'message', 'retry', 'connector_id']);
              expect(resp.body.connector_id).to.eql(simulatedActionId);
              expect(resp.body.status).to.eql('error');
              expect(resp.body.retry).to.eql(false);
              // Node.js 12 oddity:
              //
              // The first time after the server is booted, the error message will be:
              //
              //     undefined is not iterable (cannot read property Symbol(Symbol.iterator))
              //
              // After this, the error will be:
              //
              //     Cannot destructure property 'value' of 'undefined' as it is undefined.
              //
              // The error seems to come from the exact same place in the code based on the
              // exact same circomstances:
              //
              //     https://github.com/elastic/kibana/blob/b0a223ebcbac7e404e8ae6da23b2cc6a4b509ff1/packages/kbn-config-schema/src/types/literal_type.ts#L28
              //
              // What triggers the error is that the `handleError` function expects its 2nd
              // argument to be an object containing a `valids` property of type array.
              //
              // In this test the object does not contain a `valids` property, so hence the
              // error.
              //
              // Why the error message isn't the same in all scenarios is unknown to me and
              // could be a bug in V8.
              expect(resp.body.message).to.match(
                /^error validating action params: (undefined is not iterable \(cannot read property Symbol\(Symbol.iterator\)\)|Cannot destructure property 'value' of 'undefined' as it is undefined\.)$/
              );
            });
        });

        it('should handle failing with a simulated success without unsupported action', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'non-supported' },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: [subAction]: expected value to equal [pushToService]',
              });
            });
        });

        /**
         * All subActionParams are optional.
         * If subActionParams is not provided all
         * the subActionParams attributes will be set to null
         * and the validation will succeed. For that reason,
         * the subActionParams need to be set to null.
         */
        it('should handle failing with a simulated success without subActionParams', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'pushToService', subActionParams: null },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: [subActionParams]: expected a plain object value, but found [null] instead.',
              });
            });
        });

        it('should handle failing with a simulated success without commentId', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockSwimlane.params,
                subActionParams: {
                  ...mockSwimlane.params.subActionParams,
                  comments: [{ comment: 'comment' }],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: [subActionParams.incident.comments]: definition for this key is missing',
              });
            });
        });

        it('should handle failing with a simulated success without comment message', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockSwimlane.params,
                subActionParams: {
                  ...mockSwimlane.params.subActionParams,
                  comments: [{ commentId: 'success' }],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: [subActionParams.incident.comments]: definition for this key is missing',
              });
            });
        });
      });

      describe('Execution', () => {
        it('should handle creating an incident', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockSwimlane.params,
                subActionParams: {
                  ...mockSwimlane.params.subActionParams,
                  comments: [],
                },
              },
            })
            .expect(200);

          expect(proxyHaveBeenCalled).to.equal(true);
          expect(body).to.eql({
            status: 'ok',
            connector_id: simulatedActionId,
            data: {
              id: 'wowzeronza',
              title: 'ET-69',
              pushedDate: '2021-06-01T17:29:51.092Z',
              url: `${swimlaneSimulatorURL}/record/123456asdf/wowzeronza`,
            },
          });
        });

        it('should handle updating an incident', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockSwimlane.params,
                subActionParams: {
                  incident: {
                    ...mockSwimlane.params.subActionParams.incident,
                    externalId: 'wowzeronza',
                  },
                  comments: [],
                },
              },
            })
            .expect(200);

          expect(proxyHaveBeenCalled).to.equal(true);
          expect(body).to.eql({
            status: 'ok',
            connector_id: simulatedActionId,
            data: {
              id: 'wowzeronza',
              title: 'ET-69',
              pushedDate: '2021-06-01T17:29:51.092Z',
              url: `${swimlaneSimulatorURL}/record/123456asdf/wowzeronza`,
            },
          });
        });
      });
      after(() => {
        if (proxyServer) {
          proxyServer.close();
        }
      });
    });
  });
}
