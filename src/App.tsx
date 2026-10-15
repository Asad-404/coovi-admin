import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ErrorBoundary from '@/components/ErrorBoundary.tsx'
import DashboardLayout from '@/components/layout/DashboardLayout.tsx'
import DashboardPage from '@/pages/DashboardPage.tsx'
import LoginPage from '@/pages/LoginPage.tsx'
import OrderFormPage from '@/pages/OrderFormPage.tsx'
import OrdersPage from '@/pages/OrdersPage.tsx'
import ProductFormPage from '@/pages/ProductFormPage.tsx'
import ProductsPage from '@/pages/ProductsPage.tsx'
import SettingsPage from '@/pages/SettingsPage.tsx'
import { hasUsableToken, isOwner } from '@/utils/auth'

// Loaded on first visit so the main bundle stays small
const CourierPaymentsPage = lazy(() => import('@/pages/CourierPaymentsPage.tsx'))
const TeamPage = lazy(() => import('@/pages/TeamPage.tsx'))

// Client-side guard: hides the dashboard pages when no unexpired token is stored.
// Real security is on the API — every request still needs a valid JWT.
function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!hasUsableToken()) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Owner-only pages send staff back to the dashboard (the API refuses them too)
function OwnerRoute({ children }: { children: ReactNode }) {
  if (!isOwner()) {
    return <Navigate to="/dashboard" replace />
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
          <Route path="/courier-payments" element={<OwnerRoute><Suspense fallback={null}><CourierPaymentsPage /></Suspense></OwnerRoute>} />
          <Route path="/orders/new" element={<OrderFormPage />} />
          <Route path="/settings" element={<OwnerRoute><SettingsPage /></OwnerRoute>} />
          <Route path="/team" element={<OwnerRoute><Suspense fallback={null}><TeamPage /></Suspense></OwnerRoute>} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
