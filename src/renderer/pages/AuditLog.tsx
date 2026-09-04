import React, { useState, useEffect } from 'react'
import {
  Search,
  History,
  ShieldAlert,
  User,
  Calendar,
  Eye,
  RefreshCw,
  Download,
  Activity,
  ShoppingCart,
  Boxes,
  Wrench,
  DollarSign,
  Smartphone,
  Layers,
  Radio,
  ArrowRight,
  Filter
} from 'lucide-react'
import { Modal } from '../components/Modal'
import { formatDateTime } from '../utils/dateTime'
import { exportToExcel } from '../utils/exportExcel'
import { useNotify } from '../context/AppContext'

const ACTION_COLORS: Record<string, string> = {
  'Đăng nhập': 'badge-info',
  'Bán hàng (Tạo đơn hàng)': 'badge-success',
  'Tạo đơn hàng': 'badge-success',
  'Hủy đơn hàng': 'badge-danger',
  'Nhập hàng vào kho': 'badge-primary',
  'Thêm sản phẩm': 'badge-info',
  'Cập nhật sản phẩm': 'badge-warning',
  'Xóa sản phẩm': 'badge-danger',
  'Khôi phục sản phẩm': 'badge-success',
  'Xóa vĩnh viễn sản phẩm': 'badge-danger',
  'Nhập mã IMEI': 'badge-primary',
  'Xóa mã IMEI': 'badge-danger',
  'Tiếp nhận sửa chữa': 'badge-primary',
  'Cập nhật sửa chữa': 'badge-warning',
  'Cập nhật phiếu sửa': 'badge-info',
  'Thêm chi phí sửa chữa': 'badge-warning',
  'Hủy phiếu sửa chữa': 'badge-danger',
  'Tạo phiếu thu (+)': 'badge-success',
  'Tạo phiếu chi (-)': 'badge-danger',
  'Thêm khách hàng': 'badge-info',
  'Cập nhật khách hàng': 'badge-gray',
  'Xóa khách hàng': 'badge-danger',
  'Thu nợ khách hàng': 'badge-success',
  'Thêm nhà cung cấp': 'badge-info',
  'Cập nhật nhà cung cấp': 'badge-gray',
  'Xóa nhà cung cấp': 'badge-danger',
  'Tạo tài khoản': 'badge-primary',
  'Cập nhật tài khoản': 'badge-gray',
  'Khóa tài khoản': 'badge-danger',
  'Đổi mật khẩu': 'badge-warning',
  'Cập nhật cài đặt': 'badge-gray',
  'Sao lưu dữ liệu': 'badge-success'
}

const ENTITY_LABELS: Record<string, { label: string; icon: string }> = {
  orders: { label: 'Bán hàng', icon: '🛒' },
  inventory: { label: 'Kho hàng', icon: '📦' },
  products: { label: 'Sản phẩm', icon: '🏷️' },
  repair: { label: 'Sửa chữa', icon: '🔧' },
  cash: { label: 'Sổ quỹ', icon: '💵' },
  customers: { label: 'Khách hàng', icon: '👥' },
  suppliers: { label: 'Nhà cung cấp', icon: '🏢' },
  users: { label: 'Tài khoản', icon: '👤' },
  auth: { label: 'Xác thực', icon: '🔐' },
  settings: { label: 'Cài đặt', icon: '⚙️' },
  database: { label: 'Sao lưu DB', icon: '💾' }
}

