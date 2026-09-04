import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
import { logAudit } from '../db'

export function registerOrderHandlers(ipcMain: IpcMain, db: Database.Database) {
  function generateOrderNumber() {
    const count = db.prepare("SELECT COUNT(*) as c FROM orders WHERE date(created_at) = date('now', '+7 hours')").get() as any
    const dateRow = db.prepare("SELECT strftime('%Y%m%d', 'now', '+7 hours') as d").get() as any
    return `HD${dateRow.d}${String((count.c || 0) + 1).padStart(4, '0')}`
  }

  ipcMain.handle('orders:create', (_, data: any) => {
    const createOrder = db.transaction((orderData: any) => {
      if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
        throw new Error('Giỏ hàng trống')
      }

      for (const item of orderData.items) {
        const isProduct = typeof item.product_id === 'number' && item.product_id > 0
        if (!isProduct) continue

        const product = db.prepare('SELECT id, name, stock_quantity, is_imei, active FROM products WHERE id=?').get(item.product_id) as any
        if (!product || product.active !== 1) {
          throw new Error(`Sản phẩm "${item.product_name || item.product_id}" không tồn tại hoặc đã ngừng bán`)
        }

        const quantity = Number(item.quantity) || 0
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error(`Số lượng của "${product.name}" không hợp lệ`)
        }

        if (product.is_imei) {
          if (quantity !== 1 || !item.imei) {
            throw new Error(`Sản phẩm "${product.name}" cần chọn đúng 1 mã IMEI`)
          }
          const imeiInfo = db.prepare(`
            SELECT id FROM product_imeis
            WHERE product_id = ? AND imei = ? AND status = 'available'
          `).get(product.id, item.imei) as any
          if (!imeiInfo) {
            throw new Error(`IMEI ${item.imei} không còn khả dụng trong kho`)
          }
        } else if (product.stock_quantity < quantity) {
          throw new Error(`Không đủ tồn kho cho "${product.name}". Còn ${product.stock_quantity}, cần ${quantity}`)
        }
      }

      const orderNumber = generateOrderNumber()
      const orderResult = db.prepare(`
        INSERT INTO orders (order_number, customer_id, user_id, subtotal, discount_amount, discount_percent, total_amount, payment_method, cash_received, change_amount, status, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, datetime('now', '+7 hours'))
      `).run(
        orderNumber,
        orderData.customer_id || null,
        orderData.user_id || null,
        orderData.subtotal,
        orderData.discount_amount || 0,
        orderData.discount_percent || 0,
        orderData.total_amount,
        orderData.payment_method || 'cash',
        orderData.cash_received || orderData.total_amount,
        orderData.change_amount || 0,
        orderData.note || ''
      )
      const orderId = orderResult.lastInsertRowid

      for (const item of orderData.items) {
        const isProduct = typeof item.product_id === 'number' && item.product_id > 0
        const pId = isProduct ? item.product_id : null
        const itemType = item.item_type || (item.imei ? 'phone' : (pId ? 'accessory' : 'service'))

        let expiryStr: string | null = null
        if (item.imei) {
          const imeiInfo = db.prepare('SELECT warranty_months FROM product_imeis WHERE imei = ?').get(item.imei) as any
          const warrantyMonths = imeiInfo?.warranty_months || 12
          const expiryDate = new Date()
          expiryDate.setMonth(expiryDate.getMonth() + warrantyMonths)
          expiryStr = expiryDate.toISOString().slice(0, 19).replace('T', ' ')
        }

        db.prepare(`
          INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit, quantity, unit_price, discount_amount, subtotal, cost_price, imei, warranty_expiry, item_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          orderId,
          pId,
          item.product_name,
          item.product_sku || '',
          item.unit || 'cái',
          item.quantity || 1,
          item.unit_price || 0,
          item.discount_amount || 0,
          item.subtotal || 0,
          item.cost_price || 0,
          item.imei || null,
          expiryStr,
          itemType
        )

        // Only manage inventory if it's an actual product (not a free service)
        if (pId) {
          let newQty = 0
          const product = db.prepare('SELECT stock_quantity, is_imei FROM products WHERE id=?').get(pId) as any
          if (product?.is_imei && item.imei) {
            const soldResult = db.prepare(`
              UPDATE product_imeis
              SET status = 'sold', sold_at = datetime('now', '+7 hours'), order_id = ?
              WHERE product_id = ? AND imei = ? AND status = 'available'
            `).run(orderId, pId, item.imei)
            if (soldResult.changes !== 1) {
              throw new Error(`IMEI ${item.imei} không còn khả dụng trong kho`)
            }
            db.prepare(`
              UPDATE products 
              SET stock_quantity = (SELECT COUNT(*) FROM product_imeis WHERE product_id = ? AND status = 'available'),
                  updated_at = datetime('now', '+7 hours') 
              WHERE id = ?
            `).run(pId, pId)
            const updatedProduct = db.prepare('SELECT stock_quantity FROM products WHERE id=?').get(pId) as any
            newQty = updatedProduct?.stock_quantity || 0
          } else if (!product?.is_imei) {
            newQty = (product?.stock_quantity || 0) - item.quantity
            db.prepare("UPDATE products SET stock_quantity=?, updated_at=datetime('now', '+7 hours') WHERE id=?").run(newQty, pId)
          }

          db.prepare(`
            INSERT INTO stock_movements (product_id, product_name, type, quantity, quantity_before, quantity_after, reference_type, reference_id, user_id)
            VALUES (?, ?, 'out', ?, ?, ?, 'order', ?, ?)
          `).run(
            pId,
            item.product_name,
            item.quantity,
            product?.stock_quantity || 0,
            newQty,
            orderId,
            orderData.user_id || null
          )
        }
      }

      if (orderData.customer_id) {
        const paidAmount = parseFloat(orderData.cash_received) || 0
        const debtIncrease = Math.max(0, orderData.total_amount - paidAmount)
        if (debtIncrease > 0) {
          db.prepare(`
            UPDATE customers 
            SET total_spent = total_spent + ?, 
                points = points + ?, 
                debt = debt + ?, 
                updated_at = datetime('now', '+7 hours') 
            WHERE id = ?
          `).run(orderData.total_amount, Math.floor(orderData.total_amount / 10000), debtIncrease, orderData.customer_id)
        } else {
          db.prepare(`
            UPDATE customers 
            SET total_spent = total_spent + ?, 
                points = points + ?, 
                updated_at = datetime('now', '+7 hours') 
            WHERE id = ?
          `).run(orderData.total_amount, Math.floor(orderData.total_amount / 10000), orderData.customer_id)
        }
      }

      let custName = 'Khách lẻ'
      if (orderData.customer_id) {
        const c = db.prepare('SELECT name, phone FROM customers WHERE id=?').get(orderData.customer_id) as any
        if (c) custName = `${c.name} (${c.phone || 'Không SĐT'})`
      }
      const itemsList = orderData.items.map((i: any) => `${i.product_name || i.name} (x${i.quantity}${i.imei ? ` [IMEI: ${i.imei}]` : ''} - ${new Intl.NumberFormat('vi-VN').format(i.subtotal || i.unit_price || 0)}đ)`).join('; ')
      const pmText = orderData.payment_method === 'transfer' ? 'Chuyển khoản' : orderData.payment_method === 'card' ? 'Thẻ' : 'Tiền mặt'
      logAudit(db, {
        user_id: orderData.user_id || null,
        action: 'Bán hàng (Tạo đơn hàng)',
        entity: 'orders',
        entity_id: Number(orderId),
        details: `Hóa đơn #${orderNumber} | Khách: ${custName} | Tổng: ${new Intl.NumberFormat('vi-VN').format(orderData.total_amount || 0)}đ (${pmText})${orderData.discount_amount ? ` [Giảm giá: ${new Intl.NumberFormat('vi-VN').format(orderData.discount_amount)}đ]` : ''} | Hàng (${orderData.items.length} món): ${itemsList}`
      })

      return { success: true, orderId, orderNumber }
    })

    try {
      return createOrder(data)
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('orders:getAll', (_, filters: any = {}) => {
    let query = `
      SELECT o.*, c.name as customer_name, u.name as user_name,
             COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `
    const where: string[] = ['1=1']
    const params: any[] = []
    if (filters.status) {
      where.push('o.status = ?')
      params.push(filters.status)
    }
    if (filters.user_id) {
      where.push('o.user_id = ?')
      params.push(filters.user_id)
    }
    if (filters.date_from) {
      where.push('date(o.created_at) >= ?')
      params.push(filters.date_from)
    }
    if (filters.date_to) {
      where.push('date(o.created_at) <= ?')
      params.push(filters.date_to)
    }
    if (filters.search) {
      where.push('(o.order_number LIKE ? OR c.name LIKE ?)')
      const s = `%${filters.search}%`
      params.push(s, s)
    }
    query += ' WHERE ' + where.join(' AND ')
    query += ' GROUP BY o.id ORDER BY o.created_at DESC'
    if (filters.page && filters.pageSize) {
      const countQuery = 'SELECT COUNT(*) as total FROM (' + query + ')'
      const total = (db.prepare(countQuery).get(...params) as any).total
      query += ' LIMIT ? OFFSET ?'
      const data = db.prepare(query).all(...params, filters.pageSize, (filters.page - 1) * filters.pageSize)
      return { data, total, page: filters.page, pageSize: filters.pageSize, totalPages: Math.ceil(total / filters.pageSize) }
    } else if (filters.limit) {
      query += ' LIMIT ?'
      params.push(filters.limit)
    }
    return db.prepare(query).all(...params)
  })

  ipcMain.handle('orders:getById', (_, id: number) => {
    const order = db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone, u.name as user_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `).get(id) as any
    if (!order) return null
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id)
    return order
  })

  ipcMain.handle('orders:getTodaySummary', () => {
    return db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN payment_method='cash' THEN total_amount ELSE 0 END), 0) as cash_revenue,
        COALESCE(SUM(CASE WHEN payment_method='transfer' THEN total_amount ELSE 0 END), 0) as transfer_revenue,
        COALESCE(SUM(discount_amount), 0) as total_discount
      FROM orders 
      WHERE date(created_at) = date('now', '+7 hours') AND status = 'completed'
    `).get()
  })

  ipcMain.handle('orders:cancel', (_, id: number) => {
    const cancelOrder = db.transaction(() => {
      const order = db.prepare('SELECT * FROM orders WHERE id=?').get(id) as any
      if (!order || order.status !== 'completed') {
        return { success: false, message: 'Không thể hủy đơn hàng này' }
      }
      const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(id) as any[]
      for (const item of items) {
        if (item.product_id) {
          const product = db.prepare('SELECT stock_quantity, is_imei FROM products WHERE id=?').get(item.product_id) as any
          let quantityAfter = product?.stock_quantity || 0
          if (product?.is_imei && item.imei) {
            db.prepare("UPDATE product_imeis SET status = 'available', sold_at = NULL, order_id = NULL WHERE imei = ?").run(item.imei)
            db.prepare(`
              UPDATE products 
              SET stock_quantity = (SELECT COUNT(*) FROM product_imeis WHERE product_id = ? AND status = 'available'),
                  updated_at = datetime('now', '+7 hours') 
              WHERE id = ?
            `).run(item.product_id, item.product_id)
            const updatedProduct = db.prepare('SELECT stock_quantity FROM products WHERE id=?').get(item.product_id) as any
            quantityAfter = updatedProduct?.stock_quantity || 0
          } else if (!product?.is_imei) {
            const newQty = (product?.stock_quantity || 0) + item.quantity
            db.prepare("UPDATE products SET stock_quantity=?, updated_at=datetime('now', '+7 hours') WHERE id=?").run(newQty, item.product_id)
            quantityAfter = newQty
          }

          db.prepare(`
            INSERT INTO stock_movements (product_id, product_name, type, quantity, quantity_before, quantity_after, reference_type, reference_id, user_id, note)
            VALUES (?, ?, 'in', ?, ?, ?, 'cancel_order', ?, ?, ?)
          `).run(
            item.product_id,
            item.product_name,
            item.quantity,
            product?.stock_quantity || 0,
            quantityAfter,
            id,
            order.user_id || null,
            `Hoàn kho khi hủy đơn ${order.order_number}`
          )
        }
      }
      db.prepare("UPDATE orders SET status='cancelled' WHERE id=?").run(id)
      if (order.customer_id) {
        const paidAmount = parseFloat(order.cash_received) || 0
        const debtIncrease = Math.max(0, order.total_amount - paidAmount)
        db.prepare(`
          UPDATE customers
          SET total_spent = CASE WHEN total_spent - ? < 0 THEN 0 ELSE total_spent - ? END,
              points = CASE WHEN points - ? < 0 THEN 0 ELSE points - ? END,
              debt = CASE WHEN debt - ? < 0 THEN 0 ELSE debt - ? END,
              updated_at = datetime('now', '+7 hours')
          WHERE id=?
        `).run(
          order.total_amount,
          order.total_amount,
          Math.floor(order.total_amount / 10000),
          Math.floor(order.total_amount / 10000),
          debtIncrease,
          debtIncrease,
          order.customer_id
        )
      }

      logAudit(db, {
        action: 'Hủy đơn hàng',
        entity: 'orders',
        entity_id: id,
        details: `Hủy đơn hàng #${order.order_number} (Trị giá: ${new Intl.NumberFormat('vi-VN').format(order.total_amount || 0)}đ) - Đã hoàn kho toàn bộ sản phẩm & khôi phục mã IMEI`
      })

      return { success: true }
    })

    try {
      return cancelOrder()
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })
}
