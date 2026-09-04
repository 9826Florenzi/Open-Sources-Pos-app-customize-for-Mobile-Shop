import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useIdleTimeout } from '../hooks/useIdleTimeout'

const routeTitles: Record<string, { title: string; sub: string }> = {
  '/pos': { title: 'Bán hàng', sub: 'Màn hình thu ngân POS' },
  '/dashboard': { title: 'Tổng quan', sub: 'Hiệu suất kinh doanh' },
  '/products': { title: 'Sản phẩm & IMEI', sub: 'Danh sách thiết bị, phụ kiện & quản lý IMEI' },
  '/repair': { title: 'Sửa chữa', sub: 'Theo dõi tiếp nhận & tiến độ sửa chữa' },
  '/warranty': { title: 'Bảo hành', sub: 'Tra cứu thông tin bảo hành máy' },
  '/inventory': { title: 'Kho hàng', sub: 'Lịch sử nhập xuất & tồn kho' },
  '/orders': { title: 'Đơn hàng', sub: 'Danh sách hóa đơn bán lẻ' },
  '/customers': { title: 'Khách hàng', sub: 'Quản lý thông tin & công nợ khách hàng' },
  '/suppliers': { title: 'Nhà cung cấp', sub: 'Danh sách đối tác & công nợ' },
  '/cash': { title: 'Sổ quỹ', sub: 'Thu chi tiền mặt nội bộ' },
  '/reports': { title: 'Báo cáo', sub: 'Thống kê doanh thu & lợi nhuận' },
  '/audit': { title: 'Nhật ký hoạt động', sub: 'Lịch sử thao tác & kiểm toán hệ thống' },
  '/settings': { title: 'Cài đặt', sub: 'Cấu hình cửa hàng, máy in & tài khoản' }
}

export const Header: React.FC = () => {
  const location = useLocation()
  const [time, setTime] = useState(new Date())
  const { lockScreen } = useIdleTimeout(10)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const currentInfo = routeTitles[location.pathname] || { title: 'Hệ thống', sub: 'POS Quản Lý' }

  return (
    <header className="header">
      <div className="header-title">
        <h1>{currentInfo.title}</h1>
        <p>{currentInfo.sub}</p>
      </div>

      <div className="header-spacer" />

      <div className="header-clock">
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
          {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {time.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
        </span>
      </div>

      <button 
        className="btn btn-outline" 
        style={{ padding: '8px 12px', marginLeft: 16, borderColor: 'var(--border)' }}
        onClick={lockScreen}
        title="Khóa màn hình (Ctrl+L)"
      >
        <Lock size={16} />
      </button>
    </header>
  )
}
