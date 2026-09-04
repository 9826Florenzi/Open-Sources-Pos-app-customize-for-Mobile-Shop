import React, { createContext, useContext, useState, useCallback } from 'react'

// ===== Auth Context =====
interface User {
  id: number
  name: string
  username: string
  role: 'admin' | 'employee'
  phone?: string
}

interface AuthContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = sessionStorage.getItem('pos_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const login = useCallback((u: User) => {
    setUser(u)
    sessionStorage.setItem('pos_user', JSON.stringify(u))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    sessionStorage.removeItem('pos_user')
  }, [])

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

// ===== Notification Context =====
interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
}

interface NotifyContextType {
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const NotifyContext = createContext<NotifyContextType>({
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
})

export const useNotify = () => useContext(NotifyContext)

export const NotifyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const add = useCallback((type: Notification['type'], title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2)
    setNotifications(prev => [...prev, { id, type, title, message }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 3500)
  }, [])

  const ctx = {
    success: (t: string, m?: string) => add('success', t, m),
    error: (t: string, m?: string) => add('error', t, m),
    warning: (t: string, m?: string) => add('warning', t, m),
    info: (t: string, m?: string) => add('info', t, m),
  }

  return (
    <NotifyContext.Provider value={ctx}>
      {children}
      <div className="notifications">
        {notifications.map(n => (
          <div key={n.id} className={`notification ${n.type}`}>
            <div className="notification-content">
              <div className="notification-title">{n.title}</div>
              {n.message && <div className="notification-message">{n.message}</div>}
            </div>
            <button
              onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: '0 4px' }}
            >×</button>
          </div>
        ))}
      </div>
    </NotifyContext.Provider>
  )
}
