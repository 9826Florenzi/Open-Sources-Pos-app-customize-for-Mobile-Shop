import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, NotifyProvider, useAuth } from './context/AppContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout'

import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { POS } from './pages/POS'
import { Products } from './pages/Products'
import { Orders } from './pages/Orders'
import { Customers } from './pages/Customers'
import { Suppliers } from './pages/Suppliers'
import { Inventory } from './pages/Inventory'
import { PurchaseOrders } from './pages/PurchaseOrders'
import { Warranty } from './pages/Warranty'
import { Repair } from './pages/Repair'
import { CashBook } from './pages/CashBook'
import { Reports } from './pages/Reports'
import { AuditLog } from './pages/AuditLog'
import { Settings } from './pages/Settings'

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly
}) => {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/pos" replace />
  }
  return <>{children}</>
}

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotifyProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/pos" replace />} />
                <Route path="pos" element={<POS />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="orders" element={<Orders />} />
                <Route path="customers" element={<Customers />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="inventory" element={<Inventory />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
                <Route path="warranty" element={<Warranty />} />
                <Route path="repair" element={<Repair />} />
                <Route path="cash" element={<CashBook />} />
                <Route
                  path="reports"
                  element={
                    <ProtectedRoute adminOnly>
                      <Reports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <ProtectedRoute adminOnly>
                      <AuditLog />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute adminOnly>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="*" element={<Navigate to="/pos" replace />} />
            </Routes>
          </HashRouter>
        </NotifyProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
