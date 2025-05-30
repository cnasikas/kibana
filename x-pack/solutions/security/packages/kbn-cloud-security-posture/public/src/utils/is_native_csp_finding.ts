/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CspFinding, CSP_MISCONFIGURATIONS_DATASET } from '@kbn/cloud-security-posture-common';
import { CspVulnerabilityFinding } from '@kbn/cloud-security-posture-common/schema/vulnerabilities/csp_vulnerability_finding';
import { CSP_VULN_DATASET, QUALYS_VULN_DATASET, WIZ_VULN_DATASET } from './get_vendor_name';

export const isNativeCspFinding = (finding: CspFinding | CspVulnerabilityFinding) =>
  finding.data_stream?.dataset === CSP_MISCONFIGURATIONS_DATASET ||
  finding.data_stream?.dataset === CSP_VULN_DATASET ||
  finding.data_stream?.dataset === WIZ_VULN_DATASET ||
  (finding.data_stream?.dataset?.startsWith(QUALYS_VULN_DATASET) ?? false);
