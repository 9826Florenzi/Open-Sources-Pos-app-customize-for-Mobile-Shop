import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React component tree:', error, errorInfo)
    this.setState({ errorInfo })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 32,
          maxWidth: 700,
          margin: '40px auto',
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          border: '1px solid #fee2e2',
          fontFamily: 'Inter, sans-serif'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: 12, fontSize: 18 }}>⚠️ Đã xảy ra lỗi giao diện</h2>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
            {this.state.error?.message || 'Lỗi không xác định'}
          </p>
          <pre style={{
            background: '#f8fafc',
            padding: 12,
            borderRadius: 6,
            fontSize: 11,
            color: '#334155',
            overflowX: 'auto',
            maxHeight: 200
          }}>
            {this.state.error?.stack}
          </pre>
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Tải lại trang
            </button>
            <button
              onClick={() => {
                sessionStorage.clear()
                window.location.hash = '#/login'
                window.location.reload()
              }}
              style={{
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '8px 16px',
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Đăng xuất & Về Login
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
