import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary.tsx'
import DashboardLayout from '@/components/layout/DashboardLayout.tsx'
import DashboardPage from '@/pages/DashboardPage.tsx'
import LoginPage from '@/pages/LoginPage.tsx'
import OrdersPage from '@/pages/OrdersPage.tsx'
import ProductFormPage from '@/pages/ProductFormPage.tsx'
import ProductsPage from '@/pages/ProductsPage.tsx'
import { hasUsableToken } from '@/utils/auth'

// Client-side guard: hides the dashboard pages when no unexpired token is stored.
// Real security is on the API — every request still needs a valid JWT.
function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!hasUsableToken()) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:slug/edit" element={<ProductFormPage />} />
          <Route path="/orders" element={<OrdersPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
