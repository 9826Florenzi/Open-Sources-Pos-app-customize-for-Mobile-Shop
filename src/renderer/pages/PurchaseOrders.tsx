import React, { useState, useEffect } from 'react'
import { Plus, Search, FileText } from 'lucide-react'
import { formatCurrency } from '../utils/format'
import { formatDateTime } from '../utils/dateTime'

export const PurchaseOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const data = await window.api.po.getAll()
      setOrders(data)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Nhập Hàng (Purchase Orders)</h1>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => alert('Tính năng thêm mới Phiếu Nhập đang được hoàn thiện đầy đủ. Bạn đã có Backend API po:create')}>
            <Plus size={20} />
            <span>Tạo Phiếu Nhập</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Ngày nhập</th>
                <th>Nhà cung cấp</th>
                <th>Người tạo</th>
                <th className="text-right">Tổng tiền</th>
                <th className="text-right">Đã thanh toán</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="font-bold">{o.order_number}</td>
                  <td>{formatDateTime(o.created_at)}</td>
                  <td>{o.supplier_name || '---'}</td>
                  <td>{o.user_name}</td>
                  <td className="text-right font-bold text-primary">{formatCurrency(o.total_amount)}</td>
                  <td className="text-right text-success">{formatCurrency(o.paid_amount)}</td>
                  <td>
                    <span className={`badge badge-${o.status === 'completed' ? 'success' : o.status === 'draft' ? 'warning' : 'danger'}`}>
                      {o.status === 'completed' ? 'Hoàn thành' : o.status === 'draft' ? 'Bản nháp' : 'Đã hủy'}
                    </span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center empty-state">
                    <FileText size={48} style={{ margin: '0 auto 16px', color: 'var(--border-color)' }} />
                    <p>Chưa có phiếu nhập hàng nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
