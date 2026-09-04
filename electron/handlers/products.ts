import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
import { logAudit } from '../db'
import { session } from '../session'

export function registerProductHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('products:getAll', (_, filters: any = {}) => {
    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1
    `
    const params: any[] = []
    if (filters.category_id) {
      query += ' AND p.category_id = ?'
      params.push(filters.category_id)
    }
    if (filters.search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)'
      const s = `%${filters.search}%`
      params.push(s, s, s)
    }
    query += ' ORDER BY p.name'
    if (filters.page && filters.pageSize) {
      const countQuery = 'SELECT COUNT(*) as total FROM (' + query + ')'
      const total = (db.prepare(countQuery).get(...params) as any).total
      query += ' LIMIT ? OFFSET ?'
      const data = db.prepare(query).all(...params, filters.pageSize, (filters.page - 1) * filters.pageSize)
      return { data, total, page: filters.page, pageSize: filters.pageSize, totalPages: Math.ceil(total / filters.pageSize) }
    }
    return db.prepare(query).all(...params)
  })

  ipcMain.handle('products:getById', (_, id: number) => {
    return db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id)
  })

  ipcMain.handle('products:search', (_, query: string) => {
    const s = `%${query}%`
    return db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1 AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)
      LIMIT 20
    `).all(s, s, s)
  })

  ipcMain.handle('products:create', (_, data: any) => {
    try {
      const minStock = data.min_stock !== undefined && data.min_stock !== null && data.min_stock !== '' && !isNaN(Number(data.min_stock))
        ? Math.max(0, parseInt(data.min_stock, 10))
        : 5

      let sku = data.sku && String(data.sku).trim() !== '' ? String(data.sku).trim() : null
      let barcode = data.barcode && String(data.barcode).trim() !== '' ? String(data.barcode).trim() : null

      if (!sku && !barcode) {
        const maxRow = db.prepare('SELECT MAX(id) as maxId FROM products').get() as any
        let nextId = (maxRow?.maxId || 0) + 1
        sku = `SP${String(nextId).padStart(6, '0')}`
        while (db.prepare('SELECT id FROM products WHERE sku = ? OR barcode = ?').get(sku, sku)) {
          nextId++
          sku = `SP${String(nextId).padStart(6, '0')}`
        }
        barcode = sku
      } else if (!sku && barcode) {
        sku = barcode
      } else if (sku && !barcode) {
        barcode = sku
      }

      const result = db.prepare(`
        INSERT INTO products (category_id, name, sku, barcode, description, unit, cost_price, sell_price, wholesale_price, stock_quantity, min_stock, image_path, is_imei)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.category_id || null,
        data.name,
        sku,
        barcode,
        data.description || '',
        data.unit || 'cái',
        data.cost_price || 0,
        data.sell_price || 0,
        data.wholesale_price || null,
        data.stock_quantity || 0,
        minStock,
        data.image_path || null,
        data.is_imei ? 1 : 0
      )
      logAudit(db, {
        action: 'Thêm sản phẩm',
        entity: 'products',
        entity_id: Number(result.lastInsertRowid),
        details: `Thêm sản phẩm mới "${data.name}" (SKU: ${sku}, Barcode: ${barcode}, Giá bán: ${new Intl.NumberFormat('vi-VN').format(data.sell_price || 0)}đ, Tồn: ${data.stock_quantity || 0}, Tồn tối thiểu: ${minStock}, Phân loại: ${data.is_imei ? 'Thiết bị IMEI' : 'Phụ kiện'})`
      })
      return { success: true, id: result.lastInsertRowid }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('products:update', (_, data: any) => {
    try {
      const oldProduct = db.prepare('SELECT * FROM products WHERE id=?').get(data.id) as any

      let sku = data.sku && String(data.sku).trim() !== '' ? String(data.sku).trim() : null
      let barcode = data.barcode && String(data.barcode).trim() !== '' ? String(data.barcode).trim() : null
      if (!sku && !barcode) {
        sku = `SP${String(data.id).padStart(6, '0')}`
        barcode = sku
      } else if (!sku && barcode) {
        sku = barcode
      } else if (sku && !barcode) {
        barcode = sku
      }

      const minStock = data.min_stock !== undefined && data.min_stock !== null && data.min_stock !== '' && !isNaN(Number(data.min_stock))
        ? Math.max(0, parseInt(data.min_stock, 10))
        : (oldProduct?.min_stock ?? 5)
      if (data.stock_quantity !== undefined) {
        db.prepare(`
          UPDATE products SET 
            category_id=?, name=?, sku=?, barcode=?, description=?, unit=?,
            cost_price=?, sell_price=?, wholesale_price=?, min_stock=?, image_path=?,
            stock_quantity=?, is_imei=?,
            updated_at=datetime('now', '+7 hours')
          WHERE id=?
        `).run(
          data.category_id || null,
          data.name,
          data.sku || null,
          data.barcode || null,
          data.description || '',
          data.unit || 'cái',
          data.cost_price || 0,
          data.sell_price || 0,
          data.wholesale_price || null,
          minStock,
          data.image_path || null,
          data.stock_quantity,
          data.is_imei ? 1 : 0,
          data.id
        )
      } else {
        db.prepare(`
          UPDATE products SET 
            category_id=?, name=?, sku=?, barcode=?, description=?, unit=?,
            cost_price=?, sell_price=?, wholesale_price=?, min_stock=?, image_path=?,
            is_imei=?,
            updated_at=datetime('now', '+7 hours')
          WHERE id=?
        `).run(
          data.category_id || null,
          data.name,
          data.sku || null,
          data.barcode || null,
          data.description || '',
          data.unit || 'cái',
          data.cost_price || 0,
          data.sell_price || 0,
          data.wholesale_price || null,
          minStock,
          data.image_path || null,
          data.is_imei ? 1 : 0,
          data.id
        )
      }

      const changes: string[] = []
      if (oldProduct) {
        if (oldProduct.name !== data.name) changes.push(`Tên: "${oldProduct.name}" ➔ "${data.name}"`)
        if (Number(oldProduct.sell_price) !== Number(data.sell_price)) {
          changes.push(`Giá bán: ${new Intl.NumberFormat('vi-VN').format(oldProduct.sell_price)}đ ➔ ${new Intl.NumberFormat('vi-VN').format(data.sell_price)}đ`)
        }
        if (Number(oldProduct.cost_price) !== Number(data.cost_price)) {
          changes.push(`Giá vốn: ${new Intl.NumberFormat('vi-VN').format(oldProduct.cost_price)}đ ➔ ${new Intl.NumberFormat('vi-VN').format(data.cost_price)}đ`)
        }
        if (oldProduct.min_stock !== minStock) {
          changes.push(`Tồn tối thiểu: ${oldProduct.min_stock} ➔ ${minStock}`)
        }
        if (data.stock_quantity !== undefined && oldProduct.stock_quantity !== data.stock_quantity) {
          changes.push(`Tồn kho: ${oldProduct.stock_quantity} ➔ ${data.stock_quantity}`)
        }
      }
      const changeDetails = changes.length > 0 ? changes.join('; ') : 'Cập nhật thông tin sản phẩm'

      logAudit(db, {
        action: 'Cập nhật sản phẩm',
        entity: 'products',
        entity_id: data.id,
        details: `Cập nhật "${data.name}" (#${data.id}): ${changeDetails}`
      })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('products:delete', (_, id: number) => {
    try {
      session.requireAdmin()
      const prod = db.prepare('SELECT name FROM products WHERE id=?').get(id) as any
      db.prepare(`
        UPDATE products 
        SET active = 0, 
            sku = sku || '_deleted_' || id, 
            barcode = CASE WHEN barcode IS NOT NULL THEN barcode || '_deleted_' || id ELSE NULL END 
        WHERE id = ?
      `).run(id)
      logAudit(db, {
        action: 'Xóa sản phẩm',
        entity: 'products',
        entity_id: id,
        details: `Chuyển sản phẩm "${prod?.name || `#${id}`}" vào thùng rác`
      })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('products:getDeleted', () => {
    return db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 0
      ORDER BY p.updated_at DESC
    `).all()
  })

  ipcMain.handle('products:restore', (_, id: number) => {
    try {
      session.requireAdmin()
      const p = db.prepare('SELECT sku, barcode FROM products WHERE id=?').get(id) as any
      if (!p) return { success: false, message: 'Không tìm thấy sản phẩm' }
      let newSku = p.sku ? p.sku.replace(/_deleted_\d+$/, '') : null
      let newBarcode = p.barcode ? p.barcode.replace(/_deleted_\d+$/, '') : null
      db.prepare(`
        UPDATE products 
        SET active = 1, sku = ?, barcode = ?, updated_at = datetime('now', '+7 hours') 
        WHERE id = ?
      `).run(newSku, newBarcode, id)
      logAudit(db, {
        action: 'Khôi phục sản phẩm',
        entity: 'products',
        entity_id: id,
        details: `Khôi phục sản phẩm ID #${id} từ thùng rác`
      })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: 'Mã SKU hoặc Barcode gốc đã được sử dụng cho sản phẩm khác!' }
    }
  })

  ipcMain.handle('products:hardDelete', (_, id: number) => {
    session.requireAdmin()
    const transaction = db.transaction(() => {
      db.prepare('UPDATE order_items SET product_id = NULL WHERE product_id = ?').run(id)
      db.prepare('UPDATE purchase_order_items SET product_id = NULL WHERE product_id = ?').run(id)
      db.prepare('DELETE FROM stock_movements WHERE product_id = ?').run(id)
      db.prepare('DELETE FROM products WHERE id = ?').run(id)
      logAudit(db, {
        action: 'Xóa vĩnh viễn sản phẩm',
        entity: 'products',
        entity_id: id,
        details: `Xóa hoàn toàn sản phẩm ID #${id} khỏi hệ thống`
      })
    })
    try {
      transaction()
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('products:getLowStock', () => {
    return db.prepare(`
      SELECT p.*, c.name as category_name FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = 1 AND p.stock_quantity <= p.min_stock
      ORDER BY p.stock_quantity ASC
    `).all()
  })

  ipcMain.handle('products:getImeis', (_, productId: number) => {
    return db.prepare('SELECT * FROM product_imeis WHERE product_id = ? ORDER BY status ASC, created_at DESC').all(productId)
  })

  ipcMain.handle('products:addImeis', (_, { productId, imeis, warrantyMonths, userId, costPrice, price, capacity, color, condition }: any) => {
    const insert = db.prepare(`
      INSERT INTO product_imeis (product_id, imei, status, warranty_months, capacity, color, condition, price, cost_price)
      VALUES (?, ?, 'available', ?, ?, ?, ?, ?, ?)
    `)
    const updateStock = db.prepare(`
      UPDATE products 
      SET stock_quantity = (SELECT COUNT(*) FROM product_imeis WHERE product_id = ? AND status = 'available') 
      WHERE id = ?
    `)
    const product = db.prepare('SELECT name, stock_quantity FROM products WHERE id = ?').get(productId) as any
    if (!product) return { success: false, message: 'Sản phẩm không tồn tại' }

    const runTx = db.transaction((list: string[]) => {
      let count = 0
      for (const imei of list) {
        const cleaned = imei.trim()
        if (!cleaned) continue
        insert.run(
          productId, 
          cleaned, 
          warrantyMonths || 12,
          capacity || null,
          color || null,
          condition || null,
          price || null,
          costPrice || null
        )
        count++
      }
      const newQty = (product.stock_quantity || 0) + count
      updateStock.run(productId, productId)
      db.prepare(`
        INSERT INTO stock_movements (product_id, product_name, type, quantity, quantity_before, quantity_after, unit_cost, total_cost, reference_type, note, user_id)
        VALUES (?, ?, 'in', ?, ?, ?, ?, ?, 'adjust', ?, ?)
      `).run(
        productId,
        product.name,
        count,
        product.stock_quantity || 0,
        newQty,
        costPrice || 0,
        (costPrice || 0) * count,
        `Nhập ${count} máy (${capacity || ''} ${color || ''} ${condition || ''})`,
        userId || null
      )
      
      const detailsArr = []
      if (capacity) detailsArr.push(capacity)
      if (color) detailsArr.push(color)
      if (condition) detailsArr.push(condition)
      if (price) detailsArr.push(`Giá: ${new Intl.NumberFormat('vi-VN').format(price)}đ`)
      const specString = detailsArr.length > 0 ? ` [${detailsArr.join(' - ')}]` : ''

      logAudit(db, {
        user_id: userId || null,
        action: 'Nhập mã IMEI',
        entity: 'products',
        entity_id: productId,
        details: `Nhập +${count} máy "${product.name}"${specString} (Tồn: ${product.stock_quantity || 0} ➔ ${newQty})`
      })
      return { success: true, count }
    })

    try {
      return runTx(imeis)
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('products:deleteImei', (_, id: number) => {
    try {
      const imeiObj = db.prepare('SELECT product_id, imei, status FROM product_imeis WHERE id = ?').get(id) as any
      if (!imeiObj) return { success: false, message: 'Không tìm thấy IMEI' }
      if (imeiObj.status !== 'available') return { success: false, message: 'Chỉ có thể xóa IMEI đang ở trạng thái khả dụng' }
      const productId = imeiObj.product_id
      const product = db.prepare('SELECT name, stock_quantity FROM products WHERE id = ?').get(productId) as any

      const deleteTx = db.transaction(() => {
        db.prepare('DELETE FROM product_imeis WHERE id = ?').run(id)
        db.prepare(`
          UPDATE products 
          SET stock_quantity = (SELECT COUNT(*) FROM product_imeis WHERE product_id = ? AND status = 'available') 
          WHERE id = ?
        `).run(productId, productId)
        if (product) {
          db.prepare(`
            INSERT INTO stock_movements (product_id, product_name, type, quantity, quantity_before, quantity_after, reference_type, note)
            VALUES (?, ?, 'adjust', -1, ?, ?, 'adjust', ?)
          `).run(
            productId,
            product.name,
            product.stock_quantity || 0,
            Math.max(0, (product.stock_quantity || 0) - 1),
            `Xóa IMEI khả dụng: ${imeiObj.imei}`
          )
        }
      })
      deleteTx()
      logAudit(db, {
        action: 'Xóa mã IMEI',
        entity: 'products',
        entity_id: productId,
        details: `Xóa mã IMEI "${imeiObj.imei}" của sản phẩm "${product?.name || `#${productId}`}"`
      })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })
}
