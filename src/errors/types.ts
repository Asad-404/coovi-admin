/**
 * API Error Response structure from backend
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    correlationId?: string;
    timestamp?: string;
    details?: string;
    context?: Record<string, any>;
    stack?: string;
  };
}

/**
 * Error codes from backend
 */
export enum ErrorCode {
  // Client Errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MALFORMED_JSON = 'MALFORMED_JSON',
  INVALID_ID = 'INVALID_ID',
  DUPLICATE_KEY = 'DUPLICATE_KEY',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server Errors (5xx)
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // Client-side errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Structured error class for frontend
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode?: number;
  public readonly correlationId?: string;
  public readonly timestamp: string;
  public readonly context?: Record<string, any>;
  public readonly isRetryable: boolean;

  constructor({
    message,
    code,
    statusCode,
    correlationId,
    context,
    isRetryable = false,
  }: {
    message: string;
    code: ErrorCode;
    statusCode?: number;
    correlationId?: string;
    context?: Record<string, any>;
    isRetryable?: boolean;
  }) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.correlationId = correlationId;
    this.timestamp = new Date().toISOString();
    this.context = context;
    this.isRetryable = isRetryable;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * Check if error is authentication related
   */
  isAuthError(): boolean {
    return (
      this.code === ErrorCode.AUTHENTICATION_ERROR ||
      this.statusCode === 401
    );
  }

  /**
   * Check if error is authorization related
   */
  isAuthzError(): boolean {
    return (
      this.code === ErrorCode.AUTHORIZATION_ERROR ||
      this.statusCode === 403
    );
  }

  /**
   * Check if error is network related
   */
  isNetworkError(): boolean {
    return (
      this.code === ErrorCode.NETWORK_ERROR ||
      this.code === ErrorCode.TIMEOUT_ERROR
    );
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      correlationId: this.correlationId,
      timestamp: this.timestamp,
      context: this.context,
      isRetryable: this.isRetryable,
      stack: this.stack,
    };
  }
}
