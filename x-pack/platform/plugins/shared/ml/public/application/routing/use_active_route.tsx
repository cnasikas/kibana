/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation, useRouteMatch } from 'react-router-dom';
import { keyBy } from 'lodash';
import React, { useEffect, useMemo, useRef } from 'react';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { DEPRECATED_ML_ROUTE_TO_NEW_ROUTE } from '../../../common/constants/locator';
import { PLUGIN_ID } from '../../../common/constants/app';
import { useMlKibana } from '../contexts/kibana';
import type { MlRoute } from './router';
import { ML_PAGES } from '../../locator';

/**
 * Provides an active route of the ML app.
 * @param routesList
 */
export const useActiveRoute = (routesList: MlRoute[]): MlRoute => {
  const { pathname } = useLocation();
  const {
    services: { executionContext, overlays, ...startServices },
  } = useMlKibana();

  /**
   * Temp fix for routes with params.
   */
  const editCalendarMatch = useRouteMatch(`/${ML_PAGES.CALENDARS_EDIT}/:calendarId`);
  const editCalendarDstMatch = useRouteMatch(`/${ML_PAGES.CALENDARS_DST_EDIT}/:calendarId`);
  const editFilterMatch = useRouteMatch(`/${ML_PAGES.FILTER_LISTS_EDIT}/:filterId`);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const routesMap = useMemo(() => keyBy(routesList, 'path'), []);

  const activeRoute = useMemo(() => {
    if (editCalendarMatch) {
      return routesMap[editCalendarMatch.path];
    }
    if (editCalendarDstMatch) {
      return routesMap[editCalendarDstMatch.path];
    }
    if (editFilterMatch) {
      return routesMap[editFilterMatch.path];
    }
    // Remove trailing slash from the pathname
    const pathnameKey = pathname.replace(/\/$/, '');
    // Treat empty pathname as root
    return routesMap[pathnameKey === '' ? '/' : pathnameKey];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const bannerId = useRef<string | undefined>();

  useEffect(
    function handleNotFoundRoute() {
      // For these deprecated routes, we already direct to the management page in the ml_page.tsx
      // so no need to show banner
      if (
        Object.keys(DEPRECATED_ML_ROUTE_TO_NEW_ROUTE).some(
          // paths include /, so need to convert `/jobs` -> `jobs`
          (path) => path === pathname.split('/')[1]
        )
      ) {
        return;
      }
      if (!activeRoute && !!pathname) {
        bannerId.current = overlays.banners.replace(
          bannerId.current,
          toMountPoint(
            <EuiCallOut
              color="warning"
              iconType="info"
              title={
                <FormattedMessage
                  id="xpack.ml.notFoundPage.title"
                  defaultMessage="Page Not Found"
                />
              }
              data-test-subj={'mlPageNotFoundBanner'}
            >
              <p data-test-subj={'mlPageNotFoundBannerText'}>
                <FormattedMessage
                  id="xpack.ml.notFoundPage.bannerText"
                  defaultMessage="The Machine Learning application doesn't recognize this route: {route}. You've been redirected to the Overview page."
                  values={{
                    route: pathname,
                  }}
                />
              </p>
            </EuiCallOut>,
            startServices
          )
        );

        // hide the message after the user has had a chance to acknowledge it -- so it doesn't permanently stick around
        setTimeout(() => {
          if (bannerId.current) {
            overlays.banners.remove(bannerId.current);
          }
        }, 15000);
      }
    },
    [activeRoute, overlays, pathname, startServices]
  );

  useExecutionContext(executionContext, {
    name: PLUGIN_ID,
    type: 'application',
    page: activeRoute?.path ?? '/overview',
    id: activeRoute?.path,
  });

  return activeRoute ?? routesMap['/overview'];
};
