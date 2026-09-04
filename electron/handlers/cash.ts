import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
import { logAudit } from '../db'

export function registerCashHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('cash:getAll', (_, filters: any = {}) => {
    let query = `
      SELECT ct.*, u.name as staff_name
      FROM cash_transactions ct
      LEFT JOIN users u ON ct.staff_id = u.id
      WHERE 1=1
    `
    const params: any[] = []
    if (filters.type) {
      query += ' AND ct.type = ?'
      params.push(filters.type)
    }
    if (filters.date_from) {
      query += ' AND date(ct.created_at) >= ?'
      params.push(filters.date_from)
    }
    if (filters.date_to) {
      query += ' AND date(ct.created_at) <= ?'
      params.push(filters.date_to)
    }
    query += ' ORDER BY ct.created_at DESC'
    if (filters.limit) {
      query += ' LIMIT ?'
      params.push(filters.limit)
    }
    return db.prepare(query).all(...params)
  })

  ipcMain.handle('cash:create', (_, data: any) => {
    try {
      const amount = parseFloat(data.amount) || 0
      if (amount <= 0) return { success: false, message: 'Số tiền phải lớn hơn 0' }
      if (!data.category) return { success: false, message: 'Vui lòng nhập lý do / danh mục thu chi' }

      const result = db.prepare(`
        INSERT INTO cash_transactions (type, amount, category, note, staff_id, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now', '+7 hours'))
      `).run(
        data.type || 'in',
        amount,
        data.category,
        data.note || '',
        data.staff_id || null
      )

      logAudit(db, {
        user_id: data.staff_id || null,
        action: data.type === 'in' ? 'Tạo phiếu thu (+)' : 'Tạo phiếu chi (-)',
        entity: 'cash',
        entity_id: Number(result.lastInsertRowid),
        details: `${data.type === 'in' ? 'Thu' : 'Chi'} ${new Intl.NumberFormat('vi-VN').format(amount)}đ. Lý do: "${data.category}". Ghi chú: ${data.note || 'Không'}`
      })

      return { success: true, id: result.lastInsertRowid }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('cash:getTodaySummary', () => {
    const inTotal = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM cash_transactions WHERE type = 'in' AND date(created_at) = date('now', '+7 hours')").get() as any
    const outTotal = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM cash_transactions WHERE type = 'out' AND date(created_at) = date('now', '+7 hours')").get() as any
    return {
      total_in: inTotal.total,
      total_out: outTotal.total,
      balance: inTotal.total - outTotal.total
    }
  })
}
