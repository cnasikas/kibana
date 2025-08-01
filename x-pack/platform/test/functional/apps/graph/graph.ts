/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { settings, common, graph, header } = getPageObjects([
    'settings',
    'common',
    'graph',
    'header',
  ]);
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');

  describe('graph', function () {
    before(async () => {
      await browser.setWindowSize(1600, 1000);
      log.debug('load graph/secrepo data');
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/graph/secrepo');
      await kibanaServer.savedObjects.cleanStandardList();
      await common.navigateToApp('settings');
      log.debug('create secrepo index pattern');
      await settings.createIndexPattern('secrepo', '@timestamp');
      log.debug('navigateTo graph');
      await common.navigateToApp('graph');
      await header.waitUntilLoadingHasFinished();
      await graph.createWorkspace();
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: ['index-pattern'] });

      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/graph/secrepo');
    });

    const graphName = 'my Graph workspace name ' + new Date().getTime();

    const expectedNodes = [
      'blog',
      '/wordpress/wp-admin/',
      '202.136.75.194',
      '190.154.27.54',
      '187.131.21.37',
      'wp',
      '80.5.27.16',
      'login.php',
      '181.113.155.46',
      'admin',
      'wordpress',
      '/test/wp-admin/',
      'test',
      '/wp-login.php',
      '/blog/wp-admin/',
    ];

    const expectedConnections: Record<string, Record<string, boolean>> = {
      '/blog/wp-admin/': { wp: true, blog: true },
      wp: {
        blog: true,
        '202.136.75.194': true,
        'login.php': true,
        admin: true,
        '/test/wp-admin/': true,
        '/wp-login.php': true,
        '80.5.27.16': true,
        '/wordpress/wp-admin/': true,
        '190.154.27.54': true,
        '187.131.21.37': true,
        '181.113.155.46': true,
      },
      admin: { test: true, blog: true, '/blog/wp-admin/': true },
      '/test/wp-admin/': { admin: true },
      test: { wp: true, '/test/wp-admin/': true },
      wordpress: { wp: true, admin: true },
      '/wordpress/wp-admin/': { wordpress: true, admin: true },
    };

    async function buildGraph() {
      // select fields url.parts, url, params and src
      await graph.addFields(['url.parts', 'url', 'params', 'src']);
      await graph.query('admin');
      await common.sleep(8000);
    }

    it('should show correct node labels', async function () {
      await header.waitUntilLoadingHasFinished();
      await graph.selectIndexPattern('secrepo');
      await buildGraph();
      const { nodes } = await graph.getGraphObjects();
      const circlesText = nodes.map(({ label }) => label);
      expect(circlesText.length).to.equal(expectedNodes.length);
      const unexpectedCircleTexts = circlesText.filter((t) => !expectedNodes.includes(t));

      if (unexpectedCircleTexts.length) {
        throw new Error(`Find unexpected circle texts: ${unexpectedCircleTexts}`);
      }
    });

    it('should show correct connections', async function () {
      const expectedConnectionCount = Object.values(expectedConnections)
        .map((connections) => Object.values(connections).length)
        .reduce((acc, n) => acc + n, 0);
      const { edges } = await graph.getGraphObjects();
      expect(edges.length).to.be(expectedConnectionCount);
      edges.forEach((edge) => {
        const from = edge.sourceNode.label!;
        const to = edge.targetNode.label!;
        expect(expectedConnections[from][to]).to.be(true);
      });
    });

    it('should save Graph workspace', async function () {
      const graphExists = await graph.saveGraph(graphName);
      expect(graphExists).to.eql(true);
    });

    // open the same graph workspace again and make sure the results are the same
    it('should open Graph workspace', async function () {
      await graph.openGraph(graphName);
      const { nodes } = await graph.getGraphObjects();
      const circlesText = nodes.map(({ label }) => label);
      expect(circlesText.length).to.equal(expectedNodes.length);
      circlesText.forEach((circleText) => {
        log.debug(`Looking for ${circleText}`);
        expect(expectedNodes.includes(circleText)).to.be(true);
      });
    });

    it('should create new Graph workspace', async function () {
      await graph.newGraph();
      await graph.selectIndexPattern('secrepo');
      const { nodes, edges } = await graph.getGraphObjects();
      expect(nodes).to.be.empty();
      expect(edges).to.be.empty();
    });

    it('should show venn when clicking a line', async function () {
      await buildGraph();

      await graph.isolateEdge('test', '/test/wp-admin/');

      await graph.stopLayout();
      await common.sleep(1000);
      await browser.execute(() => {
        const event = document.createEvent('SVGEvents');
        event.initEvent('click', true, true);
        return document.getElementsByClassName('gphEdge--clickable')[0].dispatchEvent(event);
      });
      await common.sleep(1000);
      await graph.startLayout();

      const vennTerm1 = await graph.getVennTerm1();
      log.debug('vennTerm1 = ' + vennTerm1);

      const vennTerm2 = await graph.getVennTerm2();
      log.debug('vennTerm2 = ' + vennTerm2);

      const smallVennTerm1 = await graph.getSmallVennTerm1();
      log.debug('smallVennTerm1 = ' + smallVennTerm1);

      const smallVennTerm12 = await graph.getSmallVennTerm12();
      log.debug('smallVennTerm12 = ' + smallVennTerm12);

      const smallVennTerm2 = await graph.getSmallVennTerm2();
      log.debug('smallVennTerm2 = ' + smallVennTerm2);

      expect(vennTerm1).to.be('/test/wp-admin/');
      expect(vennTerm2).to.be('test');
      expect(smallVennTerm1).to.be('4');
      expect(smallVennTerm12).to.be(' (4) ');
      expect(smallVennTerm2).to.be('4');
    });

    it('should delete graph', async function () {
      await graph.goToListingPage();
      expect(await graph.getWorkspaceCount()).to.equal(1);
      await graph.deleteGraph(graphName);
      expect(await graph.getWorkspaceCount()).to.equal(0);
    });
  });
}
