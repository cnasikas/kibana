/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const securityService = getService('security');
  const config = getService('config');
  const { common, error, visualize, header, security } = getPageObjects([
    'common',
    'error',
    'visualize',
    'header',
    'security',
  ]);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');
  const queryBar = getService('queryBar');
  const savedQueryManagementComponent = getService('savedQueryManagementComponent');

  // more tests are in x-pack/test/functional/apps/saved_query_management/feature_controls/security.ts

  describe('visualize feature controls security', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/visualize/default'
      );
      await esArchiver.loadIfNeeded(
        'x-pack/platform/test/fixtures/es_archives/logstash_functional'
      );
      // ensure we're logged out so we can login as the appropriate users
      await security.forceLogout();
    });

    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await security.forceLogout();
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('global visualize all privileges', () => {
      before(async () => {
        await securityService.role.create('global_visualize_all_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                visualize: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await securityService.user.create('global_visualize_all_user', {
          password: 'global_visualize_all_user-password',
          roles: ['global_visualize_all_role'],
          full_name: 'test user',
        });

        await security.forceLogout();

        await security.login('global_visualize_all_user', 'global_visualize_all_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await security.forceLogout();
        await securityService.role.delete('global_visualize_all_role');
        await securityService.user.delete('global_visualize_all_user');
      });

      it('shows visualize navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Visualize library');
      });

      it(`landing page shows "Create new Visualization" button`, async () => {
        await visualize.gotoVisualizationLandingPage();
        await testSubjects.existOrFail('visualizationLandingPage', {
          timeout: config.get('timeouts.waitFor'),
        });
        await testSubjects.existOrFail('newItemButton');
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });

      it(`can view existing Visualization`, async () => {
        await common.navigateToActualUrl('visualize', '/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('visualizationLoader', {
          timeout: config.get('timeouts.waitFor'),
        });
      });

      it('can save existing Visualization', async () => {
        await common.navigateToActualUrl('visualize', '/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('visualizeSaveButton', {
          timeout: config.get('timeouts.waitFor'),
        });
      });

      it('allows saving via the saved query management component popover with no saved query loaded', async () => {
        await queryBar.setQuery('response:200');
        await queryBar.clickQuerySubmitButton();
        await testSubjects.click('showQueryBarMenu');
        await savedQueryManagementComponent.saveNewQuery('foo', 'bar', true, false);
        await header.waitUntilLoadingHasFinished();
        await savedQueryManagementComponent.savedQueryExistOrFail('foo');
        await savedQueryManagementComponent.closeSavedQueryManagementComponent();
        await testSubjects.click('showQueryBarMenu');
        await savedQueryManagementComponent.deleteSavedQuery('foo');
        await savedQueryManagementComponent.savedQueryMissingOrFail('foo');
      });

      it('allow saving changes to a currently loaded query via the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQuery(
          'new description',
          true,
          false
        );
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        const queryString = await queryBar.getQueryString();
        expect(queryString).to.eql('response:404');

        // Reset after changing
        await queryBar.setQuery('response:200');
        await savedQueryManagementComponent.updateCurrentlyLoadedQuery(
          'Ok responses for jpg files',
          true,
          false
        );
      });

      it('allow saving currently loaded query as a copy', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.saveCurrentlyLoadedAsNewQuery(
          'ok2',
          'description',
          true,
          false
        );
        await header.waitUntilLoadingHasFinished();
        await savedQueryManagementComponent.savedQueryExistOrFail('ok2');
        await savedQueryManagementComponent.closeSavedQueryManagementComponent();
        await testSubjects.click('showQueryBarMenu');
        await savedQueryManagementComponent.deleteSavedQuery('ok2');
      });
    });

    describe('global visualize read-only privileges', () => {
      before(async () => {
        await securityService.role.create('global_visualize_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                visualize: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await securityService.user.create('global_visualize_read_user', {
          password: 'global_visualize_read_user-password',
          roles: ['global_visualize_read_role'],
          full_name: 'test user',
        });

        await security.login('global_visualize_read_user', 'global_visualize_read_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await security.forceLogout();
        await securityService.role.delete('global_visualize_read_role');
        await securityService.user.delete('global_visualize_read_user');
      });

      it('shows visualize navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Visualize library']);
      });

      it(`landing page shows "Create new Visualization" button`, async () => {
        await visualize.gotoVisualizationLandingPage();
        await testSubjects.existOrFail('visualizationLandingPage', {
          timeout: config.get('timeouts.waitFor'),
        });
        await testSubjects.existOrFail('newItemButton');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`can view existing Visualization`, async () => {
        await common.navigateToActualUrl('visualize', '/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('visualizationLoader', {
          timeout: config.get('timeouts.waitFor'),
        });
      });

      it(`can't save existing Visualization`, async () => {
        await common.navigateToActualUrl('visualize', '/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('shareTopNavButton', {
          timeout: config.get('timeouts.waitFor'),
        });
        await testSubjects.missingOrFail('visualizeSaveButton', {
          timeout: config.get('timeouts.waitFor'),
        });
      });

      it('allows loading a saved query via the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        const queryString = await queryBar.getQueryString();
        expect(queryString).to.eql('response:200');
      });

      it('does not allow saving via the saved query management component popover with no query loaded', async () => {
        await savedQueryManagementComponent.saveNewQueryMissingOrFail();
      });

      it('does not allow saving changes to saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQueryMissingOrFail();
      });

      it('does not allow deleting a saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.deleteSavedQueryMissingOrFail('OKJpgs');
      });

      it('allows clearing the currently loaded saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
      });
    });

    describe('global visualize read-only with url_create privileges', () => {
      before(async () => {
        await securityService.role.create('global_visualize_read_url_create_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                visualize: ['read', 'url_create'],
              },
              spaces: ['*'],
            },
          ],
        });

        await securityService.user.create('global_visualize_read_url_create_user', {
          password: 'global_visualize_read_url_create_user-password',
          roles: ['global_visualize_read_url_create_role'],
          full_name: 'test user',
        });

        await security.login(
          'global_visualize_read_url_create_user',
          'global_visualize_read_url_create_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await security.forceLogout();
        await securityService.role.delete('global_visualize_read_url_create_role');
        await securityService.user.delete('global_visualize_read_url_create_user');
      });

      it('shows visualize navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Visualize library']);
      });

      it(`landing page shows "Create new Visualization" button`, async () => {
        await visualize.gotoVisualizationLandingPage();
        await testSubjects.existOrFail('visualizationLandingPage', { timeout: 10000 });
        await testSubjects.existOrFail('newItemButton');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`can view existing Visualization`, async () => {
        await common.navigateToActualUrl('visualize', '/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('visualizationLoader', { timeout: 10000 });
      });

      it(`can't save existing Visualization`, async () => {
        await common.navigateToActualUrl('visualize', '/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('shareTopNavButton', { timeout: 10000 });
        await testSubjects.missingOrFail('visualizeSaveButton', { timeout: 10000 });
      });

      it('allows loading a saved query via the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        const queryString = await queryBar.getQueryString();
        expect(queryString).to.eql('response:200');
      });

      it('does not allow saving via the saved query management component popover with no query loaded', async () => {
        await savedQueryManagementComponent.saveNewQueryMissingOrFail();
      });

      it('does not allow saving changes to saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQueryMissingOrFail();
      });

      it('does not allow deleting a saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.deleteSavedQueryMissingOrFail('OKJpgs');
      });

      it('allows clearing the currently loaded saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
      });
    });

    describe('no visualize privileges', () => {
      before(async () => {
        await securityService.role.create('no_visualize_privileges_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                discover: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await securityService.user.create('no_visualize_privileges_user', {
          password: 'no_visualize_privileges_user-password',
          roles: ['no_visualize_privileges_role'],
          full_name: 'test user',
        });

        await security.login(
          'no_visualize_privileges_user',
          'no_visualize_privileges_user-password',
          { expectSpaceSelector: false }
        );
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await security.forceLogout();
        await securityService.role.delete('no_visualize_privileges_role');
        await securityService.user.delete('no_visualize_privileges_user');
      });

      it(`landing page shows 403`, async () => {
        await common.navigateToActualUrl('visualize', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await error.expectForbidden();
      });

      it(`edit page shows 403`, async () => {
        await common.navigateToActualUrl('visualize', '/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await error.expectForbidden();
      });
    });
  });
}
