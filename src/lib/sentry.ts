/**
 * Sentry Error Tracking Integration
 *
 * This file is ready for when you add Sentry to your project.
 *
 * SETUP INSTRUCTIONS:
 * 1. Install Sentry: npm install @sentry/react
 * 2. Get your DSN from https://sentry.io
 * 3. Add to .env: VITE_SENTRY_DSN=your-dsn-here
 * 4. Uncomment the code below
 * 5. Import this in main.tsx before ReactDOM.render()
 */

// Uncomment when Sentry is installed:
/*
import * as Sentry from '@sentry/react';

export function initSentry() {
  // Only initialize in production
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,

      // Set environment
      environment: import.meta.env.MODE,

      // Performance monitoring
      tracesSampleRate: 1.0, // Adjust in production (0.1 = 10% of transactions)

      // Release tracking
      release: `coovi-admin@${import.meta.env.VITE_APP_VERSION || 'dev'}`,

      // Integrations
      integrations: [
        // Browser tracing for performance monitoring
        Sentry.browserTracingIntegration(),

        // React error boundary integration
        Sentry.reactRouterV6BrowserTracingIntegration({
          useEffect: React.useEffect,
        }),

        // Replay session recording (optional, privacy-sensitive)
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Session replay sampling
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

      // Data sanitization - CRITICAL FOR SECURITY
      beforeSend(event, hint) {
        // Remove sensitive data from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
            // Sanitize URLs - remove query params
            if (breadcrumb.data?.url) {
              breadcrumb.data.url = breadcrumb.data.url.split('?')[0];
            }
            // Remove request/response bodies
            delete breadcrumb.data?.request_body;
            delete breadcrumb.data?.response_body;
            return breadcrumb;
          });
        }

        // Remove sensitive data from event context
        if (event.request) {
          // Remove headers that may contain tokens
          delete event.request.headers;
          // Remove cookies
          delete event.request.cookies;
          // Sanitize URL
          if (event.request.url) {
            event.request.url = event.request.url.split('?')[0];
          }
        }

        // Remove potentially sensitive extra data
        if (event.extra) {
          // Keep error codes and status, remove bodies
          delete event.extra.requestBody;
          delete event.extra.responseBody;
          delete event.extra.headers;
        }

        return event;
      },

      // Ignore certain errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'chrome-extension://',
        'moz-extension://',

        // Network errors (we handle these gracefully)
        'Network request failed',
        'NetworkError',

        // Cancelled requests
        'Request aborted',
        'AbortError',
      ],

      // Don't send errors from certain URLs
      denyUrls: [
        /extensions\//i,
        /^chrome:\/\//i,
        /^moz-extension:\/\//i,
      ],
    });

    // Expose Sentry globally for error handler
    (window as any).Sentry = Sentry;

    console.log('[Sentry] Initialized for production error tracking');
  }
}

// Export Sentry for use in ErrorBoundary
export { Sentry };
*/

// Current no-op implementation (when Sentry is not installed)
export function initSentry() {
  // No-op until Sentry is installed
  console.log('[Sentry] Not configured - errors will only log in development');
}
