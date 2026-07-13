import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initGoogleAnalytics, isGaEnabled, trackPageView } from '../utils/googleAnalytics';

/**
 * Loads GA4 once and records SPA page views on storefront routes.
 * Skips admin panel paths so internal ops traffic does not inflate SEO metrics.
 */
export default function GoogleAnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initGoogleAnalytics();
  }, []);

  useEffect(() => {
    if (!isGaEnabled()) return;

    const path = location.pathname || '';
    const isAdminRoute =
      path.startsWith('/babapanel') ||
      path.startsWith('/babadash') ||
      path.startsWith('/admin/login') ||
      path.startsWith('/admin/unauthorized') ||
      path.startsWith('/no-access');

    if (isAdminRoute) return;

    trackPageView(`${path}${location.search || ''}`);
  }, [location.pathname, location.search]);

  return null;
}
