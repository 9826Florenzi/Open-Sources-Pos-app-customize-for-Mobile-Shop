import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  ShoppingCart,
  Package,
  Wrench,
  Shield,
  ClipboardList,
  BarChart3,
  Users,
  Truck,
  Boxes,
  Wallet,
  Settings,
  LogOut,
  LayoutDashboard,
  History,
  Lock
} from 'lucide-react'
import { useAuth } from '../context/AppContext'

interface NavItem {
  path: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  badge?: string | number
  adminOnly?: boolean
  section?: 'main' | 'manage' | 'finance' | 'system'
}

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth()

  const navItems: NavItem[] = [
    { path: '/pos', icon: ShoppingCart, label: 'Bán hàng', section: 'main' },
    { path: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan', section: 'main' },
    
    { path: '/products', icon: Package, label: 'Sản phẩm & IMEI', section: 'manage' },
    { path: '/repair', icon: Wrench, label: 'Sửa chữa', section: 'manage' },
    { path: '/warranty', icon: Shield, label: 'Bảo hành', section: 'manage' },
    { path: '/inventory', icon: Boxes, label: 'Kho hàng', section: 'manage' },
    
    { path: '/orders', icon: ClipboardList, label: 'Đơn hàng', section: 'finance' },
    { path: '/customers', icon: Users, label: 'Khách hàng', section: 'finance' },
    { path: '/suppliers', icon: Truck, label: 'Nhà cung cấp', section: 'finance' },
    { path: '/cash', icon: Wallet, label: 'Sổ quỹ', section: 'finance' },
    { path: '/reports', icon: BarChart3, label: 'Báo cáo', adminOnly: true, section: 'finance' },
    
    { path: '/audit', icon: History, label: 'Nhật ký hoạt động', adminOnly: true, section: 'system' },
    { path: '/settings', icon: Settings, label: 'Cài đặt', adminOnly: true, section: 'system' }
  ]

  const filteredItems = navItems.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') return false
    return true
  })

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">❖</div>
        <div className="sidebar-logo-text">
          <h2>POS SYSTEM</h2>
          <span>Quản lý Bán Hàng PRO</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Bán hàng</div>
        {filteredItems.filter(i => i.section === 'main').map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} className="nav-icon" />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: 8 }}>Quản lý</div>
        {filteredItems.filter(i => i.section === 'manage').map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} className="nav-icon" />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: 8 }}>Tài chính & Khách</div>
        {filteredItems.filter(i => i.section === 'finance').map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} className="nav-icon" />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: 8 }}>Hệ thống</div>
        {filteredItems.filter(i => i.section === 'system').map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} className="nav-icon" />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          <button className="btn btn-outline" style={{ flex: 1, borderColor: 'var(--border)' }} onClick={() => {
            const ev = new KeyboardEvent('keydown', { ctrlKey: true, key: 'l' })
            window.dispatchEvent(ev)
          }}>
            <Lock size={14} style={{ marginRight: 4 }} /> Khóa (Ctrl+L)
          </button>
        </div>
        <div className="sidebar-user" onClick={logout} title="Nhấn để đăng xuất">
          <div className="user-avatar">
            {user?.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'Nhân viên'}</div>
            <div className="user-role">{user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</div>
          </div>
          <LogOut size={16} style={{ marginLeft: 'auto', color: 'var(--sidebar-text)' }} />
        </div>
      </div>
    </aside>
  )
}
