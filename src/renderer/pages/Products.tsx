import { Pagination } from '../components/Pagination'
import { formatCurrency } from '../utils/format'
import React, { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Pen,
  Trash2,
  Smartphone,
  Barcode as BarcodeIcon,
  Package,
  Boxes,
  Download
} from 'lucide-react'
import { Modal } from '../components/Modal'
import { BarcodeModal } from '../components/BarcodeModal'
import { useAuth, useNotify } from '../context/AppContext'
import { exportToExcel } from '../utils/exportExcel'

const UNITS = ['cái', 'máy', 'hộp', 'bộ', 'cặp', 'sợi', 'miếng']

export const Products: React.FC = () => {
  const { user } = useAuth()
  const notify = useNotify()

  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  // Product Form Modal
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<any>({
    category_id: '',
    name: '',
    sku: '',
    barcode: '',
    unit: 'cái',
    cost_price: '',
    sell_price: '',
    min_stock: 5,
    description: '',
    stock_quantity: 0,
    is_imei: 0
  })
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [total, setTotal] = useState(0)

  // IMEI Modal
  const [showImeiModal, setShowImeiModal] = useState(false)
  const [imeiProduct, setImeiProduct] = useState<any>(null)
  const [imeiList, setImeiList] = useState<any[]>([])
  const [newImeis, setNewImeis] = useState('')
  const [imeiWarranty, setImeiWarranty] = useState<number>(12)
  const [imeiCost, setImeiCost] = useState<string>('')
  const [imeiCapacity, setImeiCapacity] = useState('')
  const [imeiColor, setImeiColor] = useState('')
  const [imeiCondition, setImeiCondition] = useState('')
  const [imeiPrice, setImeiPrice] = useState('')

  // Barcode Modal
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [barcodeProduct, setBarcodeProduct] = useState<any>(null)

  // Category Modal
  const [showCatModal, setShowCatModal] = useState(false)
  const [catForm, setCatForm] = useState({ name: '', description: '' })
  const [editCatId, setEditCatId] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadProducts()
  }, [page, pageSize, search, filterCategory])

  useEffect(() => {
    setPage(1)
  }, [search, filterCategory])

  async function loadData() {
    try {
      const [cats, defMin] = await Promise.all([
        window.api.categories.getAll(),
        window.api.settings.get('inventory.default_min_stock').catch(() => '5')
      ])
      setCategories(Array.isArray(cats) ? cats : [])
      if (defMin && !isNaN(Number(defMin))) {
        setDefaultMinStock(parseInt(defMin, 10))
      }
      await loadProducts()
    } catch (e) {
      console.error(e)
      setCategories([])
    }
  }

  async function loadProducts() {
    try {
      const prods: any = await window.api.products.getAll({
        page, pageSize,
        search: search || undefined,
        category_id: filterCategory || undefined
      })
      if (prods && typeof prods === 'object' && 'data' in prods && Array.isArray(prods.data)) {
        setProducts(prods.data)
        setTotal(prods.total ?? prods.data.length)
      } else if (Array.isArray(prods)) {
        setProducts(prods)
        setTotal(prods.length)
      } else {
        setProducts([])
        setTotal(0)
      }
    } catch (e) {
      console.error(e)
      setProducts([])
      setTotal(0)
    }
  }

  const [defaultMinStock, setDefaultMinStock] = useState<number>(5)

  
  function openCreate() {
    setForm({
      category_id: '',
      name: '',
      sku: '',
      barcode: '',
      unit: 'cái',
      cost_price: '',
      sell_price: '',
      min_stock: defaultMinStock,
      description: '',
      stock_quantity: 0,
      is_imei: 0
    })
    setEditId(null)
    setShowModal(true)
  }

  function openEdit(p: any) {
    setForm({
      category_id: p.category_id || '',
      name: p.name,
      sku: p.sku || '',
      barcode: p.barcode || '',
      unit: p.unit || 'cái',
      cost_price: p.cost_price,
      sell_price: p.sell_price,
      min_stock: p.min_stock !== undefined && p.min_stock !== null ? p.min_stock : defaultMinStock,
      description: p.description || '',
      stock_quantity: p.stock_quantity || 0,
      is_imei: p.is_imei || 0
    })
    setEditId(p.id)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      notify.warning('Thiếu thông tin', 'Vui lòng nhập tên sản phẩm')
      return
    }
    if (form.is_imei !== 1 && (!form.sell_price || parseFloat(form.sell_price) <= 0)) {
      notify.warning('Thiếu thông tin', 'Vui lòng nhập giá bán cho sản phẩm')
      return
    }
    setLoading(true)
    const minStockVal = form.min_stock !== '' && form.min_stock !== null && !isNaN(Number(form.min_stock))
      ? Math.max(0, parseInt(String(form.min_stock), 10))
      : defaultMinStock

    const data = {
      ...form,
      category_id: form.category_id || null,
      cost_price: form.is_imei === 1 ? 0 : (parseFloat(form.cost_price) || 0),
      sell_price: form.is_imei === 1 ? 0 : (parseFloat(form.sell_price) || 0),
      min_stock: minStockVal,
      stock_quantity: form.is_imei === 1 ? 0 : (parseInt(form.stock_quantity) || 0),
      is_imei: form.is_imei || 0
    }
    const result = editId
      ? await window.api.products.update({ ...data, id: editId })
      : await window.api.products.create(data)
    setLoading(false)
    if (result.success) {
      notify.success(editId ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm')
      setShowModal(false)
      loadProducts()
    } else {
      notify.error('Lỗi', result.message)
    }
  }

  async function handleDelete(p: any) {
    if (!window.confirm(`Xóa sản phẩm "${p.name}"?`)) return
    const result = await window.api.products.delete(p.id)
    if (result.success) {
      notify.success('Đã xóa sản phẩm')
      loadProducts()
    } else {
      notify.error('Lỗi', result.message)
    }
  }

  // IMEI Management
  async function openImei(p: any) {
    setImeiProduct(p)
    setNewImeis('')
    setImeiWarranty(12)
    setImeiCost(p.cost_price || '')
    setImeiPrice(p.sell_price || '')
    setImeiCapacity('')
    setImeiColor('')
    setImeiCondition('')
    setShowImeiModal(true)
    loadProductImeis(p.id)
  }

  async function loadProductImeis(productId: number) {
    const list = await window.api.products.getImeis(productId)
    setImeiList(list)
  }

  async function handleAddImeis() {
    if (!imeiProduct) return
    const cleaned = newImeis.split(/[\n,]/).map(i => i.trim()).filter(i => i.length > 0)
    if (cleaned.length === 0) {
      notify.warning('Trống', 'Vui lòng nhập ít nhất 1 mã IMEI')
      return
    }
    setLoading(true)
    const result = await window.api.products.addImeis({
      productId: imeiProduct.id,
      imeis: cleaned,
      warrantyMonths: parseInt(String(imeiWarranty)) || 12,
      userId: user?.id,
      costPrice: parseFloat(imeiCost) || 0,
      price: parseFloat(imeiPrice) || 0,
      capacity: imeiCapacity.trim(),
      color: imeiColor.trim(),
      condition: imeiCondition.trim()
    })
    setLoading(false)
    if (result.success) {
      notify.success('Nhập IMEI thành công!', `Đã thêm ${result.count} mã IMEI`)
      setNewImeis('')
      loadProductImeis(imeiProduct.id)
      loadProducts()
    } else {
      notify.error('Lỗi nhập IMEI', result.message)
    }
  }

  async function handleDeleteImei(imeiId: number) {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mã IMEI khả dụng này khỏi kho?')) return
    const result = await window.api.products.deleteImei(imeiId)
    if (result.success) {
      notify.success('Đã xóa mã IMEI')
      if (imeiProduct) loadProductImeis(imeiProduct.id)
      loadProducts()
    } else {
      notify.error('Lỗi', result.message)
    }
  }

  // Barcode
  function openBarcode(p: any) {
    setBarcodeProduct(p)
    setShowBarcodeModal(true)
  }

  // Categories
  async function saveCat() {
    if (!catForm.name.trim()) return
    const result = editCatId
      ? await window.api.categories.update({ ...catForm, id: editCatId })
      : await window.api.categories.create(catForm)
    if (result.success) {
      notify.success('Đã lưu danh mục')
      setShowCatModal(false)
      const cats = await window.api.categories.getAll()
      setCategories(cats)
    } else {
      notify.error('Lỗi', result.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Sản phẩm & Quản lý IMEI</h2>
          <p>{total} sản phẩm đang hoạt động</p>
          <button
            className="btn btn-outline"
            onClick={() => {
              const exportData = products.map(p => ({
                'Tên sản phẩm': p.name,
                'Danh mục': p.category_name || 'Chưa phân loại',
                'Mã SKU': p.sku || '',
                'Mã Barcode': p.barcode || '',
                'Đơn vị': p.unit || 'cái',
                'Giá vốn': p.cost_price,
                'Giá bán': p.sell_price,
                'Tồn kho': p.stock_quantity,
                'Cảnh báo tồn': p.min_stock,
                'Loại hàng': p.is_imei === 1 ? 'Điện thoại (IMEI)' : 'Phụ kiện'
              }))
              exportToExcel(exportData, 'Danh_Sach_San_Pham')
              notify.success('Đã xuất file Excel sản phẩm')
            }}
          >
            <Download size={15} />
            <span>Xuất Excel</span>
          </button>
          <button
            className="btn btn-outline"
            onClick={() => {
              setCatForm({ name: '', description: '' })
              setEditCatId(null)
              setShowCatModal(true)
            }}
          >
            Quản lý danh mục
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} />
            <span>Thêm sản phẩm mới</span>
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 220 }}>
            <Search size={15} className="search-icon" />
            <input
              placeholder="Tìm theo tên, mã SKU, barcode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="form-select"
            style={{ width: 180 }}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Danh mục</th>
                <th>Loại hàng</th>
                <th>Đơn vị</th>
                <th className="text-right">Giá vốn</th>
                <th className="text-right">Giá bán</th>
                <th className="text-center">Tồn kho</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                    {p.sku && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SKU: {p.sku}</div>}
                  </td>
                  <td>
                    <span className="badge badge-gray">{p.category_name || 'Chưa phân loại'}</span>
                  </td>
                  <td>
                    {p.is_imei === 1 ? (
                      <span className="badge badge-primary">📱 Điện thoại (IMEI)</span>
                    ) : (
                      <span className="badge badge-info">🎧 Phụ kiện / Hàng hóa</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.unit}</td>
                  <td className="text-right" style={{ color: 'var(--text-secondary)' }}>
                    {formatCurrency(p.cost_price)}
                  </td>
                  <td className="text-right">
                    <strong style={{ color: 'var(--primary)' }}>{formatCurrency(p.sell_price)}</strong>
                  </td>
                  <td className="text-center">
                    <span
                      className={`badge ${
                        p.stock_quantity <= 0
                          ? 'badge-danger'
                          : p.stock_quantity <= p.min_stock
                          ? 'badge-warning'
                          : 'badge-success'
                      }`}
                    >
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="text-center">
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {p.is_imei === 1 && (
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: 'var(--primary)' }}
                          onClick={() => openImei(p)}
                          title="Quản lý danh sách IMEI"
                        >
                          <Smartphone size={14} />
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => openBarcode(p)}
                        title="In mã vạch (Barcode)"
                      >
                        <BarcodeIcon size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => openEdit(p)}
                        title="Sửa"
                      >
                        <Pen size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleDelete(p)}
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-state">
                    <Package size={40} />
                    <p>Không có sản phẩm nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(s: any) => { setPageSize(s); setPage(1); }} />
        </div>

      {/* Product Form Modal */}
      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
        size="md"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu sản phẩm'}
            </button>
          </>
        }
      >
        <div className="form-row col-2">
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">
              Tên sản phẩm <span className="required">*</span>
            </label>
            <input
              className="form-input"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nhập tên sản phẩm"
              autoFocus
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <input
              type="checkbox"
              id="is_imei"
              checked={form.is_imei === 1}
              onChange={e => setForm({ ...form, is_imei: e.target.checked ? 1 : 0 })}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="is_imei" style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>
              Sản phẩm này là Điện thoại / Máy móc cần quản lý theo mã IMEI
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Danh mục</label>
            <select
              className="form-select"
              value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="">Chưa phân loại</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Đơn vị tính</label>
            <select
              className="form-select"
              value={form.unit}
              onChange={e => setForm({ ...form, unit: e.target.value })}
            >
              {UNITS.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Mã SKU</label>
            <input
              className="form-input"
              value={form.sku}
              onChange={e => setForm({ ...form, sku: e.target.value })}
              placeholder="Tự động nếu để trống"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mã Barcode</label>
            <input
              className="form-input"
              value={form.barcode}
              onChange={e => setForm({ ...form, barcode: e.target.value })}
              placeholder="Quét hoặc nhập barcode"
            />
          </div>

          {form.is_imei === 1 ? (
            <div style={{ gridColumn: '1 / -1', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: '#1e40af' }}>
              💡 <strong>Sản phẩm quản lý theo IMEI:</strong> Giá vốn và giá bán sẽ được thiết lập chi tiết theo từng máy (dung lượng, màu sắc, tình trạng) trong mục <strong>Quản lý IMEI</strong>.
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Giá vốn (đ)</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.cost_price}
                  onChange={e => setForm({ ...form, cost_price: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Giá bán (đ) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={form.sell_price}
                  onChange={e => setForm({ ...form, sell_price: e.target.value })}
                  placeholder="0"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Tồn kho tối thiểu (Cảnh báo)</label>
            <input
              type="number"
              className="form-input"
              value={form.min_stock}
              onChange={e => setForm({ ...form, min_stock: e.target.value })}
            />
          </div>

          {form.is_imei === 0 && (
            <div className="form-group">
              <label className="form-label">Tồn kho ban đầu</label>
              <input
                type="number"
                className="form-input"
                value={form.stock_quantity}
                onChange={e => setForm({ ...form, stock_quantity: e.target.value })}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* IMEI Modal */}
      <Modal
        show={showImeiModal}
        onClose={() => setShowImeiModal(false)}
        title={`Quản lý IMEI - ${imeiProduct?.name}`}
        size="lg"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
              Nhập mã IMEI theo lô (cùng cấu hình)
            </h4>

            <div className="form-row col-2" style={{ gap: 8 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Dung lượng</label>
                <input className="form-input form-input-sm" value={imeiCapacity} onChange={e => setImeiCapacity(e.target.value)} placeholder="VD: 256GB" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Màu sắc</label>
                <input className="form-input form-input-sm" value={imeiColor} onChange={e => setImeiColor(e.target.value)} placeholder="VD: Titan Đen" />
              </div>
            </div>

            <div className="form-row col-2" style={{ gap: 8 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Tình trạng</label>
                <input className="form-input form-input-sm" value={imeiCondition} onChange={e => setImeiCondition(e.target.value)} placeholder="VD: 99%, Likenew" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Bảo hành (tháng)</label>
                <input type="number" className="form-input form-input-sm" value={imeiWarranty} onChange={e => setImeiWarranty(parseInt(e.target.value) || 12)} />
              </div>
            </div>

            <div className="form-row col-2" style={{ gap: 8 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Giá bán riêng (đ)</label>
                <input type="number" className="form-input form-input-sm" value={imeiPrice} onChange={e => setImeiPrice(e.target.value)} placeholder="Mặc định" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Giá nhập (đ)</label>
                <input type="number" className="form-input form-input-sm" value={imeiCost} onChange={e => setImeiCost(e.target.value)} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>
                Danh sách IMEI (Mỗi mã 1 dòng) <span className="required">*</span>
              </label>
              <textarea
                className="form-textarea"
                style={{ fontSize: 12, padding: 8 }}
                rows={5}
                placeholder="358239019283748&#10;358239019283749"
                value={newImeis}
                onChange={e => setNewImeis(e.target.value)}
              />
            </div>

            <button className="btn btn-primary w-full" onClick={handleAddImeis} disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Đang thêm...' : '+ Nhập IMEI vào kho'}
            </button>
          </div>

          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
              Danh sách IMEI hiện tại ({imeiList.length})
            </h4>
            <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>IMEI</th>
                    <th>Cấu hình</th>
                    <th>Giá bán</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {imeiList.map(item => {
                    const specs = [item.capacity, item.color, item.condition].filter(Boolean).join(' - ')
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 700, fontSize: 13 }}>{item.imei}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{specs || '—'}</td>
                        <td style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
                          {item.price ? formatCurrency(item.price) : 'Mặc định'}
                        </td>
                        <td>
                          <span className={`badge ${item.status === 'available' ? 'badge-success' : 'badge-gray'}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                            {item.status === 'available' ? 'Còn hàng' : 'Đã bán'}
                          </span>
                        </td>
                        <td className="text-right">
                          {item.status === 'available' && (
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDeleteImei(item.id)}
                              title="Xóa IMEI này"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {imeiList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-state" style={{ padding: 20 }}>
                        Chưa có IMEI nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* Barcode Modal (Using fixed 2-column print component) */}
      <BarcodeModal
        show={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        product={barcodeProduct}
      />

      {/* Category Modal */}
      <Modal
        show={showCatModal}
        onClose={() => setShowCatModal(false)}
        title="Quản lý danh mục"
        size="sm"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowCatModal(false)}>Đóng</button>
            <button className="btn btn-primary" onClick={saveCat}>Lưu danh mục</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Tên danh mục *</label>
          <input
            className="form-input"
            value={catForm.name}
            onChange={e => setCatForm({ ...catForm, name: e.target.value })}
            placeholder="VD: Điện thoại, Cáp sạc..."
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Mô tả</label>
          <input
            className="form-input"
            value={catForm.description}
            onChange={e => setCatForm({ ...catForm, description: e.target.value })}
          />
        </div>
        <div className="divider" />
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Danh mục hiện có:</div>
        <div style={{ maxHeight: 180, overflowY: 'auto' }}>
          {categories.map(c => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '1px solid var(--border)'
              }}
            >
              <span>{c.name}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => {
                    setCatForm({ name: c.name, description: c.description || '' })
                    setEditCatId(c.id)
                  }}
                >
                  <Pen size={12} />
                </button>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  style={{ color: 'var(--danger)' }}
                  onClick={async () => {
                    const r = await window.api.categories.delete(c.id)
                    if (r.success) {
                      notify.success('Đã xóa')
                      const cats = await window.api.categories.getAll()
                      setCategories(cats)
                    } else notify.error('Lỗi', r.message)
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
