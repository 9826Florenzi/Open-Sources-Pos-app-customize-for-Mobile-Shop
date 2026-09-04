import React from 'react'
import { useLocation, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useIdleTimeout } from '../hooks/useIdleTimeout'

export const Layout: React.FC = () => {
  useIdleTimeout(10)
  const location = useLocation()
  const isPOS = location.pathname === '/pos'

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {!isPOS && <Header />}
        <div
          style={{ flex: 1, overflow: isPOS ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}
          className={isPOS ? '' : 'page-content'}
        >
          <Outlet />
        </div>
      </main>
    </div>
  )
}
