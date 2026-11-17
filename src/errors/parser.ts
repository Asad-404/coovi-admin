import axios, { type AxiosError } from 'axios';
import { AppError, ErrorCode } from './types';
import type { ApiErrorResponse, LegacyErrorResponse } from './types';

/**
 * Parse API error response and create structured AppError
 * SECURITY: Does not include request/response bodies to avoid logging sensitive data
 */
export function parseApiError(error: unknown): AppError {
  // Handle Axios errors
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse | LegacyErrorResponse>;

    // Network error (no response from server)
    if (!axiosError.response) {
      if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
        return new AppError({
          message: 'Request timeout. Please try again.',
          code: ErrorCode.TIMEOUT_ERROR,
          isRetryable: true,
          context: {
            // Only store endpoint path, not query params or body
            url: axiosError.config?.url?.split('?')[0],
            method: axiosError.config?.method,
          },
        });
      }

      return new AppError({
        message: 'Network error. Please check your connection and try again.',
        code: ErrorCode.NETWORK_ERROR,
        isRetryable: true,
        context: {
          // Only store endpoint path, not query params or body
          url: axiosError.config?.url?.split('?')[0],
          method: axiosError.config?.method,
        },
      });
    }

    const response = axiosError.response;
    const data = response.data;

    // Structured error from backend
    if (data && 'error' in data && data.error) {
      const structured = data as ApiErrorResponse;
      return new AppError({
        message: structured.error.message,
        code: (structured.error.code as ErrorCode) || ErrorCode.UNKNOWN_ERROR,
        statusCode: response.status,
        correlationId: structured.error.correlationId,
        // Backend context should be safe, but we trust the backend to not send sensitive data
        context: structured.error.context,
        isRetryable: response.status >= 500 && response.status < 600,
      });
    }

    // Legacy error format
    if (data && 'message' in data && typeof data.message === 'string') {
      return new AppError({
        message: data.message,
        code: mapStatusToErrorCode(response.status),
        statusCode: response.status,
        isRetryable: response.status >= 500 && response.status < 600,
      });
    }

    // Generic HTTP error
    return new AppError({
      message: `Request failed with status ${response.status}`,
      code: mapStatusToErrorCode(response.status),
      statusCode: response.status,
      isRetryable: response.status >= 500 && response.status < 600,
    });
  }

  // Handle AppError (already structured)
  if (error instanceof AppError) {
    return error;
  }

  // Handle generic Error
  if (error instanceof Error) {
    return new AppError({
      message: error.message,
      code: ErrorCode.UNKNOWN_ERROR,
    });
  }

  // Unknown error type
  return new AppError({
    message: 'An unexpected error occurred',
    code: ErrorCode.UNKNOWN_ERROR,
  });
}

/**
 * Map HTTP status code to error code
 */
function mapStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400: return ErrorCode.VALIDATION_ERROR;
    case 401: return ErrorCode.AUTHENTICATION_ERROR;
    case 403: return ErrorCode.AUTHORIZATION_ERROR;
    case 404: return ErrorCode.NOT_FOUND;
    case 422: return ErrorCode.BUSINESS_ERROR;
    case 429: return ErrorCode.RATE_LIMIT_EXCEEDED;
    case 500: return ErrorCode.INTERNAL_ERROR;
    case 502:
    case 503:
    case 504: return ErrorCode.EXTERNAL_SERVICE_ERROR;
    default:  return ErrorCode.UNKNOWN_ERROR;
  }
}

/**
 * Get user-friendly error message from any error
 * (Backward compatible with existing code)
 */
export function getErrorMessage(err: unknown, fallback: string = 'An error occurred'): string {
  const appError = parseApiError(err);
  return appError.getUserMessage() || fallback;
}

/**
 * Log error to console (in development only)
 * In production, logging is disabled to prevent exposing sensitive data in client console
 */
export function logError(error: AppError, context?: Record<string, any>): void {
  // Only log in development - never log to production client console
  if (import.meta.env.DEV) {
    const errorLog = {
      ...error.toJSON(),
      additionalContext: context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    console.error('[AppError]', errorLog);
  }

  // In production: do NOT log to console
  // If you need production error tracking, integrate a service like Sentry
  // and send errors server-side only, with proper data sanitization
}

/**
 * Get user-friendly message based on error code
 */
export function getErrorCodeMessage(code: ErrorCode): string {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.VALIDATION_ERROR]: 'Invalid input. Please check your data and try again.',
    [ErrorCode.MALFORMED_JSON]: 'Invalid data format.',
    [ErrorCode.INVALID_ID]: 'Invalid identifier.',
    [ErrorCode.DUPLICATE_KEY]: 'This record already exists.',
    [ErrorCode.AUTHENTICATION_ERROR]: 'Authentication failed. Please log in again.',
    [ErrorCode.AUTHORIZATION_ERROR]: 'You do not have permission to perform this action.',
    [ErrorCode.NOT_FOUND]: 'The requested resource was not found.',
    [ErrorCode.BUSINESS_ERROR]: 'This action cannot be completed.',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
    [ErrorCode.DATABASE_ERROR]: 'A database error occurred. Please try again.',
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'An external service is unavailable. Please try again later.',
    [ErrorCode.INTERNAL_ERROR]: 'An internal error occurred. Please try again.',
    [ErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection.',
    [ErrorCode.TIMEOUT_ERROR]: 'Request timeout. Please try again.',
    [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred.',
  };

  return messages[code] ?? messages[ErrorCode.UNKNOWN_ERROR];
}

/**
 * Create a validation error
 */
export function createValidationError(message: string, context?: Record<string, any>): AppError {
  return new AppError({ message, code: ErrorCode.VALIDATION_ERROR, statusCode: 400, context });
}

/**
 * Create a not found error
 */
export function createNotFoundError(resource: string, id?: string): AppError {
  return new AppError({
    message: `${resource} not found`,
    code: ErrorCode.NOT_FOUND,
    statusCode: 404,
    context: { resource, id },
  });
}
