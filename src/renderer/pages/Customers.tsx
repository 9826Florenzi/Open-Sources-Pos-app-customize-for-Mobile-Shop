import { Pagination } from '../components/Pagination'
import { formatCurrency } from '../utils/format'
import React, { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Pen,
  Trash2,
  Users,
  Eye,
  DollarSign,
  Phone,
  MapPin,
  Download
} from 'lucide-react'
import { Modal } from '../components/Modal'
import { useNotify } from '../context/AppContext'
import { exportToExcel } from '../utils/exportExcel'

export const Customers: React.FC = () => {
  const notify = useNotify()
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')

  // Form Modal
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    customer_group: 'regular',
    note: ''
  })
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [total, setTotal] = useState(0)

  // Detail Modal
  const [showDetail, setShowDetail] = useState(false)
  const [selectedCust, setSelectedCust] = useState<any>(null)

  // Pay Debt Modal
  const [showPayDebt, setShowPayDebt] = useState(false)
  const [debtCust, setDebtCust] = useState<any>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')

  useEffect(() => {
    loadCustomers()
  }, [page, pageSize, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  async function loadCustomers() {
    try {
      const list: any = await window.api.customers.getAll({ search: search || undefined, page, pageSize })
      if (list && typeof list === 'object' && 'data' in list && Array.isArray(list.data)) {
        setCustomers(list.data)
        setTotal(list.total ?? list.data.length)
      } else if (Array.isArray(list)) {
        setCustomers(list)
        setTotal(list.length)
      } else {
        setCustomers([])
        setTotal(0)
      }
    } catch (e) {
      console.error(e)
      setCustomers([])
      setTotal(0)
    }
  }

  
  function openCreate() {
    setForm({ name: '', phone: '', email: '', address: '', customer_group: 'regular', note: '' })
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(c: any) {
    setForm({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      customer_group: c.customer_group || 'regular',
      note: c.note || ''
    })
    setEditId(c.id)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      notify.warning('Thiếu tên', 'Vui lòng nhập tên khách hàng')
      return
    }
    setLoading(true)
    const result = editId
      ? await window.api.customers.update({ ...form, id: editId })
      : await window.api.customers.create(form)
    setLoading(false)
    if (result.success) {
      notify.success(editId ? 'Đã cập nhật khách hàng' : 'Đã thêm khách hàng')
      setShowModal(false)
      loadCustomers()
    } else {
      notify.error('Lỗi', result.message)
    }
  }

  async function handleDelete(c: any) {
    if (!window.confirm(`Xóa khách hàng "${c.name}"?`)) return
    const result = await window.api.customers.delete(c.id)
    if (result.success) {
      notify.success('Đã xóa khách hàng')
      loadCustomers()
    } else {
      notify.error('Lỗi', result.message)
    }
  }

  async function openDetail(id: number) {
    const detail = await window.api.customers.getById(id)
    setSelectedCust(detail)
    setShowDetail(true)
  }

  function openDebtModal(c: any) {
    setDebtCust(c)
    setPayAmount(String(c.debt || ''))
    setPayNote('')
    setShowPayDebt(true)
  }

  async function handlePayDebt() {
    const amt = parseFloat(payAmount) || 0
    if (amt <= 0) {
      notify.warning('Số tiền không hợp lệ', 'Vui lòng nhập số tiền thu nợ > 0')
      return
    }
    const res = await window.api.customers.payDebt({
      id: debtCust.id,
      amount: amt,
      note: payNote
    })
    if (res.success) {
      notify.success('Thu nợ thành công', `Đã trừ nợ ${formatCurrency(amt)}`)
      setShowPayDebt(false)
      loadCustomers()
    } else {
      notify.error('Lỗi', res.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Quản lý Khách hàng</h2>
          <p>{total} khách hàng trong hệ thống</p>
        </div>
        <div className="page-header-right">
          <button
            className="btn btn-outline"
            onClick={() => {
              const exportData = customers.map(c => ({
                'Tên khách hàng': c.name,
                'Số điện thoại': c.phone || '',
                'Email': c.email || '',
                'Địa chỉ': c.address || '',
                'Nhóm khách': c.customer_group,
                'Điểm tích lũy': c.points || 0,
                'Tổng chi tiêu': c.total_spent,
                'Công nợ': c.debt
              }))
              exportToExcel(exportData, 'Danh_Sach_Khach_Hang')
              notify.success('Đã xuất file Excel khách hàng')
            }}
          >
            <Download size={15} />
            <span>Xuất Excel</span>
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} />
            <span>Thêm khách hàng</span>
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 16px' }}>
          <div className="search-bar">
            <Search size={15} className="search-icon" />
            <input
              placeholder="Tìm theo tên hoặc số điện thoại..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Số điện thoại</th>
                <th>Địa chỉ</th>
                <th>Nhóm</th>
                <th className="text-right">Tổng chi tiêu</th>
                <th className="text-right">Công nợ hiện tại</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                  </td>
                  <td>{c.phone || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.address || '—'}</td>
                  <td>
                    <span className={`badge ${c.customer_group === 'vip' ? 'badge-primary' : 'badge-gray'}`}>
                      {c.customer_group.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-right font-bold" style={{ color: 'var(--success)' }}>
                    {formatCurrency(c.total_spent)}
                  </td>
                  <td className="text-right">
                    {c.debt > 0 ? (
                      <span className="badge badge-danger" style={{ fontSize: 12 }}>
                        {formatCurrency(c.debt)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>0đ</span>
                    )}
                  </td>
                  <td className="text-center">
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {c.debt > 0 && (
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: 'var(--warning)' }}
                          onClick={() => openDebtModal(c)}
                          title="Thu nợ"
                        >
                          <DollarSign size={14} />
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => openDetail(c.id)}
                        title="Xem lịch sử mua hàng"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => openEdit(c)}
                        title="Sửa"
                      >
                        <Pen size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleDelete(c)}
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    <Users size={40} />
                    <p>Không có khách hàng nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(s: any) => { setPageSize(s); setPage(1); }} />
        </div>

      {/* Customer Create/Edit Modal */}
      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Sửa khách hàng' : 'Thêm khách hàng mới'}
        size="md"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu khách hàng'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Tên khách hàng *</label>
          <input
            className="form-input"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Nhập họ tên"
            autoFocus
          />
        </div>
        <div className="form-row col-2">
          <div className="form-group">
            <label className="form-label">Số điện thoại</label>
            <input
              className="form-input"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Địa chỉ</label>
          <input
            className="form-input"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Ghi chú</label>
          <textarea
            className="form-textarea"
            rows={2}
            value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value })}
          />
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        show={showDetail}
        onClose={() => setShowDetail(false)}
        title={`Khách hàng: ${selectedCust?.name}`}
        size="lg"
      >
        {selectedCust && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: 13, background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
              <div><b>Điện thoại:</b> {selectedCust.phone || '—'}</div>
              <div><b>Địa chỉ:</b> {selectedCust.address || '—'}</div>
              <div><b>Tổng chi tiêu:</b> <span style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(selectedCust.total_spent)}</span></div>
              <div><b>Công nợ:</b> <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{formatCurrency(selectedCust.debt)}</span></div>
            </div>

            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Lịch sử mua hàng gần nhất</h4>
            <div style={{ maxHeight: 250, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Thời gian</th>
                    <th className="text-right">Tổng tiền</th>
                    <th className="text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCust.orders?.map((o: any) => (
                    <tr key={o.id}>
                      <td><strong>{o.order_number}</strong></td>
                      <td>{new Date(o.created_at).toLocaleString('vi-VN')}</td>
                      <td className="text-right font-bold">{formatCurrency(o.total_amount)}</td>
                      <td className="text-center">
                        <span className="badge badge-success">{o.status}</span>
                      </td>
                    </tr>
                  ))}
                  {(!selectedCust.orders || selectedCust.orders.length === 0) && (
                    <tr><td colSpan={4} className="empty-state">Chưa có lịch sử mua hàng</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Pay Debt Modal */}
      <Modal
        show={showPayDebt}
        onClose={() => setShowPayDebt(false)}
        title={`Thu nợ khách hàng: ${debtCust?.name}`}
        size="sm"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowPayDebt(false)}>Hủy</button>
            <button className="btn btn-success" onClick={handlePayDebt}>Xác nhận thu nợ</button>
          </>
        }
      >
        <div style={{ fontSize: 13, marginBottom: 12 }}>
          Số nợ hiện tại: <strong style={{ color: 'var(--danger)', fontSize: 16 }}>{formatCurrency(debtCust?.debt)}</strong>
        </div>
        <div className="form-group">
          <label className="form-label">Số tiền khách trả (VNĐ) *</label>
          <input
            type="number"
            className="form-input"
            value={payAmount}
            onChange={e => setPayAmount(e.target.value)}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Ghi chú thu nợ</label>
          <input
            className="form-input"
            placeholder="VD: Chuyển khoản qua VCB..."
            value={payNote}
            onChange={e => setPayNote(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}
