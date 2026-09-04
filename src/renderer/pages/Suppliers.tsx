import { formatCurrency } from '../utils/format'
import React, { useState, useEffect } from 'react'
import { Plus, Pen, Trash2, Truck } from 'lucide-react'
import { Modal } from '../components/Modal'
import { useNotify } from '../context/AppContext'

export const Suppliers: React.FC = () => {
  const notify = useNotify()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    tax_code: '',
    contact_person: '',
    note: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSuppliers()
  }, [])

  async function loadSuppliers() {
    try {
      const data = await window.api.suppliers.getAll()
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setSuppliers([])
    }
  }

  
  function openCreate() {
    setForm({ name: '', phone: '', email: '', address: '', tax_code: '', contact_person: '', note: '' })
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(s: any) {
    setForm({
      name: s.name,
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      tax_code: s.tax_code || '',
      contact_person: s.contact_person || '',
      note: s.note || ''
    })
    setEditId(s.id)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      notify.warning('Thiếu tên', 'Vui lòng nhập tên nhà cung cấp')
      return
    }
    setLoading(true)
    const result = editId
      ? await window.api.suppliers.update({ ...form, id: editId })
      : await window.api.suppliers.create(form)
    setLoading(false)
    if (result.success) {
      notify.success(editId ? 'Đã cập nhật nhà cung cấp' : 'Đã thêm nhà cung cấp')
      setShowModal(false)
      loadSuppliers()
    } else {
      notify.error('Lỗi', result.message)
    }
  }

  async function handleDelete(s: any) {
    if (!window.confirm(`Xóa nhà cung cấp "${s.name}"?`)) return
    const result = await window.api.suppliers.delete(s.id)
    if (result.success) {
      notify.success('Đã xóa nhà cung cấp')
      loadSuppliers()
    } else {
      notify.error('Lỗi', result.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Nhà cung cấp</h2>
          <p>{suppliers.length} đối tác cung ứng</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} />
            <span>Thêm nhà cung cấp</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên nhà cung cấp</th>
                <th>Người liên hệ</th>
                <th>Số điện thoại</th>
                <th>Địa chỉ</th>
                <th className="text-right">Công nợ</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.contact_person || '—'}</td>
                  <td>{s.phone || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.address || '—'}</td>
                  <td className="text-right">
                    {s.debt > 0 ? (
                      <span className="badge badge-warning">{formatCurrency(s.debt)}</span>
                    ) : '0đ'}
                  </td>
                  <td className="text-center">
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(s)}>
                        <Pen size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(s)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    <Truck size={40} />
                    <p>Chưa có nhà cung cấp nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
        size="md"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Tên nhà cung cấp *</label>
          <input
            className="form-input"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
        </div>
        <div className="form-row col-2">
          <div className="form-group">
            <label className="form-label">Người liên hệ</label>
            <input
              className="form-input"
              value={form.contact_person}
              onChange={e => setForm({ ...form, contact_person: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Số điện thoại</label>
            <input
              className="form-input"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
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
      </Modal>
    </div>
  )
}
