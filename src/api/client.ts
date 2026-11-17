import axios from 'axios'
import { clearToken, getToken } from '@/utils/auth'
import { parseApiError, logError } from '@/errors'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

// Attach the stored JWT to every request (if we have one)
apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// If a stored token stops working (expired/invalid), drop it and return to login.
// The full page load also discards the React Query cache.
// Login-endpoint 401s (wrong password) have no stored token, so no redirect loop.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Parse error into structured format
    const appError = parseApiError(error)

    // Log error with minimal context (never log request/response bodies)
    // Only endpoint and method - no query params, headers, or body data
    logError(appError, {
      endpoint: error.config?.url?.split('?')[0], // Remove query params
      method: error.config?.method,
    })

    // Handle authentication errors
    if (error.response?.status === 401 && getToken()) {
      clearToken()
      window.location.href = '/login'
    }

    // Reject with structured error
    return Promise.reject(appError)
  },
)

export default apiClient
