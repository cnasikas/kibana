/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Serverless observability API', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./apm_api_integration/feature_flags.ts'));
    loadTestFile(require.resolve('./cases'));
    loadTestFile(require.resolve('./synthetics'));
    loadTestFile(require.resolve('./dataset_quality_api_integration'));
    loadTestFile(require.resolve('./platform_security'));
  });
}
