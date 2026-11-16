import { useEffect } from 'react';
import { AppError, ErrorCode, logError } from '@/errors';

interface UseErrorHandlerOptions {
  onAuthError?: () => void;
  onNetworkError?: () => void;
  logErrors?: boolean;
}

/**
 * Hook to handle errors consistently across the application
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { onAuthError, onNetworkError, logErrors = true } = options;

  const handleError = (error: unknown, context?: Record<string, any>) => {
    const appError = error instanceof AppError ? error : new AppError({
      message: error instanceof Error ? error.message : 'Unknown error',
      code: ErrorCode.UNKNOWN_ERROR,
    });

    // Log error
    if (logErrors) {
      logError(appError, context);
    }

    // Handle specific error types
    if (appError.isAuthError() && onAuthError) {
      onAuthError();
    }

    if (appError.isNetworkError() && onNetworkError) {
      onNetworkError();
    }

    return appError;
  };

  return { handleError };
}

/**
 * Hook to handle API query errors (for use with React Query)
 */
export function useQueryErrorHandler() {
  const { handleError } = useErrorHandler();

  return (error: unknown) => {
    return handleError(error, { source: 'react-query' });
  };
}

/**
 * Global error boundary handler
 */
export function useGlobalErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const appError = new AppError({
        message: event.reason?.message || 'Unhandled promise rejection',
        code: ErrorCode.UNKNOWN_ERROR,
        context: { reason: event.reason },
      });

      logError(appError, { source: 'unhandled-rejection' });
    };

    const handleError = (event: ErrorEvent) => {
      const appError = new AppError({
        message: event.message || 'Unhandled error',
        code: ErrorCode.UNKNOWN_ERROR,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });

      logError(appError, { source: 'global-error' });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);
}
