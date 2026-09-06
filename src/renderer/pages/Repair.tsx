import { formatCurrency } from '../utils/format'
import React, { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Wrench,
  Eye,
  Trash2,
  Printer,
  Clock,
  CheckCircle2,
  DollarSign,
  User,
  Smartphone,
  Download,
  Calendar,
  Phone,
  Edit2,
  Check,
  X
} from 'lucide-react'
import { Modal } from '../components/Modal'
import { useAuth, useNotify } from '../context/AppContext'
import { exportToExcel } from '../utils/exportExcel'
import { formatDateTime } from '../utils/dateTime'

export const STATUS_COLUMNS = [
  { key: 'received', label: 'MỚI TIẾP NHẬN', color: '#64748b', bg: '#f1f5f9' },
  { key: 'diagnosing', label: 'ĐANG CHẨN ĐOÁN', color: '#0284c7', bg: '#e0f2fe' },
  { key: 'waiting_parts', label: 'CHỜ LINH KIỆN', color: '#d97706', bg: '#fef3c7' },
  { key: 'repairing', label: 'ĐANG SỬA CHỮA', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'done', label: 'ĐÃ HOÀN THÀNH', color: '#16a34a', bg: '#dcfce7' },
  { key: 'returned', label: 'ĐÃ TRẢ KHÁCH', color: '#0f766e', bg: '#ccfbf1' }
]

function normalizeStatus(status: string): string {
  if (status === 'pending') return 'received'
  if (status === 'processing') return 'repairing'
  if (status === 'completed') return 'done'
  if (status === 'delivered') return 'returned'
  return status || 'received'
}