export const AuditLog: React.FC = () => {
  const notify = useNotify()
  const [logs, setLogs] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [activeDatePreset, setActiveDatePreset] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isFetching, setIsFetching] = useState(false)

  // Detail Modal
  const [showDetail, setShowDetail] = useState(false)
  const [selectedLog, setSelectedLog] = useState<any>(null)

  // Auto-refresh interval (every 3 seconds)
  useEffect(() => {
    loadLogs(true)
    let interval: NodeJS.Timeout | null = null
    if (autoRefresh) {
      interval = setInterval(() => {
        loadLogs(false)
      }, 3000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [search, entityFilter, actionFilter, dateFrom, dateTo, autoRefresh])

  async function loadLogs(showSpinner = false) {
    if (showSpinner) setIsFetching(true)
    try {
      const data = await window.api.audit.getAll({
        search: search || undefined,
        entity: entityFilter || undefined,
        action: actionFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit: 300
      })
      setLogs(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      if (showSpinner) setIsFetching(false)
    }
  }

  // Quick Date Preset Handler
  function handleDatePreset(preset: 'today' | 'yesterday' | '7days' | 'month' | 'all') {
    setActiveDatePreset(preset)
    const now = new Date()
    const toISO = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    if (preset === 'today') {
      const s = toISO(now)
      setDateFrom(s)
      setDateTo(s)
    } else if (preset === 'yesterday') {
      const y = new Date(now.getTime() - 86400000)
      const s = toISO(y)
      setDateFrom(s)
      setDateTo(s)
    } else if (preset === '7days') {
      const d7 = new Date(now.getTime() - 6 * 86400000)
      setDateFrom(toISO(d7))
      setDateTo(toISO(now))
    } else if (preset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      setDateFrom(toISO(start))
      setDateTo(toISO(now))
    } else {
      setDateFrom('')
      setDateTo('')
    }
  }

  // Quick stats
  const todayStr = new Date().toISOString().slice(0, 10)
  const salesCount = logs.filter(l => l.entity === 'orders' && l.created_at?.startsWith(todayStr)).length
  const inventoryCount = logs.filter(l => l.entity === 'inventory' && l.created_at?.startsWith(todayStr)).length
  const repairCount = logs.filter(l => l.entity === 'repair' && l.created_at?.startsWith(todayStr)).length
  const cashCount = logs.filter(l => l.entity === 'cash' && l.created_at?.startsWith(todayStr)).length

  function handleExportExcel() {
    if (logs.length === 0) {
      notify.warning('Không có dữ liệu', 'Không có nhật ký nào để xuất Excel')
      return
    }
    const exportData = logs.map(l => ({
      'Mã log': l.id,
      'Thời gian (UTC+7)': formatDateTime(l.created_at),
      'Người thực hiện': l.user_name || 'Hệ thống',
      'Hành động': l.action,
      'Phân hệ': ENTITY_LABELS[l.entity]?.label || l.entity || '—',
      'Mã liên quan': l.entity_id || '',
      'Nội dung chi tiết': l.details || ''
    }))
    exportToExcel(exportData, 'Nhat_Ky_Hoat_Dong_POS')
    notify.success('Đã xuất file Excel nhật ký hoạt động!')
  }

  // Format details with highlight for "➔"
  function renderDetailSnippet(text: string) {
    if (!text) return '—'
    if (text.includes('➔')) {
      const parts = text.split('➔')
      return (
        <span>
          {parts[0]}
          <span style={{ color: '#0284c7', fontWeight: 700, margin: '0 4px' }}>➔</span>
          <span style={{ color: '#16a34a', fontWeight: 600 }}>{parts.slice(1).join('➔')}</span>
        </span>
      )
    }
    return text
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Nhật ký Hoạt động (Audit Log)</h2>
          <p>Giám sát toàn diện biến động: Bán hàng, Nhập xuất kho, Sửa chữa, Giá bán, Tồn tối thiểu, Khách hàng...</p>
        </div>
        <div className="page-header-right">
          {/* Live Status indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: autoRefresh ? '#f0fdf4' : 'var(--bg)',
              border: `1px solid ${autoRefresh ? '#86efac' : 'var(--border)'}`,
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontWeight: 600,
              color: autoRefresh ? '#15803d' : 'var(--text-muted)'
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: autoRefresh ? '#22c55e' : '#94a3b8',
                boxShadow: autoRefresh ? '0 0 8px #22c55e' : 'none',
                display: 'inline-block'
              }}
            />
            <span>{autoRefresh ? 'LIVE • Tự động cập nhật (3s)' : 'Tạm dừng cập nhật'}</span>
          </div>

          <button
            className={`btn ${autoRefresh ? 'btn-outline' : 'btn-primary'} btn-sm`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Dừng cập nhật' : 'Bật cập nhật'}
          </button>

          <button
            className="btn btn-outline btn-sm"
            onClick={() => loadLogs(true)}
            disabled={isFetching}
            title="Làm mới ngay lập tức"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          <button className="btn btn-outline btn-sm" onClick={handleExportExcel}>
            <Download size={14} />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}>
            <ShoppingCart size={20} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Bán hàng hôm nay</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{salesCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', flexShrink: 0 }}>
            <Boxes size={20} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Nhập kho hôm nay</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{inventoryCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', flexShrink: 0 }}>
            <Wrench size={20} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Sửa chữa hôm nay</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{repairCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', flexShrink: 0 }}>
            <DollarSign size={20} />
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Thu chi hôm nay</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{cashCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-bar" style={{ flex: 1, minWidth: 220 }}>
              <Search size={15} className="search-icon" />
              <input
                placeholder="Tìm theo mã HĐ, tên sản phẩm, IMEI, khách hàng, nhân viên..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <select
              className="form-select"
              style={{ width: 180 }}
              value={entityFilter}
              onChange={e => setEntityFilter(e.target.value)}
            >
              <option value="">Tất cả phân hệ</option>
              <option value="orders">🛒 Bán hàng & Đơn hàng</option>
              <option value="inventory">📦 Kho hàng & Nhập xuất</option>
              <option value="products">🏷️ Sản phẩm & IMEI</option>
              <option value="repair">🔧 Sửa chữa & Tiếp nhận</option>
              <option value="cash">💵 Sổ quỹ thu chi</option>
              <option value="customers">👥 Khách hàng & Công nợ</option>
              <option value="suppliers">🏢 Nhà cung cấp</option>
              <option value="users">👤 Tài khoản nhân viên</option>
              <option value="auth">🔐 Đăng nhập & Xác thực</option>
              <option value="settings">⚙️ Cài đặt & Sao lưu</option>
            </select>

            <input
              type="date"
              className="form-input"
              style={{ width: 140 }}
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value)
                setActiveDatePreset('custom')
              }}
              title="Từ ngày"
            />
            <input
              type="date"
              className="form-input"
              style={{ width: 140 }}
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value)
                setActiveDatePreset('custom')
              }}
              title="Đến ngày"
            />

            {(search || entityFilter || actionFilter || dateFrom || dateTo) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearch('')
                  setEntityFilter('')
                  setActionFilter('')
                  setDateFrom('')
                  setDateTo('')
                  setActiveDatePreset('all')
                }}
              >
                Xóa lọc
              </button>
            )}
          </div>

          {/* Quick Date Range Shortcuts */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginRight: 4 }}>
              Lọc nhanh thời gian:
            </span>
            <button
              type="button"
              className={`btn btn-sm ${activeDatePreset === 'today' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => handleDatePreset('today')}
            >
              Hôm nay
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeDatePreset === 'yesterday' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => handleDatePreset('yesterday')}
            >
              Hôm qua
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeDatePreset === '7days' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => handleDatePreset('7days')}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeDatePreset === 'month' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => handleDatePreset('month')}
            >
              Tháng này
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeDatePreset === 'all' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => handleDatePreset('all')}
            >
              Tất cả
            </button>
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 145 }}>Thời gian</th>
                <th style={{ width: 135 }}>Người thực hiện</th>
                <th style={{ width: 125 }}>Phân hệ</th>
                <th style={{ width: 165 }}>Hành động</th>
                <th>Chi tiết biến động dữ liệu</th>
                <th className="text-center" style={{ width: 55 }}>Xem</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const badgeClass = ACTION_COLORS[log.action] || 'badge-gray'
                const entityInfo = ENTITY_LABELS[log.entity] || { label: log.entity || '—', icon: '📝' }

                return (
                  <tr key={log.id}>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatDateTime(log.created_at)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.user_name || 'Hệ thống'}</div>
                      {log.user_role && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {log.user_role === 'admin' ? 'Quản trị' : 'Thu ngân'}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          background: 'var(--bg)',
                          padding: '3px 8px',
                          borderRadius: 4,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span>{entityInfo.icon}</span>
                        <span>{entityInfo.label}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${badgeClass}`}>{log.action}</span>
                    </td>
                    <td style={{ fontSize: 12.5, maxWidth: 420 }}>
                      <div className="truncate" title={log.details || ''}>
                        {renderDetailSnippet(log.details || '')}
                      </div>
                    </td>
                    <td className="text-center">
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => {
                          setSelectedLog(log)
                          setShowDetail(true)
                        }}
                        title="Xem chi tiết đầy đủ"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    <History size={40} />
                    <p>Chưa có nhật ký hoạt động nào phù hợp bộ lọc</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        show={showDetail}
        onClose={() => setShowDetail(false)}
        title="Chi tiết nhật ký biến động dữ liệu"
        size="md"
        footer={
          <button className="btn btn-primary" onClick={() => setShowDetail(false)}>
            Đóng
          </button>
        }
      >
        {selectedLog && (
          <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
              <div><b>Mã bản ghi:</b> #{selectedLog.id}</div>
              <div><b>Thời gian (UTC+7):</b> {formatDateTime(selectedLog.created_at)}</div>
              <div><b>Người thực hiện:</b> {selectedLog.user_name || 'Hệ thống'}</div>
              <div><b>Phân hệ:</b> {ENTITY_LABELS[selectedLog.entity]?.label || selectedLog.entity || '—'}</div>
            </div>

            <div>
              <b>Hành động:</b>{' '}
              <span className={`badge ${ACTION_COLORS[selectedLog.action] || 'badge-gray'}`} style={{ marginLeft: 6 }}>
                {selectedLog.action}
              </span>
            </div>

            {selectedLog.entity_id && (
              <div><b>ID đối tượng liên quan:</b> #{selectedLog.entity_id}</div>
            )}

            <div>
              <b>Nội dung chi tiết thay đổi:</b>
              <div style={{
                background: '#fafbfc',
                padding: 14,
                borderRadius: 'var(--radius-sm)',
                marginTop: 6,
                fontSize: 12.5,
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                lineHeight: 1.7
              }}>
                {selectedLog.details ? (
                  selectedLog.details.includes('|') ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selectedLog.details.split('|').map((part: string, idx: number) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>•</span>
                          <span>{renderDetailSnippet(part.trim())}</span>
                        </div>
                      ))}
                    </div>
                  ) : selectedLog.details.includes(';') ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selectedLog.details.split(';').map((part: string, idx: number) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>•</span>
                          <span>{renderDetailSnippet(part.trim())}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>{renderDetailSnippet(selectedLog.details)}</div>
                  )
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Không có chi tiết bổ sung</span>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
