import { formatCurrency } from '../utils/format'
import React, { useState, useEffect } from 'react'
import { Plus, ArrowDownRight, ArrowUpRight, Wallet, DollarSign, Download } from 'lucide-react'
import { Modal } from '../components/Modal'
import { useAuth, useNotify } from '../context/AppContext'
import { exportToExcel } from '../utils/exportExcel'
import { formatDateTime } from '../utils/dateTime'

export const CashBook: React.FC = () => {
  const { user } = useAuth()
  const notify = useNotify()

  const [transactions, setTransactions] = useState<any[]>([])
  const [summary, setSummary] = useState({ total_in: 0, total_out: 0, balance: 0 })
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState({
    type: 'out',
    amount: '',
    category: '',
    note: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [typeFilter, dateFrom, dateTo])

  async function loadData() {
    try {
      const [list, sum] = await Promise.all([
        window.api.cash.getAll({
          type: typeFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined
        }),
        window.api.cash.getTodaySummary()
      ])
      setTransactions(Array.isArray(list) ? list : [])
      setSummary(sum || { total_in: 0, total_out: 0, balance: 0 })
    } catch (e) {
      console.error(e)
      setTransactions([])
    }
  }

  
  async function handleCreate() {
    const amt = parseFloat(form.amount) || 0
    if (amt <= 0) {
      notify.warning('Số tiền không hợp lệ', 'Vui lòng nhập số tiền > 0')
      return
    }
    if (!form.category.trim()) {
      notify.warning('Thiếu danh mục', 'Vui lòng nhập lý do / danh mục thu chi')
      return
    }

    setLoading(true)
    const res = await window.api.cash.create({
      ...form,
      amount: amt,
      staff_id: user?.id
    })
    setLoading(false)
    if (res.success) {
      notify.success('Đã lưu phiếu thu/chi')
      setShowCreateModal(false)
      setForm({ type: 'out', amount: '', category: '', note: '' })
      loadData()
    } else {
      notify.error('Lỗi', res.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Sổ quỹ Tiền mặt</h2>
          <p>Quản lý thu chi nội bộ cửa hàng</p>
        </div>
        <div className="page-header-right">
          <button
            className="btn btn-outline"
            onClick={() => {
              const exportData = transactions.map(t => ({
                'Thời gian': formatDateTime(t.created_at),
                'Loại phiếu': t.type === 'in' ? 'Thu (+)' : 'Chi (-)',
                'Danh mục / Lý do': t.category,
                'Số tiền': t.amount,
                'Người thực hiện': t.staff_name || '',
                'Ghi chú': t.note || ''
              }))
              exportToExcel(exportData, 'Danh_Sach_So_Quy')
              notify.success('Đã xuất file Excel sổ quỹ')
            }}
          >
            <Download size={15} />
            <span>Xuất Excel</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={15} />
            <span>Tạo phiếu Thu / Chi</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green">
            <ArrowDownRight size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Tổng thu hôm nay</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              +{formatCurrency(summary.total_in)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <ArrowUpRight size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Tổng chi hôm nay</div>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>
              -{formatCurrency(summary.total_out)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <Wallet size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Số dư quỹ hôm nay</div>
            <div className="stat-value" style={{ color: summary.balance >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
              {formatCurrency(summary.balance)}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: 160 }}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">Tất cả loại phiếu</option>
            <option value="in">Phiếu Thu (+)</option>
            <option value="out">Phiếu Chi (-)</option>
          </select>

          <input
            type="date"
            className="form-input"
            style={{ width: 140 }}
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            title="Từ ngày"
          />
          <input
            type="date"
            className="form-input"
            style={{ width: 140 }}
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            title="Đến ngày"
          />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Loại phiếu</th>
                <th>Lý do / Danh mục</th>
                <th className="text-right">Số tiền</th>
                <th>Người tạo</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {formatDateTime(t.created_at)}
                  </td>
                  <td>
                    {t.type === 'in' ? (
                      <span className="badge badge-success">Phiếu Thu (+)</span>
                    ) : (
                      <span className="badge badge-danger">Phiếu Chi (-)</span>
                    )}
                  </td>
                  <td><strong>{t.category}</strong></td>
                  <td className="text-right font-bold" style={{ color: t.type === 'in' ? 'var(--success)' : 'var(--danger)' }}>
                    {t.type === 'in' ? `+${formatCurrency(t.amount)}` : `-${formatCurrency(t.amount)}`}
                  </td>
                  <td style={{ fontSize: 12 }}>{t.staff_name || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.note || '—'}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    <DollarSign size={40} />
                    <p>Chưa có phiếu thu chi nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Tạo phiếu thu / chi tiền mặt"
        size="md"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu phiếu'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Loại giao dịch *</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className={`btn ${form.type === 'in' ? 'btn-success' : 'btn-outline'} flex-1`}
              onClick={() => setForm({ ...form, type: 'in' })}
            >
              + Phiếu Thu Tiền Vào
            </button>
            <button
              type="button"
              className={`btn ${form.type === 'out' ? 'btn-danger' : 'btn-outline'} flex-1`}
              onClick={() => setForm({ ...form, type: 'out' })}
            >
              - Phiếu Chi Tiền Ra
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Số tiền (VNĐ) *</label>
          <input
            type="number"
            className="form-input"
            placeholder="0"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Lý do / Danh mục thu chi *</label>
          <input
            className="form-input"
            placeholder={form.type === 'in' ? 'VD: Thu nợ ngoài, tiền hỗ trợ hãng...' : 'VD: Tiền điện nước, ăn trưa nhân viên, mua dụng cụ sửa...'}
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Ghi chú chi tiết</label>
          <textarea
            className="form-textarea"
            rows={2}
            value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  )
}
