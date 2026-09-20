import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardLayout from '@/components/layout/DashboardLayout.tsx'
import DashboardPage from '@/pages/DashboardPage.tsx'
import LoginPage from '@/pages/LoginPage.tsx'
import OrdersPage from '@/pages/OrdersPage.tsx'
import ProductFormPage from '@/pages/ProductFormPage.tsx'
import ProductsPage from '@/pages/ProductsPage.tsx'

// Client-side guard: hides the dashboard pages when no token is stored.
// Real security is on the API — every request still needs a valid JWT.
function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('admin_token')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
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
  )
}
