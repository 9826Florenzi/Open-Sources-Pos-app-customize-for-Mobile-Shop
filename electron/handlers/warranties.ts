import { IpcMain } from 'electron'
import Database from 'better-sqlite3'

export function registerWarrantyHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('warranties:check', (_, query: string) => {
    const q = (query || '').trim()
    if (!q) return null
    return db.prepare(`
      SELECT 
        pi.imei, pi.status, pi.warranty_months, pi.sold_at, pi.created_at as imported_at,
        pi.capacity, pi.color, pi.condition, pi.price, pi.cost_price,
        p.name as product_name, p.id as product_id,
        o.order_number, o.created_at as purchase_date, o.id as order_id,
        c.name as customer_name, c.phone as customer_phone, c.id as customer_id,
        u.name as seller_name
      FROM product_imeis pi
      JOIN products p ON pi.product_id = p.id
      LEFT JOIN orders o ON pi.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE pi.imei = ? OR pi.imei LIKE ?
    `).get(q, `%${q}%`)
  })

  ipcMain.handle('warranties:getAll', (_, filters: any = {}) => {
    let query = `
      SELECT 
        pi.id, pi.imei, pi.status, pi.warranty_months, pi.sold_at,
        p.name as product_name,
        o.order_number,
        c.name as customer_name, c.phone as customer_phone
      FROM product_imeis pi
      JOIN products p ON pi.product_id = p.id
      LEFT JOIN orders o ON pi.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE pi.status = 'sold'
    `
    const params: any[] = []
    if (filters.search) {
      query += ' AND (pi.imei LIKE ? OR p.name LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)'
      const s = `%${filters.search}%`
      params.push(s, s, s, s)
    }
    query += ' ORDER BY pi.sold_at DESC LIMIT 50'
    return db.prepare(query).all(...params)
  })
}
