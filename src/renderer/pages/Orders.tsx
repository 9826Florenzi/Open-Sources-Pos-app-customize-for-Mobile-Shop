import { Pagination } from '../components/Pagination'
import { formatCurrency } from '../utils/format'
import React, { useState, useEffect } from 'react'
import {
  Search,
  Eye,
  Printer,
  XCircle,
  Calendar,
  ClipboardList,
  Download
} from 'lucide-react'
import { Modal } from '../components/Modal'
import { useNotify } from '../context/AppContext'
import { exportToExcel } from '../utils/exportExcel'
import { formatDateTime } from '../utils/dateTime'

export const Orders: React.FC = () => {
  const notify = useNotify()
  const [orders, setOrders] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Detail Modal
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  useEffect(() => {
    loadOrders()
  }, [page, pageSize, search, statusFilter, dateFrom, dateTo])

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, dateFrom, dateTo])

  async function loadOrders() {
    try {
      const res: any = await window.api.orders.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        pageSize
      })
      if (res && typeof res === 'object' && 'data' in res && Array.isArray(res.data)) {
        setOrders(res.data)
        setTotal(res.total ?? res.data.length)
      } else if (Array.isArray(res)) {
        setOrders(res)
        setTotal(res.length)
      } else {
        setOrders([])
        setTotal(0)
      }
    } catch (e) {
      console.error(e)
      setOrders([])
      setTotal(0)
    }
  }

  
  async function openDetail(orderId: number) {
    const detail = await window.api.orders.getById(orderId)
    setSelectedOrder(detail)
    setShowDetailModal(true)
  }

  async function handlePrint(orderId: number) {
    const res = await window.api.print.invoice(orderId)
    if (res.success) {
      notify.success('Đã gửi lệnh in')
    } else {
      notify.error('Lỗi in', res.message)
    }
  }

  async function handleCancel(orderId: number) {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này? Tồn kho và IMEI sẽ được hoàn trả lại.')) return
    const res = await window.api.orders.cancel(orderId)
    if (res.success) {
      notify.success('Đã hủy đơn hàng và hoàn kho')
      setShowDetailModal(false)
      loadOrders()
    } else {
      notify.error('Lỗi', res.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Danh sách Đơn hàng</h2>
          <p>{total} đơn hàng</p>
        </div>
        <div className="page-header-right">
          <button
            className="btn btn-outline"
            onClick={() => {
              const exportData = orders.map(o => ({
                'Mã đơn hàng': o.order_number,
                'Thời gian': new Date(o.created_at).toLocaleString('vi-VN'),
                'Khách hàng': o.customer_name || 'Khách lẻ',
                'Thu ngân': o.user_name || '',
                'Tạm tính': o.subtotal,
                'Giảm giá': o.discount_amount,
                'Tổng tiền': o.total_amount,
                'Hình thức thanh toán': o.payment_method === 'cash' ? 'Tiền mặt' : o.payment_method === 'transfer' ? 'Chuyển khoản' : 'Thẻ',
                'Trạng thái': o.status === 'completed' ? 'Hoàn thành' : 'Đã hủy'
              }))
              exportToExcel(exportData, 'Danh_Sach_Don_Hang')
              notify.success('Đã xuất file Excel đơn hàng')
            }}
          >
            <Download size={15} />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
            <Search size={15} className="search-icon" />
            <input
              placeholder="Tìm theo mã đơn hoặc tên khách hàng..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 150 }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
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
                <th>Mã đơn</th>
                <th>Thời gian</th>
                <th>Khách hàng</th>
                <th>Thu ngân</th>
                <th>Số món</th>
                <th className="text-right">Giảm giá</th>
                <th className="text-right">Tổng tiền</th>
                <th className="text-center">Thanh toán</th>
                <th className="text-center">Trạng thái</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>
                    <strong style={{ color: 'var(--primary)' }}>{o.order_number}</strong>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {formatDateTime(o.created_at)}
                  </td>
                  <td>{o.customer_name || 'Khách lẻ'}</td>
                  <td>{o.user_name || '—'}</td>
                  <td>{o.item_count} món</td>
                  <td className="text-right" style={{ color: 'var(--danger)' }}>
                    {o.discount_amount > 0 ? `-${formatCurrency(o.discount_amount)}` : '0đ'}
                  </td>
                  <td className="text-right font-bold" style={{ color: 'var(--primary)' }}>
                    {formatCurrency(o.total_amount)}
                  </td>
                  <td className="text-center">
                    <span className="badge badge-gray">
                      {o.payment_method === 'cash' ? 'Tiền mặt' : o.payment_method === 'transfer' ? 'Chuyển khoản' : 'Thẻ'}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`badge ${o.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>
                      {o.status === 'completed' ? 'Hoàn tất' : 'Đã hủy'}
                    </span>
                  </td>
                  <td className="text-center">
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => openDetail(o.id)}
                        title="Xem chi tiết"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => handlePrint(o.id)}
                        title="In lại hóa đơn"
                      >
                        <Printer size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={10} className="empty-state">
                    <ClipboardList size={40} />
                    <p>Không có đơn hàng nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(s: any) => { setPageSize(s); setPage(1); }} />
        </div>

      {/* Order Detail Modal */}
      <Modal
        show={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Chi tiết đơn hàng: ${selectedOrder?.order_number}`}
        size="lg"
        footer={
          <>
            {selectedOrder?.status === 'completed' && (
              <button
                className="btn btn-danger"
                style={{ marginRight: 'auto' }}
                onClick={() => handleCancel(selectedOrder.id)}
              >
                <XCircle size={15} />
                <span>Hủy đơn & Hoàn kho</span>
              </button>
            )}
            <button
              className="btn btn-outline"
              onClick={() => handlePrint(selectedOrder?.id)}
            >
              <Printer size={15} />
              <span>In hóa đơn</span>
            </button>
            <button className="btn btn-primary" onClick={() => setShowDetailModal(false)}>
              Đóng
            </button>
          </>
        }
      >
        {selectedOrder && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: 13, background: 'var(--bg)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
              <div><b>Khách hàng:</b> {selectedOrder.customer_name || 'Khách lẻ'}</div>
              <div><b>Điện thoại:</b> {selectedOrder.customer_phone || '—'}</div>
              <div><b>Thời gian:</b> {formatDateTime(selectedOrder.created_at)}</div>
              <div><b>Thu ngân:</b> {selectedOrder.user_name || '—'}</div>
            </div>

            <table className="data-table" style={{ marginBottom: 16 }}>
              <thead>
                <tr>
                  <th>Sản phẩm / Dịch vụ</th>
                  <th className="text-center">Số lượng</th>
                  <th className="text-right">Đơn giá</th>
                  <th className="text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                      {item.imei && (
                        <div style={{ fontSize: 11, color: 'var(--primary)' }}>
                          IMEI: <b>{item.imei}</b> {item.warranty_expiry && `(BH đến: ${item.warranty_expiry.slice(0, 10)})`}
                        </div>
                      )}
                    </td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="text-right font-bold">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', fontSize: 13 }}>
              <div>Tạm tính: <b>{formatCurrency(selectedOrder.subtotal)}</b></div>
              {selectedOrder.discount_amount > 0 && (
                <div style={{ color: 'var(--danger)' }}>
                  Giảm giá: <b>-{formatCurrency(selectedOrder.discount_amount)}</b>
                </div>
              )}
              <div style={{ fontSize: 16, color: 'var(--primary)' }}>
                TỔNG TIỀN: <b>{formatCurrency(selectedOrder.total_amount)}</b>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
