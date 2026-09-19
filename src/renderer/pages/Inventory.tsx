import React, { useState, useEffect } from 'react'
import { Plus, Boxes, ArrowDownRight, ArrowUpRight, AlertTriangle, Smartphone, Package, Search, X, Check, RefreshCw } from 'lucide-react'
import { Modal } from '../components/Modal'
import { useAuth, useNotify } from '../context/AppContext'
import { formatCurrency } from '../utils/format'
import { formatDateTime } from '../utils/dateTime'

export const Inventory: React.FC = () => {
  const { user } = useAuth()
  const notify = useNotify()

  const [movements, setMovements] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])

  // Modal State
  const [showAddStock, setShowAddStock] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  // Product Search & Scroll Picker State
  const [prodSearch, setProdSearch] = useState('')
  const [prodFilterType, setProdFilterType] = useState<'all' | 'phone' | 'accessory'>('all')
  const [isSelectingProd, setIsSelectingProd] = useState(false)

  // IMEI specific state (Option 1)
  const [imeiText, setImeiText] = useState('')
  const [capacity, setCapacity] = useState('128GB')
  const [color, setColor] = useState('Titan Tự Nhiên')
  const [condition, setCondition] = useState('Like New 99%')
  const [warrantyMonths, setWarrantyMonths] = useState('12')

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
      setProducts(Array.isArray(prods) ? prods.filter((p: any) => p.active === 1) : [])
      setSuppliers(Array.isArray(sups) ? sups : [])
    } catch (e) {
      console.error(e)
      setMovements([])
      setLowStock([])
      setProducts([])
      setSuppliers([])
    }
  }

  
  const curProduct = products.find(p => String(p.id) === String(selectedProduct))
  const isImeiProduct = curProduct?.is_imei === 1

  const parsedImeis = imeiText
    .split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(Boolean)

  function handleSelectProduct(idStr: string) {
    setSelectedProduct(idStr)
    const prod = products.find(p => String(p.id) === String(idStr))
    if (prod) {
      setUnitCost(prod.cost_price ? String(prod.cost_price) : '')
      setSellPrice(prod.sell_price ? String(prod.sell_price) : '')
    } else {
      setUnitCost('')
      setSellPrice('')
    }
  }

  function resetForm() {
    setSelectedProduct('')
    setQuantity('')
    setUnitCost('')
    setSellPrice('')
    setSupplierId('')
    setNote('')
    setImeiText('')
    setCapacity('128GB')
    setColor('Titan Tự Nhiên')
    setCondition('Like New 99%')
    setWarrantyMonths('12')
    setProdSearch('')
    setProdFilterType('all')
    setIsSelectingProd(true)
  }

  async function handleAddStock() {
    if (!selectedProduct) {
      notify.warning('Thiếu thông tin', 'Vui lòng chọn sản phẩm cần nhập kho')
      return
    }

    if (isImeiProduct) {
      if (parsedImeis.length === 0) {
        notify.warning('Thiếu mã IMEI', 'Vui lòng nhập hoặc quét ít nhất 1 mã IMEI')
        return
      }

      setLoading(true)
      const res = await window.api.inventory.addStock({
        product_id: parseInt(selectedProduct),
        is_imei: 1,
        imeis: parsedImeis,
        capacity,
        color,
        condition,
        unit_cost: parseFloat(unitCost) || 0,
        price: parseFloat(sellPrice) || 0,
        warranty_months: parseInt(warrantyMonths) || 12,
        supplier_id: supplierId ? parseInt(supplierId) : null,
        note,
        user_id: user?.id
      })
      setLoading(false)

      if (res.success) {
        notify.success('Nhập kho thành công', `Đã nhập +${parsedImeis.length} máy. Tồn kho mới: ${res.new_quantity}`)
        setShowAddStock(false)
        resetForm()
        loadData()
      } else {
        notify.error('Lỗi nhập kho', res.message)
      }
    } else {
      const qty = parseInt(quantity)
      if (!quantity || isNaN(qty) || qty <= 0) {
        notify.warning('Thiếu số lượng', 'Vui lòng nhập số lượng nhập hợp lệ')
        return
      }

      setLoading(true)
      const res = await window.api.inventory.addStock({
        product_id: parseInt(selectedProduct),
        is_imei: 0,
        quantity: qty,
        unit_cost: parseFloat(unitCost) || 0,
        supplier_id: supplierId ? parseInt(supplierId) : null,
        note,
        user_id: user?.id
      })
      setLoading(false)

      if (res.success) {
        notify.success('Nhập kho thành công', `Tồn kho mới: ${res.new_quantity}`)
        setShowAddStock(false)
        resetForm()
        loadData()
      } else {
        notify.error('Lỗi nhập kho', res.message)
      }
    }
  }

  const imeiProducts = products.filter(p => p.is_imei === 1)
  const accessoryProducts = products.filter(p => p.is_imei === 0)

  const filteredStockProducts = products.filter(p => {
    if (prodFilterType === 'phone' && p.is_imei !== 1) return false
    if (prodFilterType === 'accessory' && p.is_imei === 1) return false
    if (!prodSearch.trim()) return true
    const q = prodSearch.toLowerCase().trim()
    const nameMatch = (p.name || '').toLowerCase().includes(q)
    const skuMatch = (p.sku || '').toLowerCase().includes(q)
    const barcodeMatch = (p.barcode || '').toLowerCase().includes(q)
    return nameMatch || skuMatch || barcodeMatch
  })

  const calcTotalCost = isImeiProduct
    ? (parseFloat(unitCost) || 0) * parsedImeis.length
    : (parseFloat(unitCost) || 0) * (parseInt(quantity) || 0)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Kho hàng & Xuất nhập tồn</h2>
          <p>Theo dõi luân chuyển tồn kho thiết bị và linh phụ kiện</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowAddStock(true) }}>
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
                <th className="text-center">Phân loại</th>
                <th className="text-center">Loại giao dịch</th>
                <th className="text-center">Số lượng</th>
                <th className="text-center">Trước / Sau</th>
                <th>Nhà cung cấp / Người thực hiện</th>
                <th>Chi tiết / Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id}>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {formatDateTime(m.created_at)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {m.is_imei === 1 ? (
                        <Smartphone size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      ) : (
                        <Package size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      )}
                      <strong>{m.product_name || m.product_name_ref}</strong>
                    </div>
                  </td>
                  <td className="text-center">
                    {m.is_imei === 1 ? (
                      <span className="badge badge-info" style={{ fontSize: 11 }}>Máy IMEI</span>
                    ) : (
                      <span className="badge badge-default" style={{ fontSize: 11 }}>Phụ kiện</span>
                    )}
                  </td>
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
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 280 }}>
                    {m.note || '—'}
                  </td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-state">
                    <Boxes size={40} />
                    <p>Chưa có lịch sử xuất nhập kho</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NHẬP KHO THÔNG MINH (OPTION 1) */}
      <Modal
        show={showAddStock}
        onClose={() => setShowAddStock(false)}
        title={
          curProduct
            ? isImeiProduct
              ? `Nhập kho: ${curProduct.name} (Điện thoại / Thiết bị IMEI)`
              : `Nhập kho: ${curProduct.name} (Phụ kiện / Hàng hóa)`
            : 'Nhập hàng vào kho'
        }
        size={isImeiProduct ? 'lg' : 'md'}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {calcTotalCost > 0 && (
                <span>
                  Tổng vốn nhập: <strong style={{ color: 'var(--primary)', fontSize: 15 }}>{formatCurrency(calcTotalCost)}</strong>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => setShowAddStock(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleAddStock} disabled={loading}>
                {loading
                  ? 'Đang lưu...'
                  : isImeiProduct
                  ? `Xác nhận nhập kho (${parsedImeis.length} máy)`
                  : 'Xác nhận nhập kho'}
              </button>
            </div>
          </div>
        }
      >
        {/* BỘ CHỌN SẢN PHẨM CUỘN TÌM KIẾM THÔNG MINH (KHẮC PHỤC TRIỆT ĐỂ LỖI CUỘN SELECT NATIVE) */}
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label" style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Chọn sản phẩm cần nhập *</span>
            {selectedProduct && !isSelectingProd && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setIsSelectingProd(true)}
                style={{ fontSize: 12, padding: '2px 8px', height: 'auto' }}
              >
                <RefreshCw size={12} style={{ marginRight: 4 }} /> Đổi sản phẩm khác
              </button>
            )}
          </label>

          {/* Nếu đã chọn sản phẩm và đang thu gọn: Hiển thị Thẻ tóm tắt sản phẩm đã chọn */}
          {selectedProduct && curProduct && !isSelectingProd ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--primary-light)',
                border: '1.5px solid var(--primary)',
                borderRadius: 8
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    flexShrink: 0
                  }}
                >
                  {curProduct.is_imei === 1 ? <Smartphone size={20} /> : <Package size={20} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{curProduct.name}</strong>
                    {curProduct.is_imei === 1 ? (
                      <span className="badge badge-info" style={{ fontSize: 10 }}>📱 Máy IMEI</span>
                    ) : (
                      <span className="badge badge-default" style={{ fontSize: 10 }}>📦 Phụ kiện</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    <span>Mã SKU: <b>{curProduct.sku || '—'}</b></span>
                    <span style={{ margin: '0 8px' }}>•</span>
                    <span>Tồn hiện tại: <b style={{ color: curProduct.stock_quantity > 0 ? 'var(--success)' : 'var(--danger)' }}>{curProduct.stock_quantity}</b> {curProduct.unit || (curProduct.is_imei === 1 ? 'máy' : 'cái')}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setIsSelectingProd(true)}
                title="Chọn lại sản phẩm khác"
              >
                <RefreshCw size={13} style={{ marginRight: 4 }} /> Đổi
              </button>
            </div>
          ) : (
            /* Danh sách cuộn chọn sản phẩm có ô tìm kiếm và bộ lọc tab */
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, background: 'var(--bg-card)' }}>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: 34, paddingRight: prodSearch ? 30 : 10 }}
                  placeholder="Gõ tìm kiếm tên máy, iPhone, phụ kiện, mã SKU, barcode..."
                  value={prodSearch}
                  onChange={e => setProdSearch(e.target.value)}
                  autoFocus={!selectedProduct}
                />
                {prodSearch && (
                  <button
                    type="button"
                    onClick={() => setProdSearch('')}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Phân loại tab nhanh */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto', paddingBottom: 2 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${prodFilterType === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: 11, padding: '3px 8px', height: 'auto', borderRadius: 14 }}
                  onClick={() => setProdFilterType('all')}
                >
                  Tất cả ({products.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${prodFilterType === 'phone' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: 11, padding: '3px 8px', height: 'auto', borderRadius: 14 }}
                  onClick={() => setProdFilterType('phone')}
                >
                  📱 Điện thoại / IMEI ({imeiProducts.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${prodFilterType === 'accessory' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: 11, padding: '3px 8px', height: 'auto', borderRadius: 14 }}
                  onClick={() => setProdFilterType('accessory')}
                >
                  📦 Phụ kiện ({accessoryProducts.length})
                </button>
                {selectedProduct && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 11, padding: '3px 8px', height: 'auto', borderRadius: 14, marginLeft: 'auto' }}
                    onClick={() => setIsSelectingProd(false)}
                  >
                    Thu gọn
                  </button>
                )}
              </div>

              {/* Khung cuộn danh sách sản phẩm mượt mà */}
              <div
                style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  background: 'white'
                }}
                onWheel={e => e.stopPropagation()}
              >
                {filteredStockProducts.map(p => {
                  const isSelected = String(p.id) === String(selectedProduct)
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        handleSelectProduct(String(p.id))
                        setIsSelectingProd(false)
                      }}
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-light, #f1f5f9)',
                        background: isSelected ? 'var(--primary-light)' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover, #f8fafc)'
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p.is_imei === 1 ? (
                          <Smartphone size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        ) : (
                          <Package size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        )}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            SKU: {p.sku || '—'} {p.barcode ? `| Barcode: ${p.barcode}` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          Tồn: <strong style={{ color: p.stock_quantity > 0 ? 'var(--text-primary)' : 'var(--danger)' }}>{p.stock_quantity}</strong> {p.unit || (p.is_imei === 1 ? 'máy' : 'cái')}
                        </span>
                        {p.is_imei === 1 ? (
                          <span className="badge badge-info" style={{ fontSize: 10 }}>IMEI</span>
                        ) : (
                          <span className="badge badge-default" style={{ fontSize: 10 }}>Phụ kiện</span>
                        )}
                        {isSelected && <Check size={14} style={{ color: 'var(--primary)' }} />}
                      </div>
                    </div>
                  )
                })}
                {filteredStockProducts.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Không tìm thấy sản phẩm nào phù hợp với từ khóa "{prodSearch}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* GIAO DIỆN THÍCH ỨNG: DÀNH CHO IPHONE / THIẾT BỊ IMEI */}
        {isImeiProduct && (
          <div style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="form-label" style={{ marginBottom: 0, fontWeight: 600, color: 'var(--primary)' }}>
                Danh sách mã IMEI *
              </label>
              <span className="badge badge-info" style={{ fontSize: 12 }}>
                Đã nhận diện: <b>{parsedImeis.length}</b> máy
              </span>
            </div>
            <textarea
              className="form-input"
              rows={4}
              value={imeiText}
              onChange={e => setImeiText(e.target.value)}
              placeholder="Nhập hoặc quét mã IMEI... (Mỗi mã 1 dòng hoặc cách nhau bởi dấu phẩy)"
              style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              * Hỗ trợ máy quét mã vạch Barcode/QR hoặc dán danh sách IMEI từ Excel.
            </div>

            <div className="form-row col-3" style={{ marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">Dung lượng</label>
                <select
                  className="form-select"
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                >
                  <option value="64GB">64GB</option>
                  <option value="128GB">128GB</option>
                  <option value="256GB">256GB</option>
                  <option value="512GB">512GB</option>
                  <option value="1TB">1TB</option>
                  <option value="">Không phân loại</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Màu sắc</label>
                <input
                  className="form-input"
                  list="color-options"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  placeholder="VD: Titan Tự Nhiên, Đen..."
                />
                <datalist id="color-options">
                  <option value="Titan Tự Nhiên" />
                  <option value="Titan Sa Mạc" />
                  <option value="Titan Đen" />
                  <option value="Titan Trắng" />
                  <option value="Đen (Black)" />
                  <option value="Trắng (White)" />
                  <option value="Xanh (Blue)" />
                  <option value="Vàng (Gold)" />
                  <option value="Tím (Purple)" />
                  <option value="Hồng (Pink)" />
                </datalist>
              </div>

              <div className="form-group">
                <label className="form-label">Tình trạng máy</label>
                <input
                  className="form-input"
                  list="condition-options"
                  value={condition}
                  onChange={e => setCondition(e.target.value)}
                  placeholder="VD: Like New 99%, Mới 100%, Cũ 95%..."
                />
                <datalist id="condition-options">
                  <option value="Mới 100% (New Seal)" />
                  <option value="Like New 99%" />
                  <option value="Cũ 98%" />
                  <option value="Cũ 95%" />
                  <option value="Cũ 90%" />
                  <option value="Chưa kích hoạt (Active Online)" />
                  <option value="Hàng CPO" />
                  <option value="Đã thay linh kiện / Pin mới" />
                </datalist>
              </div>
            </div>

            <div className="form-row col-3" style={{ marginTop: 6 }}>
              <div className="form-group">
                <label className="form-label">Đơn giá vốn nhập (đ/máy)</label>
                <input
                  type="number"
                  className="form-input"
                  value={unitCost}
                  onChange={e => setUnitCost(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Giá bán lẻ dự kiến (đ/máy)</label>
                <input
                  type="number"
                  className="form-input"
                  value={sellPrice}
                  onChange={e => setSellPrice(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Thời hạn bảo hành (tháng)</label>
                <input
                  type="number"
                  className="form-input"
                  value={warrantyMonths}
                  onChange={e => setWarrantyMonths(e.target.value)}
                  placeholder="12"
                />
              </div>
            </div>
          </div>
        )}

        {/* GIAO DIỆN THÍCH ỨNG: DÀNH CHO PHỤ KIỆN THƯỜNG */}
        {selectedProduct && !isImeiProduct && (
          <div className="form-row col-2">
            <div className="form-group">
              <label className="form-label">Số lượng nhập * ({curProduct?.unit || 'cái'})</label>
              <input
                type="number"
                className="form-input"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Đơn giá nhập (đ/{curProduct?.unit || 'cái'})</label>
              <input
                type="number"
                className="form-input"
                value={unitCost}
                onChange={e => setUnitCost(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        )}

        <div className="form-row col-2">
          <div className="form-group">
            <label className="form-label">Nhà cung cấp</label>
            <select
              className="form-select"
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
            >
              <option value="">-- Không chọn nhà cung cấp --</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Ghi chú nhập kho</label>
            <input
              className="form-input"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Lý do nhập, số hóa đơn NCC hoặc đợt hàng..."
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
