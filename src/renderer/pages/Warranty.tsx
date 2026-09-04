import React, { useState, useEffect } from 'react'
import { Search, Shield, CheckCircle2, XCircle, Clock } from 'lucide-react'

export const Warranty: React.FC = () => {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<any>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [soldList, setSoldList] = useState<any[]>([])

  useEffect(() => {
    loadSoldList()
  }, [])

  async function loadSoldList() {
    try {
      const data = await window.api.warranties.getAll()
      setSoldList(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setSoldList([])
    }
  }

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!query.trim()) return
    const res = await window.api.warranties.check(query.trim())
    setResult(res)
    setHasSearched(true)
  }

  function isWarrantyValid(soldAt: string, months: number) {
    if (!soldAt) return false
    const soldDate = new Date(soldAt)
    const expDate = new Date(soldDate)
    expDate.setMonth(expDate.getMonth() + months)
    return new Date() <= expDate
  }

  function getExpirationDate(soldAt: string, months: number) {
    if (!soldAt) return '—'
    const soldDate = new Date(soldAt)
    const expDate = new Date(soldDate)
    expDate.setMonth(expDate.getMonth() + months)
    return expDate.toLocaleDateString('vi-VN')
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Tra cứu Bảo hành Máy</h2>
          <p>Kiểm tra thời hạn bảo hành điện thoại theo mã IMEI</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: 24, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <Shield size={44} style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Nhập mã IMEI cần tra cứu</h3>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              style={{ fontSize: 15, padding: '10px 16px' }}
              placeholder="VD: 358239019283748"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-primary btn-lg">
              <Search size={16} />
              <span>Tra cứu</span>
            </button>
          </form>
        </div>
      </div>

      {hasSearched && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Kết quả tra cứu IMEI: {query}</span>
          </div>
          <div className="card-body">
            {result ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {result.product_name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Mã IMEI: <b style={{ color: 'var(--primary)' }}>{result.imei}</b>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    Trạng thái máy:{' '}
                    <span className={`badge ${result.status === 'sold' ? 'badge-success' : 'badge-primary'}`}>
                      {result.status === 'sold' ? 'Đã bán cho khách' : 'Đang trong kho'}
                    </span>
                  </div>
                </div>

                <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 'var(--radius-sm)' }}>
                  {result.status === 'sold' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        {isWarrantyValid(result.sold_at, result.warranty_months) ? (
                          <>
                            <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>CÒN HẠN BẢO HÀNH</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={18} style={{ color: 'var(--danger)' }} />
                            <span style={{ fontWeight: 700, color: 'var(--danger)' }}>HẾT HẠN BẢO HÀNH</span>
                          </>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <div>Ngày bán: <b>{new Date(result.sold_at).toLocaleDateString('vi-VN')}</b></div>
                        <div>Thời hạn: <b>{result.warranty_months} tháng</b></div>
                        <div>Hạn bảo hành đến: <b>{getExpirationDate(result.sold_at, result.warranty_months)}</b></div>
                        <div>Đơn hàng: <b>{result.order_number}</b></div>
                        <div>Khách hàng: <b>{result.customer_name || 'Khách lẻ'}</b> {result.customer_phone && `(${result.customer_phone})`}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)' }}>
                      <Clock size={18} />
                      <span>Máy chưa bán ra (Còn trong kho). Thời hạn bảo hành: {result.warranty_months} tháng</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 20 }}>
                <p>Không tìm thấy thông tin của mã IMEI này trong cơ sở dữ liệu</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Thiết bị bán gần đây ({soldList.length})</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã IMEI</th>
                <th>Sản phẩm</th>
                <th>Khách hàng</th>
                <th>Ngày bán</th>
                <th>Hạn bảo hành</th>
                <th className="text-center">Tình trạng</th>
              </tr>
            </thead>
            <tbody>
              {soldList.map(item => {
                const valid = isWarrantyValid(item.sold_at, item.warranty_months)
                return (
                  <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => { setQuery(item.imei); setResult(item); setHasSearched(true) }}>
                    <td><strong style={{ color: 'var(--primary)' }}>{item.imei}</strong></td>
                    <td>{item.product_name}</td>
                    <td>{item.customer_name || 'Khách lẻ'}</td>
                    <td>{item.sold_at ? new Date(item.sold_at).toLocaleDateString('vi-VN') : '—'}</td>
                    <td>{getExpirationDate(item.sold_at, item.warranty_months)}</td>
                    <td className="text-center">
                      <span className={`badge ${valid ? 'badge-success' : 'badge-danger'}`}>
                        {valid ? 'Còn bảo hành' : 'Hết hạn'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
