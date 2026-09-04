import { formatCurrency } from '../utils/format'
import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } from 'recharts'
import {
  BarChart3,
  TrendingUp,
  Smartphone,
  Headphones,
  Wrench,
  Calendar,
  Layers,
  DollarSign,
  RefreshCw
} from 'lucide-react'

export const Reports: React.FC = () => {
  const [summary, setSummary] = useState<any>(null)
  const [channelData, setChannelData] = useState<any>(null)
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [monthlySales, setMonthlySales] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [sum, channels, top, monthly] = await Promise.all([
        window.api.reports.getSummary(),
        window.api.reports.getRevenueByChannel(),
        window.api.reports.getTopProducts(10),
        window.api.reports.getMonthlySales()
      ])
      setSummary(sum)
      setChannelData(channels)
      setTopProducts(Array.isArray(top) ? top : [])
      setMonthlySales(Array.isArray(monthly) ? monthly : [])
    } catch (e) {
      console.error(e)
      setTopProducts([])
      setMonthlySales([])
    }
  }

  
  // Channel calculations
  const phoneRev = channelData?.orderChannels?.find((c: any) => c.channel_type === 'phone')?.revenue || 0
  const accRev = channelData?.orderChannels?.find((c: any) => c.channel_type === 'accessory' || c.channel_type === 'product')?.revenue || 0
  const serviceRev = (channelData?.orderChannels?.find((c: any) => c.channel_type === 'service')?.revenue || 0) + (channelData?.repairRevenue?.revenue || 0)
  const totalRev = phoneRev + accRev + serviceRev || 1

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Báo cáo Doanh thu & Kinh doanh</h2>
          <p>Phân tích đa chiều theo sản phẩm và kênh dịch vụ</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-outline" onClick={loadData}>
            <RefreshCw size={15} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-icon blue">
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Doanh thu Hôm nay</div>
            <div className="stat-value">{formatCurrency(summary?.today?.revenue || 0)}</div>
            <div className="stat-sub">{summary?.today?.orders || 0} đơn hàng | Lãi: {formatCurrency(summary?.today?.profit || 0)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <Calendar size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Doanh thu Tháng này</div>
            <div className="stat-value">{formatCurrency(summary?.month?.revenue || 0)}</div>
            <div className="stat-sub">{summary?.month?.orders || 0} đơn hàng trong tháng</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange" style={{ backgroundColor: '#fff7ed', color: '#ea580c' }}>
            <DollarSign size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Lợi nhuận gộp Tháng này</div>
            <div className="stat-value" style={{ color: '#ea580c' }}>
              {formatCurrency(summary?.month?.profit || 0)}
            </div>
            <div className="stat-sub">Tổng lãi thuần theo giá vốn</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <Layers size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Doanh thu Dịch vụ / Sửa</div>
            <div className="stat-value" style={{ color: '#7c3aed' }}>
              {formatCurrency(serviceRev)}
            </div>
            <div className="stat-sub">30 ngày qua</div>
          </div>
        </div>
      </div>

      
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Biểu đồ Doanh thu & Lợi nhuận (Tháng này)</span>
        </div>
        <div className="card-body" style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlySales} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis tickFormatter={(val: any) => (val/1000000) + 'M'} />
              <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
              <Legend />
              <Bar dataKey="revenue" name="Doanh thu" fill="#3b82f6" />
              <Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#10b981" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
  
      {/* Revenue by Channels (Phones, Accessories, Services) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Cơ cấu Doanh thu theo Ngành Hàng (30 ngày)</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 'var(--radius-sm)', minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 700, marginBottom: 6 }}>
                <Smartphone size={18} />
                <span>Điện thoại (IMEI)</span>
              </div>
              <div
                title={formatCurrency(phoneRev)}
                style={{
                  fontSize: phoneRev >= 100000000 ? 16 : phoneRev >= 10000000 ? 18 : 20,
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {formatCurrency(phoneRev)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Chiếm {Math.round((phoneRev / totalRev) * 100)}% tổng doanh thu
              </div>
            </div>

            <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 'var(--radius-sm)', minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--info)', fontWeight: 700, marginBottom: 6 }}>
                <Headphones size={18} />
                <span>Phụ kiện</span>
              </div>
              <div
                title={formatCurrency(accRev)}
                style={{
                  fontSize: accRev >= 100000000 ? 16 : accRev >= 10000000 ? 18 : 20,
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {formatCurrency(accRev)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Chiếm {Math.round((accRev / totalRev) * 100)}% tổng doanh thu
              </div>
            </div>

            <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 'var(--radius-sm)', minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7c3aed', fontWeight: 700, marginBottom: 6 }}>
                <Wrench size={18} />
                <span>Dịch vụ & Sửa chữa</span>
              </div>
              <div
                title={formatCurrency(serviceRev)}
                style={{
                  fontSize: serviceRev >= 100000000 ? 16 : serviceRev >= 10000000 ? 18 : 20,
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {formatCurrency(serviceRev)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Chiếm {Math.round((serviceRev / totalRev) * 100)}% tổng doanh thu
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Top 10 Sản phẩm & Dịch vụ sinh lời cao nhất (30 ngày)</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Sản phẩm / Dịch vụ</th>
                <th className="text-center">Số lượng bán</th>
                <th className="text-center">Số đơn</th>
                <th className="text-right">Tổng doanh thu</th>
                <th className="text-right">Lợi nhuận (Lãi)</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={i}>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        textAlign: 'center',
                        lineHeight: '22px',
                        fontSize: 11,
                        fontWeight: 700,
                        background: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c2f' : 'var(--primary-light)',
                        color: i < 3 ? 'white' : 'var(--primary)'
                      }}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td><strong>{p.product_name}</strong></td>
                  <td className="text-center">
                    <span className="badge badge-gray">{p.total_quantity}</span>
                  </td>
                  <td className="text-center">{p.order_count}</td>
                  <td className="text-right font-bold" style={{ color: 'var(--primary)' }}>
                    {formatCurrency(p.total_revenue)}
                  </td>
                  <td className="text-right font-bold" style={{ color: 'var(--success)' }}>
                    {formatCurrency(p.total_profit ?? 0)}
                  </td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">Chưa có dữ liệu</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
