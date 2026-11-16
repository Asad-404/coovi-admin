# Structured Error Handling - Frontend (React)

This document explains the structured error handling system implemented in the Coovi Admin frontend.

## Overview

The structured error handling system provides:

- **Consistent error parsing** from API responses
- **Rich context data** for debugging
- **Correlation ID tracking** from backend
- **User-friendly error messages**
- **Automatic error logging**
- **Type-safe error handling**
- **Ready for Sentry integration**

## Error Types

### AppError

The main error class for frontend errors. Contains:

- `code`: Error code (enum)
- `message`: Human-readable error message
- `statusCode`: HTTP status code (if from API)
- `correlationId`: Request tracking ID from backend
- `timestamp`: When the error occurred
- `context`: Additional data about the error
- `isRetryable`: Whether the operation can be retried

### Error Codes

```typescript
enum ErrorCode {
  // Client Errors (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
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
```

## Usage Examples

### Basic Error Handling

```typescript
import { parseApiError, getErrorMessage } from '@/errors';

// In a component or API call
try {
  await apiClient.post('/api/products', data);
} catch (error) {
  const appError = parseApiError(error);
  
  // Get user-friendly message
  const message = appError.getUserMessage();
  
  // Show to user
  alert(message);
  
  // Or use the helper
  const simpleMessage = getErrorMessage(error, 'Failed to create product');
}
```

### With React Query

```typescript
import { useMutation } from '@tanstack/react-query';
import { parseApiError } from '@/errors';

const mutation = useMutation({
  mutationFn: createProduct,
  onError: (error) => {
    const appError = parseApiError(error);
    
    // Check error type
    if (appError.isAuthError()) {
      // Redirect to login
      navigate('/login');
    } else if (appError.code === ErrorCode.VALIDATION_ERROR) {
      // Show validation errors
      setErrors(appError.context);
    } else {
      // Show generic error
      toast.error(appError.getUserMessage());
    }
  },
});
```

### Using the Error Handler Hook

```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { handleError } = useErrorHandler({
    onAuthError: () => navigate('/login'),
    onNetworkError: () => toast.error('Network error'),
  });

  const handleSubmit = async () => {
    try {
      await apiClient.post('/api/products', data);
    } catch (error) {
      const appError = handleError(error, { 
        component: 'MyComponent',
        action: 'createProduct' 
      });
      
      // Show error to user
      toast.error(appError.getUserMessage());
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Global Error Handling

```typescript
import { useGlobalErrorHandler } from '@/hooks/useErrorHandler';

function App() {
  // Catches unhandled promise rejections and errors
  useGlobalErrorHandler();

  return <YourApp />;
}
```

### API Client Integration

The API client automatically parses errors and logs them:

```typescript
// src/api/client.ts
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Automatically parses and logs errors
    const appError = parseApiError(error);
    logError(appError, { endpoint: error.config?.url });
    
    // Handle auth errors
    if (appError.isAuthError() && getToken()) {
      clearToken();
      window.location.href = '/login';
    }
    
    return Promise.reject(appError);
  }
);
```

### Checking Error Types

```typescript
const appError = parseApiError(error);

// Check if authentication error
if (appError.isAuthError()) {
  // Redirect to login
}

// Check if authorization error
if (appError.isAuthzError()) {
  // Show permission denied message
}

// Check if network error
if (appError.isNetworkError()) {
  // Show network error message
}

// Check if retryable
if (appError.isRetryable) {
  // Show retry button
}

// Check specific error code
if (appError.code === ErrorCode.VALIDATION_ERROR) {
  // Handle validation errors
}
```

### Creating Custom Errors

```typescript
import { createValidationError, createNotFoundError, AppError, ErrorCode } from '@/errors';

// Validation error
const error = createValidationError('Email is required', {
  field: 'email',
});

// Not found error
const error = createNotFoundError('Product', '123');

// Custom error
const error = new AppError({
  message: 'Custom error message',
  code: ErrorCode.BUSINESS_ERROR,
  context: { customData: 'value' },
  isRetryable: false,
});
```

## Error Response Format

Errors from the backend are automatically parsed:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "correlationId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "context": {
      "field": "email",
      "constraint": "required"
    }
  }
}
```

## Logging

Errors are automatically logged with context:

```typescript
{
  "name": "AppError",
  "message": "Email is required",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "context": {
    "field": "email"
  },
  "additionalContext": {
    "endpoint": "/api/products",
    "method": "POST"
  },
  "userAgent": "Mozilla/5.0...",
  "url": "http://localhost:3000/products/new"
}
```

## Migration Guide

### Before (Old Style)

```typescript
import { getErrorMessage } from '@/api/errors';

try {
  await apiClient.post('/api/products', data);
} catch (error) {
  const message = getErrorMessage(error, 'Failed to create product');
  alert(message);
}
```

### After (New Structured Style)

```typescript
import { parseApiError, getErrorMessage } from '@/errors';

try {
  await apiClient.post('/api/products', data);
} catch (error) {
  const appError = parseApiError(error);
  
  // More control over error handling
  if (appError.isAuthError()) {
    navigate('/login');
  } else {
    alert(appError.getUserMessage());
  }
  
  // Or use backward-compatible helper
  const message = getErrorMessage(error, 'Failed to create product');
  alert(message);
}
```

## Backward Compatibility

The old `getErrorMessage` function still works:

```typescript
import { getErrorMessage } from '@/api/errors';

// Still works exactly the same
const message = getErrorMessage(error, 'Fallback message');
```

## Future: Sentry Integration

When ready to add Sentry:

```typescript
// src/errors/parser.ts
import * as Sentry from '@sentry/react';

export function logError(error: AppError, context?: Record<string, any>): void {
  const errorLog = {
    ...error.toJSON(),
    additionalContext: context,
  };

  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      tags: {
        error_code: error.code,
        correlation_id: error.correlationId,
      },
      contexts: {
        custom: errorLog,
      },
    });
  }
}
```

## Benefits

✅ **Type-safe error handling** with TypeScript  
✅ **Consistent error structure** across the app  
✅ **Rich debugging context** with correlation IDs  
✅ **User-friendly error messages**  
✅ **Automatic error logging**  
✅ **Easy error type checking**  
✅ **Backward compatible** with existing code  
✅ **Ready for Sentry** integration  
✅ **Retry detection** for network errors
