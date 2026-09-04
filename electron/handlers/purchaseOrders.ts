import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
import { logAudit } from '../db'
import { session } from '../session'

export function registerPurchaseOrderHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('po:getAll', (_, filters: any = {}) => {
    let query = `
      SELECT po.*, s.name as supplier_name, u.name as user_name,
             COUNT(poi.id) as item_count
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.user_id = u.id
      LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (filters.status) {
      query += ' AND po.status = ?'
      params.push(filters.status)
    }

    query += ' GROUP BY po.id ORDER BY po.created_at DESC'
    return db.prepare(query).all(...params)
  })

  ipcMain.handle('po:create', (_, data: any) => {
    try {
      session.requireAdmin()
      const user = session.getUser()
      const userId = user ? user.id : null
      
      const transaction = db.transaction(() => {
        // Generate order number
        const row = db.prepare("SELECT strftime('%Y%m%d', 'now', '+7 hours') as d").get() as any
        const dateStr = row.d
        const countRow = db.prepare("SELECT COUNT(*) as c FROM purchase_orders WHERE date(created_at) = date('now', '+7 hours')").get() as any
        const seq = String(countRow.c + 1).padStart(3, '0')
        const orderNumber = `PO${dateStr}${seq}`

        // Insert PO
        const insertPo = db.prepare(`
          INSERT INTO purchase_orders (order_number, supplier_id, user_id, total_amount, paid_amount, status, note)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        const result = insertPo.run(
          orderNumber,
          data.supplier_id || null,
          userId,
          data.total_amount || 0,
          data.paid_amount || 0,
          data.status || 'draft',
          data.note || ''
        )
        const poId = result.lastInsertRowid

        // Insert items
        const insertItem = db.prepare(`
          INSERT INTO purchase_order_items (purchase_order_id, product_id, product_name, quantity, unit_cost, subtotal)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        
        for (const item of data.items) {
          insertItem.run(
            poId,
            item.product_id,
            item.product_name,
            item.quantity,
            item.unit_cost,
            item.quantity * item.unit_cost
          )

          // If status is completed, update stock and supplier debt
          if (data.status === 'completed') {
            // Add stock
            db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(item.quantity, item.product_id)
            
            // Stock movement
            db.prepare(`
              INSERT INTO stock_movements (product_id, product_name, type, quantity, unit_cost, total_cost, reference_type, reference_id, supplier_id, note, user_id)
              VALUES (?, ?, 'in', ?, ?, ?, 'purchase', ?, ?, ?, ?)
            `).run(
              item.product_id,
              item.product_name,
              item.quantity,
              item.unit_cost,
              item.quantity * item.unit_cost,
              poId,
              data.supplier_id || null,
              `Nhập hàng theo phiếu ${orderNumber}`,
              userId
            )
          }
        }

        // Supplier debt
        if (data.status === 'completed' && data.supplier_id) {
          const debtIncrease = (data.total_amount || 0) - (data.paid_amount || 0)
          if (debtIncrease > 0) {
            db.prepare('UPDATE suppliers SET debt = debt + ? WHERE id = ?').run(debtIncrease, data.supplier_id)
          }
        }

        logAudit(db, {
          user_id: userId,
          action: 'Nhập hàng',
          entity: 'purchase_orders',
          entity_id: Number(poId),
          details: `Tạo phiếu nhập ${orderNumber} | Tổng: ${data.total_amount} | TT: ${data.status}`
        })

        return poId
      })

      const id = transaction()
      return { success: true, id }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })
}
