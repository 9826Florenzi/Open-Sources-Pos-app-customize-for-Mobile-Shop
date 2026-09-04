import { formatCurrency } from '../utils/format'
import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Banknote,
  Send,
  Printer,
  Smartphone,
  Headphones,
  Wrench,
  X,
  ShoppingCart,
  Zap,
  Shield,
  Gem,
  Package,
  Gift
} from 'lucide-react'

function getCategoryIcon(catName: string, isImei: number) {
  if (isImei === 1) return <Smartphone size={24} strokeWidth={1.5} color="var(--primary)" />
  if (!catName) return <Package size={24} strokeWidth={1.5} color="var(--text-secondary)" />
  const lower = catName.toLowerCase()
  if (lower.includes('tai nghe') || lower.includes('âm thanh')) return <Headphones size={24} strokeWidth={1.5} color="#8b5cf6" />
  if (lower.includes('cáp') || lower.includes('sạc')) return <Zap size={24} strokeWidth={1.5} color="#eab308" />
  if (lower.includes('ốp lưng') || lower.includes('bao da')) return <Shield size={24} strokeWidth={1.5} color="#10b981" />
  if (lower.includes('kính') || lower.includes('cường lực')) return <Gem size={24} strokeWidth={1.5} color="#0ea5e9" />
  if (lower.includes('đồ chơi') || lower.includes('công nghệ')) return <Zap size={24} strokeWidth={1.5} color="#f43f5e" />
  return <Package size={24} strokeWidth={1.5} color="var(--text-secondary)" />
}
import { Modal } from '../components/Modal'
import { useAuth, useNotify } from '../context/AppContext'

interface CartItem {
  id: string // unique client cart id
  product_id?: number
  product_name: string
  product_sku?: string
  unit: string
  quantity: number
  unit_price: number
  cost_price?: number
  stock_quantity?: number
  discount_amount: number
  subtotal: number
  imei?: string
  item_type: 'phone' | 'accessory' | 'service'
}

