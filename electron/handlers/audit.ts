import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
import { logAudit } from '../db'
import { session } from '../session'

export function registerAuditHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('audit:getAll', (_, filters: any = {}) => {
    session.requireAdmin()
    let query = `
      SELECT al.*, u.role as user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `
    const params: any[] = []
    if (filters.user_id) {
      query += ' AND al.user_id = ?'
      params.push(filters.user_id)
    }
    if (filters.action) {
      query += ' AND al.action = ?'
      params.push(filters.action)
    }
    if (filters.entity) {
      query += ' AND al.entity = ?'
      params.push(filters.entity)
    }
    if (filters.date_from) {
      query += ' AND date(al.created_at) >= ?'
      params.push(filters.date_from)
    }
    if (filters.date_to) {
      query += ' AND date(al.created_at) <= ?'
      params.push(filters.date_to)
    }
    if (filters.search) {
      query += ' AND (al.details LIKE ? OR al.action LIKE ? OR al.user_name LIKE ?)'
      const s = `%${filters.search}%`
      params.push(s, s, s)
    }
    query += ' ORDER BY al.created_at DESC'
    if (filters.limit) {
      query += ' LIMIT ?'
      params.push(filters.limit)
    } else {
      query += ' LIMIT 200'
    }
    return db.prepare(query).all(...params)
  })

  ipcMain.handle('audit:log', (_, data: any) => {
    logAudit(db, data)
    return { success: true }
  })
}
