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

## Logging & Security

### Development Mode
Errors are logged to console with full context for debugging:

```typescript
console.error('[AppError]', {
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
    "endpoint": "/api/products",  // Query params stripped
    "method": "POST"
  }
})
```

### Production Mode
**No console logging** - errors are silent to prevent exposing sensitive data.

When Sentry is configured, errors are sent to Sentry dashboard with sanitization:
- Query parameters stripped from URLs
- Request/response bodies excluded
- Headers (Authorization, cookies) removed
- Personal data sanitized

### Security Guarantees

❌ **Never logged in production console:**
- Passwords
- Authentication tokens (JWT)
- Request/response bodies
- HTTP headers (Authorization, cookies)
- Query parameters (may contain IDs/tokens)
- Personal data from forms

✅ **What gets logged (Development only):**
- Error messages and codes
- HTTP status codes
- Endpoint paths (without query params)
- HTTP methods
- Error context (sanitized)

## Migration Guide

### ✅ Migration Complete!

All components and pages have been migrated to use structured errors.

### Before (Old Style - Deprecated)

```typescript
import { getErrorMessage } from '@/api/errors';  // ❌ Deprecated

try {
  await apiClient.post('/api/products', data);
} catch (error) {
  const message = getErrorMessage(error, 'Failed to create product');
  alert(message);
}
```

### After (Current Style - All files updated)

```typescript
import { getErrorMessage } from '@/errors';  // ✅ New centralized location

try {
  await apiClient.post('/api/products', data);
} catch (error) {
  // Simple usage (backward compatible)
  const message = getErrorMessage(error, 'Failed to create product');
  alert(message);
  
  // Or advanced usage with AppError
  const appError = parseApiError(error);
  if (appError.isAuthError()) {
    navigate('/login');
  } else {
    alert(appError.getUserMessage());
  }
}
```

## Files Migrated

✅ **All 16 files updated** (Commit: 20fc0aa):
- Pages: LoginPage, TeamPage, SettingsPage, ProductsPage, ProductFormPage, OrdersPage, OrderFormPage, CourierPaymentsPage
- Components: BlockPhoneDialog, CallConfirmedToggle, ChangePasswordDialog, CourierSection, OrderDetailsForm, OrderTimeline, RecordPaymentDialog
- API: uploads.ts

All now import from `@/errors` instead of deprecated `@/api/errors`.

## Sentry Integration (Ready)

Sentry integration is **prepared and ready** but not yet installed.

### Current Status
- ✅ `src/lib/sentry.ts` - Configuration file ready (commented out)
- ✅ `logError()` - Auto-detects and uses Sentry when available
- ✅ Security sanitization built-in
- ⏳ Package not installed yet

### Quick Setup (5 minutes)

```bash
# 1. Install Sentry
npm install @sentry/react --legacy-peer-deps

# 2. Get DSN from https://sentry.io

# 3. Add to .env.production
VITE_SENTRY_DSN=https://xxxxx@o0.ingest.sentry.io/xxxxx
VITE_APP_VERSION=1.0.0

# 4. Uncomment code in src/lib/sentry.ts
# Remove the /* */ comments around Sentry.init()

# 5. Build and deploy
npm run build
```

### What You Get
- Real-time error tracking in production
- Stack traces with source maps
- User context and breadcrumbs
- Performance monitoring
- Session replay (optional)
- Correlation ID tracking

### Security Features
The Sentry integration includes automatic data sanitization:
- `beforeSend` hook strips sensitive data
- Query parameters removed from URLs
- Request/response bodies excluded
- Headers sanitized
- PII scrubbing enabled

See `SENTRY_SETUP.md` for complete setup guide.

## Benefits

✅ **Type-safe error handling** with TypeScript  
✅ **Consistent error structure** across the app  
✅ **Rich debugging context** with correlation IDs  
✅ **User-friendly error messages**  
✅ **Automatic error logging** (dev only)  
✅ **Easy error type checking**  
✅ **Migration complete** - all 16 files updated  
✅ **Sentry ready** - 5-minute setup when needed  
✅ **Retry detection** for network errors  
✅ **Production-safe** - no sensitive data logged  
✅ **Security-first design** - data sanitization built-in

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Core error system | ✅ Complete | AppError, ErrorCode, parser |
| API client integration | ✅ Complete | Auto-parses all errors |
| Component migration | ✅ Complete | All 16 files updated |
| Security hardening | ✅ Complete | No prod console logging |
| Sentry preparation | ✅ Ready | 5-min setup when needed |
| Documentation | ✅ Complete | This doc + SENTRY_SETUP.md |

## Version History

- **v1.0** - Initial structured error system (Commit: 4056d3f)
- **v1.1** - TypeScript fixes (Commit: 84959ed)
- **v2.0** - Complete migration (Commit: 20fc0aa) - 16 files updated
- **v2.1** - Security hardening (Commit: 7b4eb02) - Production-safe
- **v2.2** - Sentry preparation (Commit: 9a65f06) - Ready for tracking
