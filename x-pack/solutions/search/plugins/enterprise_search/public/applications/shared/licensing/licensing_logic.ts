/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';
import { Observable, Subscription } from 'rxjs';

import { ILicense } from '@kbn/licensing-plugin/public';

import {
  hasEnterpriseLicense,
  hasGoldLicense,
  hasPlatinumLicense,
  isTrialLicense,
} from '../../../../common/utils/licensing';

interface LicensingValues {
  license: ILicense | null;
  licenseSubscription: Subscription | null;
  hasEnterpriseLicense: boolean;
  hasPlatinumLicense: boolean;
  hasGoldLicense: boolean;
  isTrial: boolean;
  canManageLicense: boolean;
}
interface LicensingActions {
  setLicense(license: ILicense): ILicense;
  setLicenseSubscription(licenseSubscription: Subscription): Subscription;
}

export const LicensingLogic = kea<MakeLogicType<LicensingValues, LicensingActions>>({
  path: ['enterprise_search', 'licensing_logic'],
  actions: {
    setLicense: (license) => license,
    setLicenseSubscription: (licenseSubscription) => licenseSubscription,
  },
  reducers: ({ props }) => ({
    license: [
      null,
      {
        setLicense: (_, license) => license,
      },
    ],
    licenseSubscription: [
      null,
      {
        setLicenseSubscription: (_, licenseSubscription) => licenseSubscription,
      },
    ],
    canManageLicense: [props.canManageLicense || false, {}],
  }),
  selectors: {
    hasPlatinumLicense: [
      (selectors) => [selectors.license],
      (license) => hasPlatinumLicense(license),
    ],
    hasEnterpriseLicense: [
      (selectors) => [selectors.license],
      (license) => hasEnterpriseLicense(license),
    ],
    hasGoldLicense: [(selectors) => [selectors.license], (license) => hasGoldLicense(license)],
    isTrial: [(selectors) => [selectors.license], (license) => isTrialLicense(license)],
  },
  events: ({ props, actions, values }) => ({
    afterMount: () => {
      const licenseSubscription = props.license$.subscribe((license: ILicense) => {
        actions.setLicense(license);
      });
      actions.setLicenseSubscription(licenseSubscription);
    },
    beforeUnmount: () => {
      if (values.licenseSubscription) values.licenseSubscription.unsubscribe();
    },
  }),
});

/**
 * Mount/props helper
 */
interface LicensingLogicProps {
  license$: Observable<ILicense | undefined>;
  canManageLicense: boolean;
}
export const mountLicensingLogic = (props: LicensingLogicProps) => {
  LicensingLogic(props);
  const unmount = LicensingLogic.mount();
  return unmount;
};
