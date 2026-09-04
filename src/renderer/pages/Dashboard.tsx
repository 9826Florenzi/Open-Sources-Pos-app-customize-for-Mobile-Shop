import { formatCurrency } from '../utils/format'
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  Wrench,
  ArrowRight
} from 'lucide-react'

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<any>(null)
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [sum, top, lowStock] = await Promise.all([
        window.api.reports.getSummary(),
        window.api.reports.getTopProducts(5),
        window.api.products.getLowStock()
      ])
      setSummary(sum)
      setTopProducts(top)
      setLowStockProducts(lowStock)
    } catch (e) {
      console.error(e)
    }
  }

  
  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Doanh thu hôm nay</div>
            <div className="stat-value">{formatCurrency(summary?.today?.revenue || 0)}</div>
            <div className="stat-sub">{summary?.today?.orders || 0} đơn hàng hoàn tất</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <ShoppingCart size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Doanh thu tháng này</div>
            <div className="stat-value">{formatCurrency(summary?.month?.revenue || 0)}</div>
            <div className="stat-sub">{summary?.month?.orders || 0} đơn hàng trong tháng</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <Wrench size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Máy đang sửa chữa</div>
            <div className="stat-value">{summary?.repair_count?.count || 0}</div>
            <div className="stat-sub">Đang trong quy trình kỹ thuật</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <AlertTriangle size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Sản phẩm sắp hết</div>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>
              {summary?.low_stock?.count || 0}
            </div>
            <div className="stat-sub">Cần nhập thêm hàng</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Top sản phẩm bán chạy (30 ngày)</span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th className="text-center">Số lượng bán</th>
                  <th className="text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.product_name}</div>
                    </td>
                    <td className="text-center">
                      <span className="badge badge-primary">{p.total_quantity}</span>
                    </td>
                    <td className="text-right font-bold" style={{ color: 'var(--success)' }}>
                      {formatCurrency(p.total_revenue)}
                    </td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="empty-state">
                      Chưa có dữ liệu bán hàng
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Thao tác nhanh</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-primary btn-lg"
              style={{ justifyContent: 'space-between' }}
              onClick={() => navigate('/pos')}
            >
              <span>🛒 Màn hình Bán hàng (POS)</span>
              <ArrowRight size={16} />
            </button>

            <button
              className="btn btn-outline btn-lg"
              style={{ justifyContent: 'space-between' }}
              onClick={() => navigate('/repair')}
            >
              <span>🔧 Tiếp nhận máy Sửa chữa</span>
              <ArrowRight size={16} />
            </button>

            <button
              className="btn btn-outline btn-lg"
              style={{ justifyContent: 'space-between' }}
              onClick={() => navigate('/products')}
            >
              <span>📦 Thêm sản phẩm / Quản lý IMEI</span>
              <ArrowRight size={16} />
            </button>

            <button
              className="btn btn-outline btn-lg"
              style={{ justifyContent: 'space-between' }}
              onClick={() => navigate('/warranty')}
            >
              <span>🛡 Tra cứu Bảo hành</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
        
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header" style={{ backgroundColor: '#fff3cd', borderBottomColor: '#ffe69c' }}>
            <span className="card-title" style={{ color: '#856404' }}>
              <AlertTriangle size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Cảnh báo & Nhắc nhở
            </span>
          </div>
          <div className="card-body">
            {lowStockProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lowStockProducts.slice(0, 5).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#fff8f9', borderRadius: 4, border: '1px solid #ffe5eb' }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Tồn: {p.stock_quantity} (Tối thiểu: {p.min_stock})</span>
                  </div>
                ))}
                {lowStockProducts.length > 5 && (
                  <button className="btn btn-outline" style={{ marginTop: 8 }} onClick={() => navigate('/products')}>
                    Xem tất cả ({lowStockProducts.length}) sản phẩm sắp hết hàng
                  </button>
                )}
              </div>
            ) : (
              <div className="empty-state">Tất cả sản phẩm đều đủ tồn kho.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
