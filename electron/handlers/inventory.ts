import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
import { logAudit } from '../db'

export function registerInventoryHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('inventory:addStock', (_, data: any) => {
    const addStock = db.transaction(() => {
      const product = db.prepare('SELECT * FROM products WHERE id=?').get(data.product_id) as any
      if (!product) return { success: false, message: 'Sản phẩm không tồn tại' }
      const newQty = product.stock_quantity + data.quantity
      db.prepare("UPDATE products SET stock_quantity=?, updated_at=datetime('now', '+7 hours') WHERE id=?").run(newQty, data.product_id)
      db.prepare(`
        INSERT INTO stock_movements (product_id, product_name, type, quantity, quantity_before, quantity_after, unit_cost, total_cost, reference_type, supplier_id, note, user_id)
        VALUES (?, ?, 'in', ?, ?, ?, ?, ?, 'manual', ?, ?, ?)
      `).run(
        data.product_id,
        product.name,
        data.quantity,
        product.stock_quantity,
        newQty,
        data.unit_cost || 0,
        (data.unit_cost || 0) * data.quantity,
        data.supplier_id || null,
        data.note || '',
        data.user_id || null
      )

      let supplierText = ''
      if (data.supplier_id) {
        const sup = db.prepare('SELECT name FROM suppliers WHERE id=?').get(data.supplier_id) as any
        if (sup) supplierText = ` | NCC: ${sup.name}`
      }
      const totalCost = (data.unit_cost || 0) * data.quantity

      logAudit(db, {
        user_id: data.user_id || null,
        action: 'Nhập hàng vào kho',
        entity: 'inventory',
        entity_id: data.product_id,
        details: `Nhập kho +${data.quantity} "${product.name}" (Tồn: ${product.stock_quantity} ➔ ${newQty}) | Đơn giá: ${new Intl.NumberFormat('vi-VN').format(data.unit_cost || 0)}đ | Tổng vốn: ${new Intl.NumberFormat('vi-VN').format(totalCost)}đ${supplierText}${data.note ? ` | Ghi chú: ${data.note}` : ''}`
      })

      return { success: true, new_quantity: newQty }
    })

    try {
      return addStock()
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('inventory:getMovements', (_, filters: any = {}) => {
    let query = `
      SELECT sm.*, p.name as product_name_ref, s.name as supplier_name, u.name as user_name
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN suppliers s ON sm.supplier_id = s.id
      LEFT JOIN users u ON sm.user_id = u.id
    `
    const where: string[] = ['1=1']
    const params: any[] = []
    if (filters.product_id) {
      where.push('sm.product_id = ?')
      params.push(filters.product_id)
    }
    if (filters.type) {
      where.push('sm.type = ?')
      params.push(filters.type)
    }
    if (filters.date_from) {
      where.push('date(sm.created_at) >= ?')
      params.push(filters.date_from)
    }
    if (filters.date_to) {
      where.push('date(sm.created_at) <= ?')
      params.push(filters.date_to)
    }
    query += ' WHERE ' + where.join(' AND ') + ' ORDER BY sm.created_at DESC'
    if (filters.limit) {
      query += ' LIMIT ?'
      params.push(filters.limit)
    }
    return db.prepare(query).all(...params)
  })

  ipcMain.handle('inventory:getLowStock', () => {
    return db.prepare(`
      SELECT p.*, c.name as category_name FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active=1 AND p.stock_quantity <= p.min_stock
      ORDER BY p.stock_quantity ASC
    `).all()
  })
}
