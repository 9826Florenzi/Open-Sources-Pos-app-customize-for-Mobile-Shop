import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
import { logAudit } from '../db'

export function registerInventoryHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('inventory:addStock', (_, data: any) => {
    try {
      const product = db.prepare('SELECT * FROM products WHERE id=?').get(data.product_id) as any
      if (!product) return { success: false, message: 'Sản phẩm không tồn tại' }

      if (product.is_imei === 1) {
        // Xử lý nhập kho thiết bị theo IMEI (iPhone / Điện thoại)
        let imeis: string[] = []
        if (Array.isArray(data.imeis)) {
          imeis = data.imeis.map((s: any) => String(s || '').trim()).filter(Boolean)
        } else if (typeof data.imeis === 'string') {
          imeis = data.imeis.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean)
        }

        if (imeis.length === 0) {
          return { success: false, message: 'Vui lòng nhập ít nhất một mã IMEI hợp lệ' }
        }

        // Kiểm tra trùng lặp nội bộ trong danh sách vừa nhập
        const uniqueImeis = new Set(imeis)
        if (uniqueImeis.size !== imeis.length) {
          return { success: false, message: 'Danh sách IMEI nhập vào có mã bị trùng lặp!' }
        }

        // Kiểm tra trùng lặp với CSDL
        const placeholders = imeis.map(() => '?').join(',')
        const existing = db.prepare(`SELECT imei FROM product_imeis WHERE imei IN (${placeholders})`).all(...imeis) as any[]
        if (existing.length > 0) {
          return {
            success: false,
            message: `Mã IMEI sau đã tồn tại trong hệ thống: ${existing.map(e => e.imei).join(', ')}`
          }
        }

        const addImeiStock = db.transaction(() => {
          const insertImei = db.prepare(`
            INSERT INTO product_imeis (product_id, imei, status, warranty_months, capacity, color, condition, price, cost_price)
            VALUES (?, ?, 'available', ?, ?, ?, ?, ?, ?)
          `)

          const unitCost = parseFloat(data.unit_cost) || 0
          const sellPrice = parseFloat(data.price || data.sell_price) || (product.sell_price || 0)
          const warrantyMonths = parseInt(data.warranty_months) || 12

          for (const imei of imeis) {
            insertImei.run(
              product.id,
              imei,
              warrantyMonths,
              data.capacity || null,
              data.color || null,
              data.condition || null,
              sellPrice,
              unitCost
            )
          }

          // Cập nhật số lượng tồn kho theo số lượng thực tế trong bảng product_imeis
          db.prepare(`
            UPDATE products 
            SET stock_quantity = (SELECT COUNT(*) FROM product_imeis WHERE product_id = ? AND status = 'available'),
                cost_price = CASE WHEN ? > 0 THEN ? ELSE cost_price END,
                sell_price = CASE WHEN ? > 0 THEN ? ELSE sell_price END,
                updated_at = datetime('now', '+7 hours')
            WHERE id = ?
          `).run(product.id, unitCost, unitCost, sellPrice, sellPrice, product.id)

          const updatedProd = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(product.id) as any
          const newQty = updatedProd ? updatedProd.stock_quantity : (product.stock_quantity + imeis.length)
          const count = imeis.length
          const totalCost = unitCost * count

          // Ghi nhận biến động kho
          const configParts = [data.capacity, data.color, data.condition].filter(Boolean)
          const configStr = configParts.length > 0 ? ` (${configParts.join(' - ')})` : ''
          const imeiPreview = count <= 3 ? imeis.join(', ') : `${imeis.slice(0, 3).join(', ')}... (+${count - 3} máy)`
          const movementNote = `[${count} IMEI: ${imeiPreview}]${configStr}${data.note ? ` | ${data.note}` : ''}`

          db.prepare(`
            INSERT INTO stock_movements (product_id, product_name, type, quantity, quantity_before, quantity_after, unit_cost, total_cost, reference_type, supplier_id, note, user_id)
            VALUES (?, ?, 'in', ?, ?, ?, ?, ?, 'manual', ?, ?, ?)
          `).run(
            product.id,
            product.name,
            count,
            product.stock_quantity,
            newQty,
            unitCost,
            totalCost,
            data.supplier_id || null,
            movementNote,
            data.user_id || null
          )

          let supplierText = ''
          if (data.supplier_id) {
            const sup = db.prepare('SELECT name FROM suppliers WHERE id=?').get(data.supplier_id) as any
            if (sup) supplierText = ` | NCC: ${sup.name}`
          }

          logAudit(db, {
            user_id: data.user_id || null,
            action: 'Nhập kho điện thoại (IMEI)',
            entity: 'inventory',
            entity_id: product.id,
            details: `Nhập kho +${count} máy "${product.name}" (Tồn: ${product.stock_quantity} ➔ ${newQty}) | Đơn giá vốn: ${new Intl.NumberFormat('vi-VN').format(unitCost)}đ | Tổng vốn: ${new Intl.NumberFormat('vi-VN').format(totalCost)}đ | IMEI: ${imeiPreview}${configStr}${supplierText}${data.note ? ` | Ghi chú: ${data.note}` : ''}`
          })

          return { success: true, new_quantity: newQty }
        })

        return addImeiStock()
      } else {
        // Xử lý phụ kiện / hàng hóa thông thường
        const qty = parseInt(data.quantity) || 0
        if (qty <= 0) {
          return { success: false, message: 'Số lượng nhập phải lớn hơn 0' }
        }

        const addNormalStock = db.transaction(() => {
          const newQty = product.stock_quantity + qty
          const unitCost = parseFloat(data.unit_cost) || 0
          const totalCost = unitCost * qty

          db.prepare(`
            UPDATE products 
            SET stock_quantity = ?, 
                cost_price = CASE WHEN ? > 0 THEN ? ELSE cost_price END,
                updated_at = datetime('now', '+7 hours') 
            WHERE id = ?
          `).run(newQty, unitCost, unitCost, product.id)

          db.prepare(`
            INSERT INTO stock_movements (product_id, product_name, type, quantity, quantity_before, quantity_after, unit_cost, total_cost, reference_type, supplier_id, note, user_id)
            VALUES (?, ?, 'in', ?, ?, ?, ?, ?, 'manual', ?, ?, ?)
          `).run(
            product.id,
            product.name,
            qty,
            product.stock_quantity,
            newQty,
            unitCost,
            totalCost,
            data.supplier_id || null,
            data.note || '',
            data.user_id || null
          )

          let supplierText = ''
          if (data.supplier_id) {
            const sup = db.prepare('SELECT name FROM suppliers WHERE id=?').get(data.supplier_id) as any
            if (sup) supplierText = ` | NCC: ${sup.name}`
          }

          logAudit(db, {
            user_id: data.user_id || null,
            action: 'Nhập hàng vào kho',
            entity: 'inventory',
            entity_id: product.id,
            details: `Nhập kho +${qty} "${product.name}" (Tồn: ${product.stock_quantity} ➔ ${newQty}) | Đơn giá: ${new Intl.NumberFormat('vi-VN').format(unitCost)}đ | Tổng vốn: ${new Intl.NumberFormat('vi-VN').format(totalCost)}đ${supplierText}${data.note ? ` | Ghi chú: ${data.note}` : ''}`
          })

          return { success: true, new_quantity: newQty }
        })

        return addNormalStock()
      }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('inventory:getMovements', (_, filters: any = {}) => {
    let query = `
      SELECT sm.*, p.name as product_name_ref, p.is_imei, s.name as supplier_name, u.name as user_name
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
