# Error Handling

This admin app uses **structured error handling** - errors are caught, parsed, and displayed with friendly messages.

## ✅ For Developers

### How to Handle Errors

```typescript
import { getErrorMessage } from '@/errors'

try {
  await ordersApi.create(data)
} catch (err) {
  // Get user-friendly message
  const message = getErrorMessage(err, 'Failed to create order')
  setError(message)
}
```

That's it! The system automatically:
- Parses API errors
- Handles network timeouts
- Redirects on 401 (unauthorized)
- Shows friendly messages

### Advanced Usage

```typescript
import { parseApiError, ErrorCode } from '@/errors'

try {
  await ordersApi.create(data)
} catch (err) {
  const appError = parseApiError(err)
  
  if (appError.code === ErrorCode.VALIDATION_ERROR) {
    // Handle validation errors
  } else if (appError.isNetworkError()) {
    // Handle network errors
  }
}
```

## 🔍 Error Logging

### Development
- Errors log to console with full details
- Easy debugging

### Production
- **No console logging** (security)
- Silent unless Sentry is configured

## 🚀 Production Error Tracking

Want to track errors in production? **See [SENTRY_SETUP.md](./SENTRY_SETUP.md)** - 5-minute setup.

## 🔒 Security

The error system never logs:
- Passwords
- Tokens
- Request/response bodies
- Personal data

Safe for production!

---

**That's all you need to know.** Errors just work. For Sentry setup, see SENTRY_SETUP.md.
