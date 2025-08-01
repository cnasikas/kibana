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
  const searchSession = getService('searchSessions');
  const { visualize, lens, header } = getPageObjects(['visualize', 'lens', 'header']);
  const listingTable = getService('listingTable');
  const kibanaServer = getService('kibanaServer');

  describe('lens search sessions', () => {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'x-pack/platform/test/fixtures/es_archives/logstash_functional'
      );
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
    });
    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
    });

    it("doesn't shows search sessions indicator UI", async () => {
      await visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await lens.clickVisualizeListItemTitle('lnsXYvis');
      await lens.goToTimeRange();
      await header.waitUntilLoadingHasFinished();
      expect(await lens.isShowingNoResults()).to.be(false);

      await searchSession.missingOrFail();
    });
  });
}
