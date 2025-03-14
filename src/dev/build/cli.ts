/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';

import dedent from 'dedent';
import chalk from 'chalk';

import { buildDistributables } from './build_distributables';
import { isErrorLogged } from './lib';
import { readCliArgs } from './args';

// ensure the cwd() is always the repo root
process.chdir(resolve(__dirname, '../../../'));

const { showHelp, unknownFlags, log, buildOptions } = readCliArgs(process.argv);

if (unknownFlags.length) {
  const pluralized = unknownFlags.length > 1 ? 'flags' : 'flag';
  log.error(`Unknown ${pluralized}: ${unknownFlags.join(', ')}`);
}

if (showHelp) {
  log.write(
    dedent(chalk`
      {dim usage:} node scripts/build

      build the Kibana distributable

      options:
        --skip-archives                      {dim Don't produce tar/zip archives}
        --skip-os-packages                   {dim Don't produce rpm/deb/docker packages}
        --all-platforms                      {dim Produce archives for all platforms, not just this one}
        --rpm                                {dim Only build the rpm packages}
        --deb                                {dim Only build the deb packages}
        --serverless                         {dim Only build the serverless packages}
        --docker-images                      {dim Only build the Docker images}
        --docker-context-use-local-artifact  {dim Use a local artifact when building the Docker context}
        --docker-cross-compile               {dim Produce arm64 and amd64 Docker images}
        --docker-contexts                    {dim Only build the Docker build contexts}
        --skip-canvas-shareable-runtime      {dim Don't build the Canvas shareable runtime}
        --skip-cdn-assets                    {dim Don't build CDN assets}
        --skip-docker-ubi                    {dim Don't build the docker ubi image}
        --skip-docker-wolfi                  {dim Don't build the docker wolfi image}
        --skip-docker-fips                   {dim Don't build the docker fips image}
        --release                            {dim Produce a release-ready distributable}
        --version-qualifier                  {dim Suffix version with a qualifier}
        --skip-node-download                 {dim Reuse existing downloads of node.js}
        --verbose,-v                         {dim Turn on verbose logging}
        --no-debug                           {dim Turn off debug logging}
        --epr-registry                       {dim Specify the EPR registry to use for Fleet packages, 'production' or 'snapshot'}
        --with-test-plugins                  {dim Pass to include test plugins in the build output}
        --with-example-plugins               {dim Pass to include example plugins in the build output}
    `) + '\n'
  );
  process.exit(1);
}

buildDistributables(log, buildOptions!).catch((error) => {
  if (!isErrorLogged(error)) {
    log.error('Uncaught error');
    log.error(error);
  }

  process.exit(1);
});
