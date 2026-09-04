import { formatCurrency } from '../utils/format'
import React, { useState, useEffect } from 'react'
import { Plus, Boxes, ArrowDownRight, ArrowUpRight, AlertTriangle } from 'lucide-react'
import { Modal } from '../components/Modal'
import { useAuth, useNotify } from '../context/AppContext'
import { formatDateTime } from '../utils/dateTime'

export const Inventory: React.FC = () => {
  const { user } = useAuth()
  const notify = useNotify()

  const [movements, setMovements] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])

  // Add Stock Modal
  const [showAddStock, setShowAddStock] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [mov, low, prods, sups] = await Promise.all([
        window.api.inventory.getMovements({ limit: 100 }),
        window.api.inventory.getLowStock(),
        window.api.products.getAll(),
        window.api.suppliers.getAll()
      ])
      setMovements(Array.isArray(mov) ? mov : [])
      setLowStock(Array.isArray(low) ? low : [])
      setProducts(Array.isArray(prods) ? prods.filter((p: any) => p.is_imei === 0) : [])
      setSuppliers(Array.isArray(sups) ? sups : [])
    } catch (e) {
      console.error(e)
      setMovements([])
      setLowStock([])
      setProducts([])
      setSuppliers([])
    }
  }

  
  async function handleAddStock() {
    if (!selectedProduct || !quantity) {
      notify.warning('Thiếu thông tin', 'Vui lòng chọn sản phẩm và nhập số lượng')
      return
    }
    setLoading(true)
    const res = await window.api.inventory.addStock({
      product_id: parseInt(selectedProduct),
      quantity: parseInt(quantity),
      unit_cost: parseFloat(unitCost) || 0,
      supplier_id: supplierId ? parseInt(supplierId) : null,
      note,
      user_id: user?.id
    })
    setLoading(false)
    if (res.success) {
      notify.success('Nhập kho thành công', `Tồn kho mới: ${res.new_quantity}`)
      setShowAddStock(false)
      setSelectedProduct('')
      setQuantity('')
      setUnitCost('')
      setSupplierId('')
      setNote('')
      loadData()
    } else {
      notify.error('Lỗi', res.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Kho hàng & Xuất nhập tồn</h2>
          <p>Theo dõi luân chuyển tồn kho</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={() => setShowAddStock(true)}>
            <Plus size={15} />
            <span>Nhập hàng vào kho</span>
          </button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--warning)' }}>
          <div className="card-header" style={{ color: 'var(--warning)' }}>
            <AlertTriangle size={18} />
            <span className="card-title" style={{ color: 'inherit' }}>
              Cảnh báo: Có {lowStock.length} sản phẩm dưới mức tồn tối thiểu
            </span>
          </div>
          <div style={{ padding: '8px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {lowStock.map(p => (
              <span key={p.id} className="badge badge-warning" style={{ fontSize: 12 }}>
                {p.name}: còn <b>{p.stock_quantity}</b> {p.unit} (Tối thiểu {p.min_stock})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Lịch sử xuất nhập kho gần nhất</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Sản phẩm</th>
                <th className="text-center">Loại giao dịch</th>
                <th className="text-center">Số lượng</th>
                <th className="text-center">Trước / Sau</th>
                <th>Nhà cung cấp / Người thực hiện</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id}>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {formatDateTime(m.created_at)}
                  </td>
                  <td><strong>{m.product_name || m.product_name_ref}</strong></td>
                  <td className="text-center">
                    {m.type === 'in' ? (
                      <span className="badge badge-success">
                        <ArrowDownRight size={12} style={{ marginRight: 2 }} /> Nhập kho
                      </span>
                    ) : (
                      <span className="badge badge-danger">
                        <ArrowUpRight size={12} style={{ marginRight: 2 }} /> Xuất bán
                      </span>
                    )}
                  </td>
                  <td className="text-center font-bold">
                    {m.type === 'in' ? `+${m.quantity}` : `-${Math.abs(m.quantity)}`}
                  </td>
                  <td className="text-center" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {m.quantity_before} ➔ {m.quantity_after}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {m.supplier_name ? `NCC: ${m.supplier_name}` : m.user_name ? `NV: ${m.user_name}` : '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.note || '—'}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    <Boxes size={40} />
                    <p>Chưa có lịch sử xuất nhập kho</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        show={showAddStock}
        onClose={() => setShowAddStock(false)}
        title="Nhập hàng phụ kiện vào kho"
        size="md"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowAddStock(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={handleAddStock} disabled={loading}>
              {loading ? 'Đang lưu...' : 'Xác nhận nhập kho'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Chọn sản phẩm phụ kiện *</label>
          <select
            className="form-select"
            value={selectedProduct}
            onChange={e => setSelectedProduct(e.target.value)}
          >
            <option value="">-- Chọn sản phẩm --</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} (Tồn hiện tại: {p.stock_quantity} {p.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="form-row col-2">
          <div className="form-group">
            <label className="form-label">Số lượng nhập *</label>
            <input
              type="number"
              className="form-input"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Đơn giá nhập (đ/cái)</label>
            <input
              type="number"
              className="form-input"
              value={unitCost}
              onChange={e => setUnitCost(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Nhà cung cấp</label>
          <select
            className="form-select"
            value={supplierId}
            onChange={e => setSupplierId(e.target.value)}
          >
            <option value="">-- Không chọn --</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Ghi chú</label>
          <input
            className="form-input"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Lý do nhập hoặc số hóa đơn NCC"
          />
        </div>
      </Modal>
    </div>
  )
}
