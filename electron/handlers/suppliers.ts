import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
import { logAudit } from '../db'
import { session } from '../session'

export function registerSupplierHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('suppliers:getAll', () => {
    return db.prepare('SELECT * FROM suppliers WHERE active=1 ORDER BY name').all()
  })

  ipcMain.handle('suppliers:create', (_, data: any) => {
    try {
      const result = db.prepare(`
        INSERT INTO suppliers (name, phone, email, address, tax_code, contact_person, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.name,
        data.phone || '',
        data.email || '',
        data.address || '',
        data.tax_code || '',
        data.contact_person || '',
        data.note || ''
      )
      logAudit(db, {
        action: 'Thêm nhà cung cấp',
        entity: 'suppliers',
        entity_id: Number(result.lastInsertRowid),
        details: `Thêm nhà cung cấp mới "${data.name}" (${data.phone || 'Không SĐT'})`
      })
      return { success: true, id: result.lastInsertRowid }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('suppliers:update', (_, data: any) => {
    try {
      db.prepare(`
        UPDATE suppliers SET name=?, phone=?, email=?, address=?, tax_code=?, contact_person=?, note=?, updated_at=datetime('now', '+7 hours') WHERE id=?
      `).run(
        data.name,
        data.phone || '',
        data.email || '',
        data.address || '',
        data.tax_code || '',
        data.contact_person || '',
        data.note || '',
        data.id
      )
      logAudit(db, {
        action: 'Cập nhật nhà cung cấp',
        entity: 'suppliers',
        entity_id: data.id,
        details: `Cập nhật thông tin nhà cung cấp "${data.name}"`
      })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('suppliers:delete', (_, id: number) => {
    try {
      session.requireAdmin()
      const sup = db.prepare('SELECT name FROM suppliers WHERE id=?').get(id) as any
      db.prepare('UPDATE suppliers SET active=0 WHERE id=?').run(id)
      logAudit(db, {
        action: 'Xóa nhà cung cấp',
        entity: 'suppliers',
        entity_id: id,
        details: `Ngừng hoạt động nhà cung cấp "${sup?.name || `#${id}`}"`
      })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })
}
