import { session } from '../session'
import { IpcMain } from 'electron'
import Database from 'better-sqlite3'

export function registerCategoryHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('categories:getAll', () => {
    return db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all()
  })

  ipcMain.handle('categories:create', (_, data: any) => {
    try {
      const result = db.prepare(`
        INSERT INTO categories (name, description, sort_order) VALUES (?, ?, ?)
      `).run(data.name, data.description || '', data.sort_order || 0)
      return { success: true, id: result.lastInsertRowid }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('categories:update', (_, data: any) => {
    try {
      db.prepare(`
        UPDATE categories SET name=?, description=?, sort_order=? WHERE id=?
      `).run(data.name, data.description || '', data.sort_order || 0, data.id)
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('categories:delete', (_, id: number) => {
    try {
      session.requireAdmin()
      const hasProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id=?').get(id) as any
      if (hasProducts.c > 0) {
        return { success: false, message: 'Danh mục có sản phẩm, không thể xóa' }
      }
      db.prepare('DELETE FROM categories WHERE id=?').run(id)
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })
}