export const POS: React.FC = () => {
  const { user } = useAuth()
  const notify = useNotify()

  // Products & Categories
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCat, setSelectedCat] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'phone' | 'accessory' | 'service'>('all')

  // Cart
  const [cart, setCart] = useState<CartItem[]>([])
  const [parkedCarts, setParkedCarts] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('parked_carts') || '[]') } catch { return [] } })
  const [customer, setCustomer] = useState<any>(null)
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [discountMode, setDiscountMode] = useState<'percent' | 'vnd'>('percent')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash')
  const [cashReceived, setCashReceived] = useState<string>('')
  const [orderNote, setOrderNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // IMEI selection modal
  const [imeiProduct, setImeiProduct] = useState<any>(null)
  const [availableImeis, setAvailableImeis] = useState<any[]>([])
  const [showImeiModal, setShowImeiModal] = useState(false)

  // Customer search & modal
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<any[]>([])
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustAddress, setNewCustAddress] = useState('')

  // Free service creation form
  const [serviceName, setServiceName] = useState('')
  const [servicePrice, setServicePrice] = useState('')

  // Barcode / IMEI scanner input
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  async function loadProducts() {
    try {
      const prods = await window.api.products.getAll()
      setProducts(Array.isArray(prods) ? prods : [])
    } catch (e) {
      console.error(e)
      setProducts([])
    }
  }

  async function loadCategories() {
    try {
      const cats = await window.api.categories.getAll()
      setCategories(Array.isArray(cats) ? cats : [])
    } catch (e) {
      console.error(e)
      setCategories([])
    }
  }

  // Handle barcode / IMEI direct enter
  async function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const query = search.trim()
      if (!query) return

      // First check if it's an exact IMEI in warranty/product_imeis
      const warrantyCheck = await window.api.warranties.check(query)
      if (warrantyCheck && warrantyCheck.status === 'available') {
        // Direct IMEI match
        const prod = products.find(p => p.id === warrantyCheck.product_id)
        if (prod) {
          addImeiToCart(prod, warrantyCheck)
          setSearch('')
          return
        }
      }

      // Check if it's an exact barcode match
      const exactBarcode = products.find(p => p.barcode === query || p.sku === query)
      if (exactBarcode) {
        handleProductClick(exactBarcode)
        setSearch('')
        return
      }

      // If only 1 search result, add it
      const filtered = getFilteredProducts()
      if (filtered.length === 1) {
        handleProductClick(filtered[0])
        setSearch('')
      }
    }
  }

  async function handleProductClick(prod: any) {
    if (prod.is_imei === 1) {
      // Need to choose an IMEI
      const imeis = await window.api.products.getImeis(prod.id)
      const avail = imeis.filter(i => i.status === 'available')
      if (avail.length === 0) {
        notify.warning('Hết hàng', `Sản phẩm "${prod.name}" không còn mã IMEI khả dụng trong kho!`)
        return
      }
      setImeiProduct(prod)
      setAvailableImeis(avail)
      setShowImeiModal(true)
    } else {
      // Normal accessory/product
      if ((Number(prod.stock_quantity) || 0) <= 0) {
        notify.warning('Hết hàng', `Sản phẩm "${prod.name}" không còn tồn kho!`)
        return
      }
      addToCart({
        id: `prod_${prod.id}_${Date.now()}`,
        product_id: prod.id,
        product_name: prod.name,
        product_sku: prod.sku,
        unit: prod.unit || 'cái',
        quantity: 1,
        unit_price: prod.sell_price,
        cost_price: prod.cost_price,
        stock_quantity: prod.stock_quantity,
        discount_amount: 0,
        subtotal: prod.sell_price,
        item_type: 'accessory'
      })
    }
  }

  function addImeiToCart(prod: any, imeiObj: any) {
    const imeiStr = imeiObj.imei;
    // Check if IMEI already in cart
    if (cart.some(item => item.imei === imeiStr)) {
      notify.warning('Đã có trong giỏ', `Mã IMEI ${imeiStr} đã được thêm vào giỏ hàng!`)
      return
    }

    const specs = [imeiObj.capacity, imeiObj.color, imeiObj.condition].filter(Boolean).join(' - ')
    const fullName = specs ? `${prod.name} (${specs})` : prod.name;
    const finalPrice = imeiObj.price || prod.sell_price;
    const finalCost = imeiObj.cost_price || prod.cost_price;

    addToCart({
      id: `imei_${imeiStr}`,
      product_id: prod.id,
      product_name: fullName,
      product_sku: prod.sku,
      unit: prod.unit || 'máy',
      quantity: 1,
      unit_price: finalPrice,
      cost_price: finalCost,
      stock_quantity: prod.stock_quantity,
      discount_amount: 0,
      subtotal: finalPrice,
      imei: imeiStr,
      item_type: 'phone'
    })
    setShowImeiModal(false)
    if (!customer) {
      setShowCustomerModal(true)
      notify.info('Lưu thông tin bảo hành', 'Vui lòng chọn hoặc thêm thông tin khách hàng để lưu bảo hành theo máy!')
    }
  }

  function handleAddService(e: React.FormEvent) {
    e.preventDefault()
    if (!serviceName.trim()) {
      notify.warning('Thiếu tên dịch vụ', 'Vui lòng nhập tên dịch vụ hoặc linh kiện thay thế')
      return
    }
    const price = parseFloat(servicePrice) || 0
    if (price <= 0) {
      notify.warning('Giá không hợp lệ', 'Vui lòng nhập giá dịch vụ')
      return
    }

    addToCart({
      id: `svc_${Date.now()}`,
      product_name: serviceName.trim(),
      unit: 'lần',
      quantity: 1,
      unit_price: price,
      cost_price: 0,
      discount_amount: 0,
      subtotal: price,
      item_type: 'service'
    })

    setServiceName('')
    setServicePrice('')
    notify.success('Đã thêm dịch vụ', serviceName)
  }

  function addToCart(newItem: CartItem) {
    setCart(prev => {
      // If it's a normal accessory without IMEI and already exists, increment quantity
        if (!newItem.imei && newItem.product_id) {
          const existingIdx = prev.findIndex(item => item.product_id === newItem.product_id && !item.imei)
          if (existingIdx >= 0) {
            const updated = [...prev]
            const cur = updated[existingIdx]
            const newQty = cur.quantity + 1
            if (cur.stock_quantity !== undefined && newQty > cur.stock_quantity) {
              notify.warning('Không đủ tồn kho', `Sản phẩm "${cur.product_name}" chỉ còn ${cur.stock_quantity} ${cur.unit}`)
              return prev
            }
            updated[existingIdx] = {
              ...cur,
              quantity: newQty,
            subtotal: cur.unit_price * newQty - cur.discount_amount
          }
          return updated
        }
      }
      return [...prev, newItem]
    })
  }

  function updateQty(idx: number, delta: number) {
    setCart(prev => {
      const item = prev[idx]
      if (item.imei) {
        // IMEI quantity cannot be changed (always 1)
        return prev
      }
      const newQty = item.quantity + delta
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== idx)
      }
      if (item.stock_quantity !== undefined && newQty > item.stock_quantity) {
        notify.warning('Không đủ tồn kho', `Sản phẩm "${item.product_name}" chỉ còn ${item.stock_quantity} ${item.unit}`)
        return prev
      }
      const updated = [...prev]
      const wasGifted = item.discount_amount === item.unit_price * item.quantity && item.discount_amount > 0
      const newDiscount = wasGifted
        ? item.unit_price * newQty
        : Math.min(item.discount_amount, item.unit_price * newQty)
      updated[idx] = {
        ...item,
        quantity: newQty,
        discount_amount: newDiscount,
        subtotal: Math.max(0, item.unit_price * newQty - newDiscount)
      }
      return updated
    })
  }

  function updateItemDiscount(idx: number, discountVal: number) {
    setCart(prev => {
      const updated = [...prev]
      const item = updated[idx]
      const maxVal = item.unit_price * item.quantity
      const safeDiscount = Math.max(0, Math.min(discountVal, maxVal))
      updated[idx] = {
        ...item,
        discount_amount: safeDiscount,
        subtotal: Math.max(0, maxVal - safeDiscount)
      }
      return updated
    })
  }

  function toggleItemGift(idx: number) {
    setCart(prev => {
      const updated = [...prev]
      const item = updated[idx]
      const fullVal = item.unit_price * item.quantity
      const isCurrentlyGift = item.discount_amount === fullVal && fullVal > 0
      const newDiscount = isCurrentlyGift ? 0 : fullVal
      updated[idx] = {
        ...item,
        discount_amount: newDiscount,
        subtotal: Math.max(0, fullVal - newDiscount)
      }
      return updated
    })
  }

  function removeFromCart(idx: number) {
    setCart(prev => prev.filter((_, i) => i !== idx))
  }

  // Calculations
  const subtotal = cart.reduce((sum, i) => sum + i.subtotal, 0)
  const calcDiscount = discountMode === 'vnd'
    ? Math.min(subtotal, discountAmount)
    : Math.round((subtotal * discountPercent) / 100)
  const totalAmount = Math.max(0, subtotal - calcDiscount)
  const receivedNum = cashReceived === '' ? totalAmount : parseFloat(cashReceived) || 0
  const changeAmount = Math.max(0, receivedNum - totalAmount)

  async function handleCheckout() {
    if (cart.length === 0) {
      notify.warning('Giỏ hàng trống', 'Vui lòng chọn sản phẩm hoặc dịch vụ')
      return
    }

    setSubmitting(true)
    try {
      const orderPayload = {
        customer_id: customer?.id || null,
        user_id: user?.id || null,
        subtotal,
        discount_amount: calcDiscount,
        discount_percent: discountMode === 'percent' ? discountPercent : 0,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        cash_received: receivedNum,
        change_amount: changeAmount,
        note: orderNote,
        items: cart.map(item => ({
          product_id: item.product_id || null,
          product_name: item.product_name,
          product_sku: item.product_sku || '',
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount,
          subtotal: item.subtotal,
          cost_price: item.cost_price || 0,
          imei: item.imei || null,
          item_type: item.item_type
        }))
      }

      const res = await window.api.orders.create(orderPayload)
      if (res.success && res.orderId) {
        notify.success('Thanh toán thành công!', `Mã đơn hàng: ${res.orderNumber}`)
        
        // Auto print invoice if print is enabled
        window.api.print.invoice(res.orderId).catch(console.error)

        // Reset cart
        setCart([])
        setCustomer(null)
        setDiscountPercent(0)
        setDiscountAmount(0)
        setDiscountMode('percent')
        setCashReceived('')
        setOrderNote('')
        loadProducts()
      } else {
        notify.error('Lỗi thanh toán', res.message || 'Không thể tạo đơn hàng')
      }
    } catch (err: any) {
      notify.error('Lỗi', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Customer Search
  async function searchCustomers(q: string) {
    setCustomerSearch(q)
    if (q.trim().length > 0) {
      const res = await window.api.customers.search(q.trim())
      setCustomerResults(res)
    } else {
      setCustomerResults([])
    }
  }

  async function handleCreateCustomer() {
    if (!newCustName.trim()) {
      notify.warning('Thiếu tên', 'Vui lòng nhập tên khách hàng')
      return
    }
    const res = await window.api.customers.create({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim()
    })
    if (res.success && res.id) {
      setCustomer({
        id: res.id,
        name: newCustName.trim(),
        phone: newCustPhone.trim()
      })
      setShowCustomerModal(false)
      setNewCustName('')
      setNewCustPhone('')
      setNewCustAddress('')
      notify.success('Đã chọn khách hàng', newCustName)
    } else {
      notify.error('Lỗi', res.message)
    }
  }

  
  function getFilteredProducts() {
    if (!Array.isArray(products)) return []
    return products.filter(p => {
      if (!p) return false
      if (selectedCat && p.category_id !== selectedCat) return false
      if (activeTab === 'phone' && p.is_imei !== 1) return false
      if (activeTab === 'accessory' && p.is_imei === 1) return false
      if (search.trim()) {
        const s = search.toLowerCase()
        const matchName = p.name ? String(p.name).toLowerCase().includes(s) : false
        const matchSku = p.sku ? String(p.sku).toLowerCase().includes(s) : false
        const matchBarcode = p.barcode ? String(p.barcode).toLowerCase().includes(s) : false
        if (!matchName && !matchSku && !matchBarcode) return false
      }
      return true
    })
  }

  const filteredProducts = getFilteredProducts()

  return (
    <div className="pos-layout">
      {/* Products Column */}
      <div className="pos-products">
        {/* Search & Tabs */}
        <div className="pos-toolbar">
          <div className="search-bar" style={{ flex: 1 }}>
            <Search size={16} className="search-icon" />
            <input
              ref={searchInputRef}
              placeholder="🔍 Quét Barcode, quét IMEI hoặc tìm tên sản phẩm (Enter để thêm)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`category-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => { setActiveTab('all'); setSelectedCat(null) }}
            >
              Tất cả
            </button>
            <button
              className={`category-tab ${activeTab === 'phone' ? 'active' : ''}`}
              onClick={() => { setActiveTab('phone'); setSelectedCat(null) }}
            >
              <Smartphone size={13} style={{ display: 'inline', marginRight: 4 }} />
              Điện thoại (IMEI)
            </button>
            <button
              className={`category-tab ${activeTab === 'accessory' ? 'active' : ''}`}
              onClick={() => { setActiveTab('accessory'); setSelectedCat(null) }}
            >
              <Headphones size={13} style={{ display: 'inline', marginRight: 4 }} />
              Phụ kiện
            </button>
            <button
              className={`category-tab ${activeTab === 'service' ? 'active' : ''}`}
              onClick={() => setActiveTab('service')}
            >
              <Wrench size={13} style={{ display: 'inline', marginRight: 4 }} />
              Dịch vụ / Sửa chữa
            </button>
          </div>
        </div>

        {/* Categories Bar (for product mode) */}
        {activeTab !== 'service' && (
          <div className="category-tabs">
            <button
              className={`category-tab ${selectedCat === null ? 'active' : ''}`}
              onClick={() => setSelectedCat(null)}
            >
              Tất cả danh mục
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                className={`category-tab ${selectedCat === c.id ? 'active' : ''}`}
                onClick={() => setSelectedCat(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'service' ? (
          <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
            <div className="card" style={{ maxWidth: 540, margin: '20px auto' }}>
              <div className="card-header">
                <span className="card-title">Thêm Dịch vụ / Linh kiện (Nhập tự do)</span>
              </div>
              <div className="card-body">
                <form onSubmit={handleAddService}>
                  <div className="form-group">
                    <label className="form-label">
                      Tên dịch vụ / Công thợ / Linh kiện thay thế <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: Thay pin iPhone 13, Ép kính Samsung S23..."
                      value={serviceName}
                      onChange={e => setServiceName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Giá tiền (VNĐ) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0"
                      value={servicePrice}
                      onChange={e => setServicePrice(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button type="submit" className="btn btn-primary btn-lg w-full">
                      + Thêm vào giỏ hàng
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map(p => (
              <div
                key={p.id}
                className="product-card"
                onClick={() => handleProductClick(p)}
              >
                <div className="product-card-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getCategoryIcon(p.category_name, p.is_imei)}
                </div>
                <div className="product-card-name" title={p.name}>
                  {p.name}
                </div>
                <div className="product-card-price">
                  {formatCurrency(p.sell_price)}
                </div>
                <div className={`product-card-stock ${p.stock_quantity <= 0 ? 'low' : ''}`}>
                  {p.is_imei === 1 ? `Tồn: ${p.stock_quantity} IMEI` : `Kho: ${p.stock_quantity} ${p.unit}`}
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <p>Không tìm thấy sản phẩm nào</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart Column */}
      <div className="pos-cart">
        {/* Cart Customer */}
        <div className="cart-customer">
          {customer ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>
                  👤 {customer.name}
                </div>
                {customer.phone && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{customer.phone}</div>}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setCustomer(null)}
                title="Bỏ chọn khách"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              className="btn btn-outline w-full btn-sm"
              onClick={() => setShowCustomerModal(true)}
              style={{ justifyContent: 'center' }}
            >
              <User size={14} />
              <span>Chọn hoặc thêm khách hàng</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="cart-items">
          {cart.map((item, idx) => {
            const isGift = item.discount_amount > 0 && item.discount_amount === item.unit_price * item.quantity
            return (
              <div key={item.id} className="cart-item">
                <div className="cart-item-main">
                  <div className="cart-item-name">
                    <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        Đơn giá: {formatCurrency(item.unit_price)}
                      </span>
                      {item.imei && (
                        <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700 }}>
                          IMEI: {item.imei}
                        </span>
                      )}
                      {item.item_type === 'service' && (
                        <span className="badge badge-info" style={{ fontSize: 9 }}>Dịch vụ</span>
                      )}
                      {isGift && (
                        <span className="badge badge-success" style={{ fontSize: 9, fontWeight: 700 }}>
                          🎁 TẶNG KÈM (0đ)
                        </span>
                      )}
                    </div>
                  </div>

                  {!item.imei ? (
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => updateQty(idx, -1)}>
                        <Minus size={12} />
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => updateQty(idx, 1)}>
                        <Plus size={12} />
                      </button>
                    </div>
                  ) : (
                    <span className="badge badge-gray" style={{ fontSize: 11 }}>1 máy</span>
                  )}

                  <div className="cart-item-subtotal">
                    {item.discount_amount > 0 ? (
                      <div>
                        <div style={{ fontSize: 10, textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                          {formatCurrency(item.unit_price * item.quantity)}
                        </div>
                        <div style={{ color: isGift ? 'var(--success)' : 'var(--primary)', fontWeight: 700 }}>
                          {formatCurrency(item.subtotal)}
                        </div>
                      </div>
                    ) : (
                      formatCurrency(item.subtotal)
                    )}
                  </div>

                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => removeFromCart(idx)}
                    style={{ color: 'var(--danger)' }}
                    title="Xóa khỏi giỏ"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Per-item direct discount & gift option */}
                <div className="cart-item-discount-row">
                  <button
                    type="button"
                    className={`btn btn-xs ${isGift ? 'btn-success' : 'btn-outline'}`}
                    style={{ padding: '2px 8px', fontSize: 10, borderRadius: 4 }}
                    onClick={() => toggleItemGift(idx)}
                    title="Bán kèm quà tặng 0đ (vẫn trừ kho và ghi nhận)"
                  >
                    <Gift size={11} style={{ marginRight: 3 }} />
                    {isGift ? 'Đang tặng (0đ)' : 'Tặng kèm (0đ)'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Giảm món:</span>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: 85, padding: '2px 6px', height: 22, fontSize: 11, textAlign: 'right' }}
                      value={item.discount_amount || ''}
                      placeholder="0 đ"
                      onChange={e => updateItemDiscount(idx, parseFloat(e.target.value) || 0)}
                    />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>đ</span>
                  </div>
                </div>
              </div>
            )
          })}

          {cart.length === 0 && (
            <div className="empty-state" style={{ padding: '40px 10px' }}>
              <ShoppingCart size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>Chưa có sản phẩm nào</p>
            </div>
          )}
        </div>

        {/* Cart Summary & Checkout */}
        <div className="cart-summary">
          <div className="cart-summary-row">
            <span>Tạm tính:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          <div className="cart-summary-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Giảm cả đơn:</span>
              <div style={{ display: 'inline-flex', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)', fontSize: 10 }}>
                <button
                  type="button"
                  style={{
                    padding: '2px 6px',
                    background: discountMode === 'percent' ? 'var(--primary)' : 'transparent',
                    color: discountMode === 'percent' ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                  onClick={() => {
                    setDiscountMode('percent')
                    setDiscountAmount(0)
                  }}
                >
                  %
                </button>
                <button
                  type="button"
                  style={{
                    padding: '2px 6px',
                    background: discountMode === 'vnd' ? 'var(--primary)' : 'transparent',
                    color: discountMode === 'vnd' ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                  onClick={() => {
                    setDiscountMode('vnd')
                    setDiscountPercent(0)
                  }}
                >
                  VNĐ
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {discountMode === 'percent' ? (
                <input
                  type="number"
                  className="form-input"
                  style={{ width: 65, padding: '2px 6px', height: 26, fontSize: 12, textAlign: 'right' }}
                  value={discountPercent || ''}
                  placeholder="0%"
                  onChange={e => {
                    const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                    setDiscountPercent(val)
                    setDiscountAmount(0)
                  }}
                />
              ) : (
                <input
                  type="number"
                  className="form-input"
                  style={{ width: 95, padding: '2px 6px', height: 26, fontSize: 12, textAlign: 'right' }}
                  value={discountAmount || ''}
                  placeholder="0 đ"
                  onChange={e => {
                    const val = Math.max(0, parseFloat(e.target.value) || 0)
                    setDiscountAmount(val)
                    setDiscountPercent(0)
                  }}
                />
              )}
              <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, minWidth: 60, textAlign: 'right' }}>
                -{formatCurrency(calcDiscount)}
              </span>
            </div>
          </div>
        </div>

        <div className="cart-total">
          <span className="total-label">TỔNG TIỀN:</span>
          <span className="total-amount">{formatCurrency(totalAmount)}</span>
        </div>

        <div className="cart-payment">
          <div className="payment-methods">
            <button
              className={`payment-method-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('cash')}
            >
              <Banknote size={16} />
              <span>Tiền mặt</span>
            </button>
            <button
              className={`payment-method-btn ${paymentMethod === 'transfer' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('transfer')}
            >
              <Send size={16} />
              <span>Chuyển khoản</span>
            </button>
            <button
              className={`payment-method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('card')}
            >
              <CreditCard size={16} />
              <span>Thẻ</span>
            </button>
          </div>

          {paymentMethod === 'cash' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Khách đưa"
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right' }}>
                Thối lại: <strong style={{ color: 'var(--primary)' }}>{formatCurrency(changeAmount)}</strong>
              </div>
            </div>
          )}

          <button
            className="btn btn-success btn-xl w-full"
            style={{ marginTop: 4 }}
            disabled={cart.length === 0 || submitting}
            onClick={handleCheckout}
          >
            {submitting ? 'ĐANG XỬ LÝ...' : `THANH TOÁN (${formatCurrency(totalAmount)})`}
          </button>
        </div>
      </div>

      {/* Select IMEI Modal */}
      <Modal
        show={showImeiModal}
        onClose={() => setShowImeiModal(false)}
        title={`Chọn mã IMEI - ${imeiProduct?.name}`}
        size="md"
      >
        <div style={{ maxHeight: 450, overflowY: 'auto' }}>
          <div style={{ fontSize: 13, marginBottom: 12, color: 'var(--text-secondary)' }}>
            Chọn 1 máy (IMEI) có sẵn để thêm vào giỏ hàng:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {availableImeis.map(item => {
              const specs = [item.capacity, item.color, item.condition].filter(Boolean).join(' - ')
              const finalPrice = item.price || imeiProduct?.sell_price || 0
              return (
                <button
                  key={item.id}
                  className="btn btn-outline"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 14px', height: 'auto', textAlign: 'left', border: '1px solid var(--border)' }}
                  onClick={() => addImeiToCart(imeiProduct, item)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{item.imei}</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(finalPrice)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {specs || 'Cấu hình mặc định'}
                    </span>
                    <span className="badge badge-success" style={{ fontSize: 10 }}>Sẵn sàng</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </Modal>

      {/* Customer Selection Modal */}
      <Modal
        show={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        title="Chọn khách hàng"
        size="md"
      >
        <div className="search-bar" style={{ marginBottom: 12 }}>
          <Search size={16} className="search-icon" />
          <input
            placeholder="Tìm theo tên hoặc số điện thoại..."
            value={customerSearch}
            onChange={e => searchCustomers(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 16 }}>
          {customerResults.map(c => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer'
              }}
              onClick={() => {
                setCustomer(c)
                setShowCustomerModal(false)
                notify.success('Đã chọn khách hàng', c.name)
              }}
            >
              <div>
                <strong>{c.name}</strong>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                  {c.phone}
                </span>
              </div>
              {c.debt > 0 && (
                <span className="badge badge-danger">Nợ: {formatCurrency(c.debt)}</span>
              )}
            </div>
          ))}
          {customerSearch && customerResults.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 10, fontSize: 12 }}>
              Không tìm thấy khách hàng
            </p>
          )}
        </div>

        <div className="divider" />
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Hoặc thêm khách hàng mới:</div>
        <div className="form-row col-2">
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="Tên khách hàng *"
              value={newCustName}
              onChange={e => setNewCustName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="Số điện thoại"
              value={newCustPhone}
              onChange={e => setNewCustPhone(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-primary w-full" onClick={handleCreateCustomer}>
          Tạo & Chọn khách hàng này
        </button>
      </Modal>
    </div>
  )
}
