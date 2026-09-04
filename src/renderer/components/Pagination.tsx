import React from 'react'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

export const Pagination: React.FC<PaginationProps> = ({ page, pageSize, total, onPageChange, onPageSizeChange }) => {
  if (total <= 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '0 8px' }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          0 bản ghi
        </div>
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '0 8px' }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        Hiển thị {startItem} - {endItem} trong tổng số {total} bản ghi
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {onPageSizeChange && (
          <select 
            className="input" 
            style={{ padding: '4px 8px', height: 30, fontSize: 13, width: 'auto' }}
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
            <option value={100}>100 / trang</option>
          </select>
        )}
        <div style={{ display: 'flex', gap: 4 }}>
          <button 
            className="btn btn-outline" 
            style={{ padding: '4px 10px', height: 30 }}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Trước
          </button>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 12px', fontSize: 13, fontWeight: 500, backgroundColor: 'var(--bg-secondary)', borderRadius: 4 }}>
            Trang {page} / {totalPages}
          </span>
          <button 
            className="btn btn-outline" 
            style={{ padding: '4px 10px', height: 30 }}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  )
}