export const Repair: React.FC = () => {
  const { user } = useAuth()
  const notify = useNotify()

  const [tickets, setTickets] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  // Drag and Drop state
  const [draggedTicketId, setDraggedTicketId] = useState<number | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    customer_id: null as number | null,
    customer_name: '',
    customer_phone: '',
    device_info: '',
    imei: '',
    issue_description: '',
    promised_at: '',
    deposit_paid: '',
    total_fee: '',
    note: ''
  })
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Detail Modal
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [editForm, setEditForm] = useState({
    customer_name: '',
    customer_phone: '',
    device_info: '',
    imei: '',
    issue_description: '',
    promised_at: '',
    deposit_paid: '',
    total_fee: '',
    note: ''
  })

  // Line item states
  const [newLineType, setNewLineType] = useState<'service' | 'part' | 'labor'>('service')
  const [newLineName, setNewLineName] = useState('')
  const [newLinePrice, setNewLinePrice] = useState('')
  const [newLineQty, setNewLineQty] = useState('1')

  // Edit line state
  const [editingLineId, setEditingLineId] = useState<number | null>(null)
  const [editLineData, setEditLineData] = useState({ name: '', price: '', qty: '1', line_type: 'service' })

  useEffect(() => {
    loadTickets()
  }, [search])

  async function loadTickets() {
    try {
      const data = await window.api.repair.getAll({ search: search || undefined })
      setTickets(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setTickets([])
    }
  }

  
  // Customer search suggestions for creation
  async function handleCustomerNameChange(name: string) {
    setCreateForm(prev => ({ ...prev, customer_name: name, customer_id: null }))
    if (name.trim().length >= 2) {
      const results = await window.api.customers.search(name.trim())
      setCustomerSuggestions(Array.isArray(results) ? results.slice(0, 5) : [])
    } else {
      setCustomerSuggestions([])
    }
  }

  function selectCustomer(cust: any) {
    setCreateForm(prev => ({
      ...prev,
      customer_id: cust.id,
      customer_name: cust.name,
      customer_phone: cust.phone || ''
    }))
    setCustomerSuggestions([])
  }

  async function handleCreateTicket() {
    if (!createForm.customer_name.trim() || !createForm.device_info.trim()) {
      notify.warning('Thiếu thông tin', 'Vui lòng nhập tên khách hàng và tên thiết bị')
      return
    }
    setLoading(true)
    const res = await window.api.repair.create({
      ...createForm,
      deposit_paid: parseFloat(createForm.deposit_paid) || 0,
      total_fee: parseFloat(createForm.total_fee) || 0,
      staff_id: user?.id
    })
    setLoading(false)
    if (res.success) {
      notify.success('Tiếp nhận máy thành công!', `Mã phiếu: ${res.ticketNumber}`)
      setShowCreateModal(false)
      setCreateForm({
        customer_id: null,
        customer_name: '',
        customer_phone: '',
        device_info: '',
        imei: '',
        issue_description: '',
        promised_at: '',
        deposit_paid: '',
        total_fee: '',
        note: ''
      })
      setCustomerSuggestions([])
      loadTickets()
    } else {
      notify.error('Lỗi', res.message)
    }
  }

  async function openDetail(ticketId: number, startEdit = false) {
    try {
      const detail = await window.api.repair.getById(ticketId)
      if (!detail) {
        notify.error('Lỗi', 'Không tìm thấy thông tin phiếu')
        return
      }
      setSelectedTicket(detail)
      setEditForm({
        customer_name: detail.customer_name || '',
        customer_phone: detail.customer_phone || '',
        device_info: detail.device_info || '',
        imei: detail.imei || '',
        issue_description: detail.issue_description || '',
        promised_at: detail.promised_at ? detail.promised_at.slice(0, 16) : '',
        deposit_paid: String(detail.deposit_paid || 0),
        total_fee: String(detail.total_fee || 0),
        note: detail.note || ''
      })
      setIsEditingInfo(Boolean(startEdit))
      setShowDetailModal(true)
    } catch (e: any) {
      console.error(e)
      notify.error('Lỗi', 'Không thể tải chi tiết phiếu')
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    if (!selectedTicket) return
    const res = await window.api.repair.updateStatus({ id: selectedTicket.id, status: newStatus })
    if (res.success) {
      notify.success('Đã cập nhật trạng thái')
      const updated = await window.api.repair.getById(selectedTicket.id)
      setSelectedTicket(updated)
      loadTickets()
    } else {
      notify.error('Lỗi', res.message)
    }
  }

  async function handleQuickUpdateStatus(ticketId: number, newStatus: string) {
    const res = await window.api.repair.updateStatus({ id: ticketId, status: newStatus })
    if (res.success) {
      notify.success('Đã chuyển trạng thái phiếu')
      loadTickets()
      if (selectedTicket?.id === ticketId) {
        const updated = await window.api.repair.getById(ticketId)
        setSelectedTicket(updated)
      }
    } else {
      notify.error('Lỗi', res.message)
    }
  }

  async function handleSaveTicketInfo() {
    if (!selectedTicket) return
    const res = await window.api.repair.update({
      id: selectedTicket.id,
      ...editForm,
      total_fee: parseFloat(editForm.total_fee) || 0,
      deposit_paid: parseFloat(editForm.deposit_paid) || 0,
      staff_id: selectedTicket.staff_id || user?.id
    })
    if (res.success) {
      notify.success('Đã cập nhật thông tin phiếu sửa')
      setIsEditingInfo(false)
      const updated = await window.api.repair.getById(selectedTicket.id)
      setSelectedTicket(updated)
      loadTickets()
    } else {
      notify.error('Lỗi', res.message)
    }
  }

  function handleStartEditLine(line: any) {
    setEditingLineId(line.id)
    setEditLineData({
      name: line.name || '',
      price: String(line.price || 0),
      qty: String(line.qty || 1),
      line_type: line.line_type || 'service'
    })
  }

  async function handleSaveEditLine(lineId: number) {
    if (!editLineData.name.trim()) {
      notify.warning('Thiếu thông tin', 'Vui lòng nhập tên hạng mục')
      return
    }
    const res = await window.api.repair.updateLine({
      id: lineId,
      name: editLineData.name.trim(),
      price: parseFloat(editLineData.price) || 0,
      qty: parseInt(editLineData.qty) || 1,
      line_type: editLineData.line_type
    })
    if (res.success) {
      notify.success('Đã cập nhật hạng mục chi phí')
      setEditingLineId(null)
      const updated = await window.api.repair.getById(selectedTicket.id)
      setSelectedTicket(updated)
      loadTickets()
    } else {
      notify.error('Lỗi', res.message)
    }
  }

  async function handleDeleteTicket(ticketId: number) {
    if (!window.confirm('Bạn có chắc chắn muốn hủy phiếu sửa chữa này không?')) return
    const res = await window.api.repair.delete(ticketId)
    if (res.success) {
      notify.success('Đã hủy phiếu sửa chữa')
      setShowDetailModal(false)
      loadTickets()
    } else {
      notify.error('Lỗi', res.message)
    }
  }

  async function handleAddLine() {
    if (!newLineName.trim() || !newLinePrice) {
      notify.warning('Thiếu thông tin', 'Vui lòng nhập tên hạng mục và đơn giá')
      return
    }
    const res = await window.api.repair.addLine({
      ticket_id: selectedTicket.id,
      line_type: newLineType,
      name: newLineName.trim(),
      price: parseFloat(newLinePrice) || 0,
      qty: parseInt(newLineQty) || 1
    })
    if (res.success) {
      notify.success('Đã thêm chi phí')
      setNewLineName('')
      setNewLinePrice('')
      setNewLineQty('1')
      const updated = await window.api.repair.getById(selectedTicket.id)
      setSelectedTicket(updated)
      loadTickets()
    } else {
      notify.error('Lỗi', res.message)
    }
  }

  async function handleDeleteLine(lineId: number) {
    const res = await window.api.repair.deleteLine(lineId)
    if (res.success) {
      notify.success('Đã xóa hạng mục')
      const updated = await window.api.repair.getById(selectedTicket.id)
      setSelectedTicket(updated)
      loadTickets()
    }
  }

  async function handlePrintTicket(ticketId: number) {
    const res = await window.api.print.repairTicket(ticketId)
    if (res.success) {
      notify.success('Đã gửi lệnh in phiếu sửa')
    } else {
      notify.error('Lỗi in', res.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Quản lý Phiếu Sửa Chữa</h2>
          <p>{tickets.filter(t => normalizeStatus(t.status) !== 'returned' && t.status !== 'cancelled').length} máy đang trong quy trình</p>
        </div>
        <div className="page-header-right">
          <div style={{ display: 'flex', gap: 6, marginRight: 8 }}>
            <button
              className={`btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              onClick={() => setViewMode('kanban')}
            >
              Bảng Kanban
            </button>
            <button
              className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'} btn-sm`}
              onClick={() => setViewMode('list')}
            >
              Danh sách
            </button>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => {
              const exportData = tickets.map(t => ({
                'Mã phiếu': t.ticket_number,
                'Ngày tiếp nhận': formatDateTime(t.created_at),
                'Khách hàng': t.customer_name,
                'Số điện thoại': t.customer_phone || '',
                'Thiết bị': t.device_info,
                'Mã IMEI': t.imei || '',
                'Tình trạng lỗi': t.issue_description || '',
                'Trạng thái': normalizeStatus(t.status),
                'Tổng phí': t.total_fee,
                'Đặt cọc': t.deposit_paid,
                'Còn lại': Math.max(0, t.total_fee - t.deposit_paid)
              }))
              exportToExcel(exportData, 'Danh_Sach_Phieu_Sua_Chua')
              notify.success('Đã xuất file Excel phiếu sửa chữa')
            }}
          >
            <Download size={15} />
            <span>Xuất Excel</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={15} />
            <span>Tiếp nhận máy mới</span>
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <Search size={15} className="search-icon" />
            <input
              placeholder="Tìm theo mã phiếu (SC...), tên khách, SĐT, thiết bị, IMEI..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 12,
          alignItems: 'start',
          overflowX: 'auto',
          paddingBottom: 20
        }}>
          {STATUS_COLUMNS.map(col => {
            const colTickets = tickets.filter(t => normalizeStatus(t.status) === col.key)
            const isHovered = dragOverColumn === col.key

            return (
              <div
                key={col.key}
                onDragOver={e => {
                  e.preventDefault()
                  if (dragOverColumn !== col.key) setDragOverColumn(col.key)
                }}
                onDragLeave={() => {
                  if (dragOverColumn === col.key) setDragOverColumn(null)
                }}
                onDrop={async e => {
                  e.preventDefault()
                  setDragOverColumn(null)
                  const ticketIdStr = e.dataTransfer.getData('text/plain')
                  const ticketId = parseInt(ticketIdStr)
                  if (ticketId) {
                    await handleQuickUpdateStatus(ticketId, col.key)
                  }
                }}
                style={{
                  background: isHovered ? col.bg : 'var(--bg)',
                  borderRadius: 'var(--radius)',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  minWidth: 190,
                  border: isHovered ? `2px dashed ${col.color}` : '1px solid var(--border)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: 8,
                  borderBottom: `2px solid ${col.color}`,
                  fontWeight: 700,
                  fontSize: 11,
                  color: col.color
                }}>
                  <span>{col.label}</span>
                  <span className="badge badge-gray">{colTickets.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
                  {colTickets.map(t => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={e => {
                        if ((e.target as HTMLElement).closest('button, input, select, textarea, a')) {
                          e.preventDefault()
                          return
                        }
                        e.dataTransfer.setData('text/plain', String(t.id))
                        setDraggedTicketId(t.id)
                      }}
                      onDragEnd={() => {
                        setDraggedTicketId(null)
                        setDragOverColumn(null)
                      }}
                      className="card"
                      style={{
                        padding: 12,
                        cursor: 'grab',
                        opacity: draggedTicketId === t.id ? 0.4 : 1,
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        borderLeft: `3px solid ${col.color}`,
                        position: 'relative'
                      }}
                      onClick={e => {
                        if ((e.target as HTMLElement).closest('button')) return
                        openDetail(t.id, false)
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--primary)' }}>
                          {t.ticket_number}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {formatDateTime(t.created_at, false)}
                        </span>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                        {t.device_info}
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        👤 {t.customer_name} {t.customer_phone && `• ${t.customer_phone}`}
                      </div>

                      {t.issue_description && (
                        <div style={{
                          fontSize: 11,
                          color: 'var(--danger)',
                          background: 'var(--danger-light)',
                          padding: '4px 6px',
                          borderRadius: 4,
                          marginTop: 6
                        }}>
                          {t.issue_description}
                        </div>
                      )}

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 8,
                        paddingTop: 6,
                        borderTop: '1px dashed var(--border)',
                        fontSize: 11
                      }}>
                        <div>
                          <span>Phí: <b>{formatCurrency(t.total_fee)}</b></span>
                          {t.deposit_paid > 0 && (
                            <span style={{ color: 'var(--success)', marginLeft: 6 }}>• Cọc: {formatCurrency(t.deposit_paid)}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          draggable={false}
                          className="btn btn-outline btn-xs"
                          style={{
                            padding: '2px 8px',
                            fontSize: 11,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            borderColor: 'var(--primary)',
                            color: 'var(--primary)',
                            background: '#fff',
                            zIndex: 10
                          }}
                          onMouseDown={e => {
                            e.stopPropagation()
                          }}
                          onPointerDown={e => {
                            e.stopPropagation()
                          }}
                          onClick={e => {
                            e.stopPropagation()
                            e.preventDefault()
                            openDetail(t.id, true)
                          }}
                          title="Sửa thông tin phiếu"
                        >
                          <Edit2 size={11} style={{ pointerEvents: 'none' }} /> Sửa
                        </button>
                      </div>
                    </div>
                  ))}

                  {colTickets.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                      Kéo thả thẻ vào đây
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Khách hàng</th>
                  <th>Thiết bị / IMEI</th>
                  <th>Tình trạng lỗi</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Tổng phí</th>
                  <th className="text-right">Đặt cọc</th>
                  <th className="text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => {
                  const normalized = normalizeStatus(t.status)
                  const colConfig = STATUS_COLUMNS.find(c => c.key === normalized)
                  return (
                    <tr key={t.id}>
                      <td><strong style={{ color: 'var(--primary)' }}>{t.ticket_number}</strong></td>
                      <td>
                        <div><b>{t.customer_name}</b></div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.customer_phone}</div>
                      </td>
                      <td>
                        <div><b>{t.device_info}</b></div>
                        {t.imei && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>IMEI: {t.imei}</div>}
                      </td>
                      <td style={{ maxWidth: 200, fontSize: 12 }}>{t.issue_description || '—'}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: colConfig?.bg || '#f1f5f9',
                            color: colConfig?.color || '#334155',
                            fontWeight: 700
                          }}
                        >
                          {colConfig?.label || t.status}
                        </span>
                      </td>
                      <td className="text-right font-bold" style={{ color: 'var(--primary)' }}>
                        {formatCurrency(t.total_fee)}
                      </td>
                      <td className="text-right" style={{ color: 'var(--success)' }}>
                        {formatCurrency(t.deposit_paid)}
                      </td>
                      <td className="text-center">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openDetail(t.id)} title="Xem chi tiết">
                          <Eye size={14} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openDetail(t.id, true)} title="Sửa thông tin phiếu" style={{ color: 'var(--primary)' }}>
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      <Modal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Tiếp nhận máy sửa chữa mới"
        size="md"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={handleCreateTicket} disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo phiếu tiếp nhận'}
            </button>
          </>
        }
      >
        <div style={{ position: 'relative' }}>
          <div className="form-row col-2">
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Tên khách hàng <span className="required">*</span></label>
              <input
                className="form-input"
                value={createForm.customer_name}
                onChange={e => handleCustomerNameChange(e.target.value)}
                placeholder="Gõ tên khách hàng để tìm..."
                autoFocus
              />
              {customerSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 20,
                  marginTop: 2
                }}>
                  {customerSuggestions.map(c => (
                    <div
                      key={c.id}
                      onClick={() => selectCustomer(c)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        fontSize: 12
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <b>{c.name}</b> {c.phone && `(${c.phone})`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Số điện thoại liên hệ</label>
              <input
                className="form-input"
                value={createForm.customer_phone}
                onChange={e => setCreateForm({ ...createForm, customer_phone: e.target.value })}
                placeholder="090..."
              />
            </div>
          </div>
        </div>

        <div className="form-row col-2">
          <div className="form-group">
            <label className="form-label">Tên thiết bị / Model <span className="required">*</span></label>
            <input
              className="form-input"
              value={createForm.device_info}
              onChange={e => setCreateForm({ ...createForm, device_info: e.target.value })}
              placeholder="VD: iPhone 13 Pro Max 128GB"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mã IMEI máy (nếu có)</label>
            <input
              className="form-input"
              value={createForm.imei}
              onChange={e => setCreateForm({ ...createForm, imei: e.target.value })}
              placeholder="15 số IMEI..."
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Mô tả tình trạng lỗi / Yêu cầu của khách</label>
          <textarea
            className="form-input"
            rows={2}
            value={createForm.issue_description}
            onChange={e => setCreateForm({ ...createForm, issue_description: e.target.value })}
            placeholder="VD: Rơi vỡ màn hình, sọc hiển thị, cảm ứng liệt..."
          />
        </div>

        <div className="form-row col-3">
          <div className="form-group">
            <label className="form-label">Chi phí sửa dự kiến (đ)</label>
            <input
              type="number"
              className="form-input"
              value={createForm.total_fee}
              onChange={e => setCreateForm({ ...createForm, total_fee: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Khách đặt cọc (đ)</label>
            <input
              type="number"
              className="form-input"
              value={createForm.deposit_paid}
              onChange={e => setCreateForm({ ...createForm, deposit_paid: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Hẹn ngày giờ trả máy</label>
            <input
              type="datetime-local"
              className="form-input"
              value={createForm.promised_at}
              onChange={e => setCreateForm({ ...createForm, promised_at: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Ghi chú tiếp nhận (Phụ kiện kèm theo, mật khẩu máy...)</label>
          <input
            className="form-input"
            value={createForm.note}
            onChange={e => setCreateForm({ ...createForm, note: e.target.value })}
            placeholder="VD: Kèm ốp lưng, pass màn hình: 123456"
          />
        </div>
      </Modal>

      {/* Detail & Progress Modal */}
      <Modal
        show={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={isEditingInfo ? `Chỉnh sửa thông tin phiếu: ${selectedTicket?.ticket_number}` : `Phiếu Sửa Chữa: ${selectedTicket?.ticket_number}`}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline"
              style={{ marginRight: 'auto' }}
              onClick={() => handlePrintTicket(selectedTicket?.id)}
            >
              <Printer size={15} />
              <span>In phiếu tiếp nhận</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ color: 'var(--danger)', marginRight: 8 }}
              onClick={() => handleDeleteTicket(selectedTicket?.id)}
            >
              <Trash2 size={15} />
              <span>Hủy phiếu</span>
            </button>
            {isEditingInfo ? (
              <>
                <button type="button" className="btn btn-outline" onClick={() => setIsEditingInfo(false)}>
                  Hủy sửa
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSaveTicketInfo}>
                  Lưu thay đổi
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setShowDetailModal(false)}>
                Đóng
              </button>
            )}
          </>
        }
      >
        {selectedTicket && (
          <div>
            {/* Status Progress Bar */}
            <div style={{ marginBottom: 16, background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>Tiến độ sửa chữa:</label>
                <span className="badge badge-primary">
                  Hiện tại: {STATUS_COLUMNS.find(c => c.key === normalizeStatus(selectedTicket.status))?.label}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STATUS_COLUMNS.map(col => (
                  <button
                    key={col.key}
                    className={`btn btn-sm ${normalizeStatus(selectedTicket.status) === col.key ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleUpdateStatus(col.key)}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Info Grid or Edit Form */}
            {!isEditingInfo ? (
              <div style={{ position: 'relative', background: '#fafbfc', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 16 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ position: 'absolute', top: 10, right: 10 }}
                  onClick={() => setIsEditingInfo(true)}
                >
                  <Edit2 size={13} style={{ marginRight: 4 }} />
                  <span>Sửa thông tin</span>
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, paddingRight: 110 }}>
                  <div><b>Khách hàng:</b> {selectedTicket.customer_name} {selectedTicket.customer_phone && `(${selectedTicket.customer_phone})`}</div>
                  <div><b>Thiết bị:</b> {selectedTicket.device_info}</div>
                  <div><b>Mã IMEI:</b> {selectedTicket.imei || '—'}</div>
                  <div><b>Thời gian nhận:</b> {formatDateTime(selectedTicket.created_at)}</div>
                  {selectedTicket.promised_at && (
                    <div><b>Hẹn trả:</b> {formatDateTime(selectedTicket.promised_at)}</div>
                  )}
                  <div><b>Tổng chi phí:</b> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatCurrency(selectedTicket.total_fee)}</span></div>
                  <div><b>Đã cọc:</b> <span style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(selectedTicket.deposit_paid)}</span></div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <b>Tình trạng lỗi:</b>{' '}
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{selectedTicket.issue_description || 'Không mô tả'}</span>
                  </div>
                  {selectedTicket.note && (
                    <div style={{ gridColumn: '1/-1', background: '#f1f5f9', padding: '8px 10px', borderRadius: 4, borderLeft: '3px solid var(--primary)' }}>
                      <b>Nội dung xử lý / Ghi chú:</b> {selectedTicket.note}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ background: '#fafbfc', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 16 }}>
                <div className="form-row col-2">
                  <div className="form-group">
                    <label className="form-label">Tên khách hàng</label>
                    <input
                      className="form-input"
                      value={editForm.customer_name}
                      onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      className="form-input"
                      value={editForm.customer_phone}
                      onChange={e => setEditForm({ ...editForm, customer_phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row col-2">
                  <div className="form-group">
                    <label className="form-label">Thiết bị</label>
                    <input
                      className="form-input"
                      value={editForm.device_info}
                      onChange={e => setEditForm({ ...editForm, device_info: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mã IMEI</label>
                    <input
                      className="form-input"
                      value={editForm.imei}
                      onChange={e => setEditForm({ ...editForm, imei: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tình trạng lỗi ban đầu</label>
                  <input
                    className="form-input"
                    value={editForm.issue_description}
                    onChange={e => setEditForm({ ...editForm, issue_description: e.target.value })}
                  />
                </div>
                <div className="form-row col-3">
                  <div className="form-group">
                    <label className="form-label">Tổng chi phí sửa (đ)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editForm.total_fee}
                      onChange={e => setEditForm({ ...editForm, total_fee: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tiền đặt cọc (đ)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editForm.deposit_paid}
                      onChange={e => setEditForm({ ...editForm, deposit_paid: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hẹn ngày trả</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={editForm.promised_at}
                      onChange={e => setEditForm({ ...editForm, promised_at: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Nội dung xử lý / Đã sửa những gì / Ghi chú</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={editForm.note}
                    onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                    placeholder="VD: Đã thay màn hình zin, sửa IC nguồn, vệ sinh loa, tặng dán cường lực..."
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setIsEditingInfo(false)}>Hủy</button>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveTicketInfo}>Lưu thay đổi</button>
                </div>
              </div>
            )}

            {/* Repair Lines Table (Services, Labor, Parts) */}
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              Chi phí sửa chữa & Thay thế linh kiện (Tự nhập)
            </h4>

            <table className="data-table" style={{ marginBottom: 12 }}>
              <thead>
                <tr>
                  <th>Hạng mục / Linh kiện</th>
                  <th>Phân loại</th>
                  <th className="text-center">Số lượng</th>
                  <th className="text-right">Đơn giá</th>
                  <th className="text-right">Thành tiền</th>
                  <th className="text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {selectedTicket.lines?.map((line: any) =>
                  editingLineId === line.id ? (
                    <tr key={line.id} style={{ background: '#f0f7ff' }}>
                      <td>
                        <input
                          className="form-input"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          value={editLineData.name}
                          onChange={e => setEditLineData({ ...editLineData, name: e.target.value })}
                          placeholder="Tên hạng mục..."
                        />
                      </td>
                      <td>
                        <select
                          className="form-select"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          value={editLineData.line_type}
                          onChange={e => setEditLineData({ ...editLineData, line_type: e.target.value as any })}
                        >
                          <option value="service">Dịch vụ</option>
                          <option value="part">Linh kiện</option>
                          <option value="labor">Công thợ</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input text-center"
                          style={{ width: 60, padding: '4px 8px', fontSize: 12 }}
                          value={editLineData.qty}
                          onChange={e => setEditLineData({ ...editLineData, qty: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input text-right"
                          style={{ width: 110, padding: '4px 8px', fontSize: 12 }}
                          value={editLineData.price}
                          onChange={e => setEditLineData({ ...editLineData, price: e.target.value })}
                        />
                      </td>
                      <td className="text-right font-bold">
                        {formatCurrency((parseFloat(editLineData.price) || 0) * (parseInt(editLineData.qty) || 1))}
                      </td>
                      <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: 'var(--success)', marginRight: 4 }}
                          onClick={() => handleSaveEditLine(line.id)}
                          title="Lưu"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: 'var(--text-muted)' }}
                          onClick={() => setEditingLineId(null)}
                          title="Hủy"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={line.id}>
                      <td><strong>{line.name}</strong></td>
                      <td>
                        <span className="badge badge-gray">
                          {line.line_type === 'labor' ? 'Công thợ' : line.line_type === 'part' ? 'Linh kiện' : 'Dịch vụ'}
                        </span>
                      </td>
                      <td className="text-center">{line.qty}</td>
                      <td className="text-right">{formatCurrency(line.price)}</td>
                      <td className="text-right font-bold">{formatCurrency(line.line_total)}</td>
                      <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: 'var(--primary)', marginRight: 4 }}
                          onClick={() => handleStartEditLine(line)}
                          title="Sửa hạng mục"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeleteLine(line.id)}
                          title="Xóa"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                )}
                {(!selectedTicket.lines || selectedTicket.lines.length === 0) && (
                  <tr>
                    <td colSpan={6} className="empty-state" style={{ padding: 12 }}>
                      Chưa có hạng mục chi phí nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Add Line Form */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#f8fafc', padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <select
                className="form-select"
                style={{ width: 110 }}
                value={newLineType}
                onChange={(e: any) => setNewLineType(e.target.value)}
              >
                <option value="service">Dịch vụ</option>
                <option value="part">Linh kiện</option>
                <option value="labor">Công thợ</option>
              </select>

              <input
                className="form-input"
                style={{ flex: 1 }}
                placeholder="Tên công / linh kiện thay thế..."
                value={newLineName}
                onChange={e => setNewLineName(e.target.value)}
              />

              <input
                type="number"
                className="form-input"
                style={{ width: 120 }}
                placeholder="Đơn giá (đ)"
                value={newLinePrice}
                onChange={e => setNewLinePrice(e.target.value)}
              />

              <input
                type="number"
                className="form-input"
                style={{ width: 60 }}
                placeholder="SL"
                value={newLineQty}
                onChange={e => setNewLineQty(e.target.value)}
              />

              <button className="btn btn-primary" onClick={handleAddLine}>
                + Thêm
              </button>
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 20, marginTop: 16, fontSize: 14 }}>
              <div>Tổng chi phí: <strong style={{ color: 'var(--primary)', fontSize: 16 }}>{formatCurrency(selectedTicket.total_fee)}</strong></div>
              <div>Đã đặt cọc: <strong style={{ color: 'var(--success)' }}>{formatCurrency(selectedTicket.deposit_paid)}</strong></div>
              <div>Còn lại phải thu: <strong style={{ color: 'var(--danger)', fontSize: 16 }}>{formatCurrency(Math.max(0, selectedTicket.total_fee - selectedTicket.deposit_paid))}</strong></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
