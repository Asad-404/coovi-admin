# Sentry Integration Guide

This application is **ready for Sentry** but not yet integrated. Follow these steps when you're ready to add production error tracking.

## Why Sentry?

- **Real-time error tracking** in production
- **Stack traces** with source maps
- **User context** (which admin saw the error)
- **Performance monitoring**
- **Session replay** (optional)
- **Release tracking** (which version had the error)

## Setup Steps

### 1. Create Sentry Account

1. Go to https://sentry.io
2. Create a free account (free tier: 5,000 errors/month)
3. Create a new project → Select "React"
4. Copy your DSN (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### 2. Install Sentry Package

```bash
cd coovi-admin
npm install @sentry/react --legacy-peer-deps
```

### 3. Add Environment Variables

Create or update `.env.production`:

```bash
# Sentry Configuration
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
VITE_APP_VERSION=1.0.0
```

### 4. Uncomment Sentry Code

Edit `src/lib/sentry.ts`:
- Uncomment the entire Sentry initialization code
- Remove the no-op implementation at the bottom

### 5. Initialize Sentry in Your App

Edit `src/main.tsx` and add at the very top (before React import):

```typescript
import { initSentry } from './lib/sentry'

// Initialize Sentry before anything else
initSentry()

// ... rest of your imports and app code
```

### 6. Update ErrorBoundary (Optional)

For better integration, update `src/components/ErrorBoundary.tsx`:

```typescript
import * as Sentry from '@sentry/react'

export default class ErrorBoundary extends Sentry.ErrorBoundary {
  // Your existing error boundary code
}
```

### 7. Build and Deploy

```bash
npm run build
```

Your production build will now send errors to Sentry automatically!

## What Gets Sent to Sentry

### ✅ Captured Information:
- Error messages and stack traces
- Error codes (VALIDATION_ERROR, NETWORK_ERROR, etc.)
- HTTP status codes
- Endpoint paths (without query params)
- Browser and OS information
- User context (admin email, if you configure it)
- Breadcrumbs (user actions leading to error)

### ❌ Not Captured (Security):
- Passwords
- Authentication tokens
- Request/response bodies
- HTTP headers (Authorization, cookies)
- Query parameters (may contain IDs/tokens)
- Personal data in forms

## Configuration Options

### Adjust Sample Rates

In `src/lib/sentry.ts`:

```typescript
tracesSampleRate: 0.1,  // 10% of transactions (reduces quota usage)
replaysSessionSampleRate: 0.1,  // 10% of sessions
replaysOnErrorSampleRate: 1.0,  // 100% of error sessions
```

### Add User Context

When admin logs in, add context:

```typescript
import * as Sentry from '@sentry/react'

// After successful login
Sentry.setUser({
  id: admin._id,
  email: admin.email,
  role: admin.role,
})

// On logout
Sentry.setUser(null)
```

### Add Custom Tags

For better filtering:

```typescript
Sentry.setTag('feature', 'orders')
Sentry.setContext('order', {
  orderId: order._id,
  status: order.status,
})
```

## Testing Sentry

After setup, test by throwing an error:

```typescript
// In any component
<button onClick={() => {
  throw new Error('Test Sentry error!')
}}>
  Test Sentry
</button>
```

Check your Sentry dashboard - you should see the error appear within seconds!

## Cost Considerations

Sentry pricing is based on:
- **Events**: Each error = 1 event
- **Transactions**: Performance monitoring
- **Replays**: Session recordings

**Free tier limits:**
- 5,000 errors/month
- 10,000 performance units/month
- 50 replay sessions/month

**Tips to stay within free tier:**
- Lower `tracesSampleRate` to 0.1 (10%)
- Lower `replaysSessionSampleRate` to 0.05 (5%)
- Use `ignoreErrors` to filter noise
- Only enable in production

## Alternatives to Sentry

If you prefer other services:
- **LogRocket** - Session replay focused
- **Datadog RUM** - Full observability suite
- **Rollbar** - Simple error tracking
- **Bugsnag** - Error monitoring

The error handling system in `src/errors/` works with any service - just modify the `logError()` function.

## Current Status

✅ Error handling system ready
✅ Data sanitization in place
✅ Sentry integration code prepared
⏳ Waiting for Sentry DSN and npm install

## Questions?

The error handling is production-safe without Sentry:
- Errors are caught and displayed to users
- No sensitive data logged to console
- Development debugging still works

Add Sentry whenever you're ready for production monitoring!
