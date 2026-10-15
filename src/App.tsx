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
import { hasUsableToken } from '@/utils/auth'
import { useAccess } from '@/hooks/useMe'
import type { Permission } from '@/utils/permissions'

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

// Pages someone may not use send them back to the dashboard (the API refuses them too).
// Pass a permission, or owner for the Team page.
function Allow({ permission, owner, children }: { permission?: Permission; owner?: boolean; children: ReactNode }) {
  const { loading, isOwner, can } = useAccess()
  if (loading) return null
  if ((owner && !isOwner) || (permission && !can(permission))) {
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
          <Route path="/products" element={<Allow permission="products.view"><ProductsPage /></Allow>} />
          <Route path="/products/new" element={<Allow permission="products.edit"><ProductFormPage /></Allow>} />
          <Route path="/products/:slug/edit" element={<Allow permission="products.edit"><ProductFormPage /></Allow>} />
          <Route path="/orders" element={<Allow permission="orders.view"><OrdersPage /></Allow>} />
          <Route path="/courier-payments" element={<Allow permission="payments.view"><Suspense fallback={null}><CourierPaymentsPage /></Suspense></Allow>} />
          <Route path="/orders/new" element={<Allow permission="orders.edit"><OrderFormPage /></Allow>} />
          <Route path="/settings" element={<Allow permission="settings.view"><SettingsPage /></Allow>} />
          <Route path="/team" element={<Allow owner><Suspense fallback={null}><TeamPage /></Suspense></Allow>} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
