import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
import { logAudit } from '../db'
import { session } from '../session'

export function registerCustomerHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('customers:getAll', (_, filters: any = {}) => {
    let query = 'SELECT * FROM customers WHERE active = 1'
    const params: any[] = []
    if (filters.search) {
      query += ' AND (name LIKE ? OR phone LIKE ?)'
      const s = `%${filters.search}%`
      params.push(s, s)
    }
    if (filters.group) {
      query += ' AND customer_group = ?'
      params.push(filters.group)
    }
    query += ' ORDER BY name'
    return db.prepare(query).all(...params)
  })

  ipcMain.handle('customers:getById', (_, id: number) => {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any
    if (!customer) return null
    const orders = db.prepare(`
      SELECT o.*, COUNT(oi.id) as item_count FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.customer_id = ? AND o.status = 'completed'
      GROUP BY o.id ORDER BY o.created_at DESC LIMIT 20
    `).all(id)
    return { ...customer, orders }
  })

  ipcMain.handle('customers:search', (_, query: string) => {
    const s = `%${query}%`
    return db.prepare(
      'SELECT * FROM customers WHERE active=1 AND (name LIKE ? OR phone LIKE ?) LIMIT 10'
    ).all(s, s)
  })

  ipcMain.handle('customers:create', (_, data: any) => {
    try {
      const result = db.prepare(`
        INSERT INTO customers (name, phone, email, address, birthday, gender, customer_group, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.name,
        data.phone || '',
        data.email || '',
        data.address || '',
        data.birthday || null,
        data.gender || null,
        data.customer_group || 'regular',
        data.note || ''
      )
      logAudit(db, {
        action: 'Thêm khách hàng',
        entity: 'customers',
        entity_id: Number(result.lastInsertRowid),
        details: `Thêm khách hàng mới "${data.name}" (SĐT: ${data.phone || 'Không có SĐT'}, Nhóm: ${data.customer_group || 'Khách thường'}${data.address ? `, ĐC: ${data.address}` : ''})`
      })
      return { success: true, id: result.lastInsertRowid }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('customers:update', (_, data: any) => {
    try {
      const oldCust = db.prepare('SELECT * FROM customers WHERE id=?').get(data.id) as any

      db.prepare(`
        UPDATE customers SET name=?, phone=?, email=?, address=?, birthday=?, gender=?, customer_group=?, note=?, updated_at=datetime('now', '+7 hours') WHERE id=?
      `).run(
        data.name,
        data.phone || '',
        data.email || '',
        data.address || '',
        data.birthday || null,
        data.gender || null,
        data.customer_group || 'regular',
        data.note || '',
        data.id
      )

      const changes: string[] = []
      if (oldCust) {
        if (oldCust.name !== data.name) changes.push(`Tên: "${oldCust.name}" ➔ "${data.name}"`)
        if ((oldCust.phone || '') !== (data.phone || '')) changes.push(`SĐT: "${oldCust.phone || 'Trống'}" ➔ "${data.phone || 'Trống'}"`)
        if ((oldCust.address || '') !== (data.address || '')) changes.push(`Địa chỉ: "${oldCust.address || 'Trống'}" ➔ "${data.address || 'Trống'}"`)
        if ((oldCust.customer_group || 'regular') !== (data.customer_group || 'regular')) changes.push(`Nhóm: ${oldCust.customer_group} ➔ ${data.customer_group}`)
        if ((oldCust.note || '') !== (data.note || '')) changes.push(`Ghi chú đã thay đổi`)
      }
      const changeText = changes.length > 0 ? changes.join('; ') : 'Cập nhật thông tin liên hệ'

      logAudit(db, {
        action: 'Cập nhật khách hàng',
        entity: 'customers',
        entity_id: data.id,
        details: `Cập nhật khách hàng #${data.id} "${data.name}": ${changeText}`
      })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('customers:delete', (_, id: number) => {
    try {
      session.requireAdmin()
      const cust = db.prepare('SELECT name FROM customers WHERE id=?').get(id) as any
      db.prepare('UPDATE customers SET active=0 WHERE id=?').run(id)
      logAudit(db, {
        action: 'Xóa khách hàng',
        entity: 'customers',
        entity_id: id,
        details: `Ngừng hoạt động khách hàng "${cust?.name || `#${id}`}"`
      })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('customers:payDebt', (_, { id, amount, note }: any) => {
    try {
      const amt = parseFloat(amount) || 0
      if (amt <= 0) return { success: false, message: 'Số tiền thanh toán nợ không hợp lệ' }
      const cust = db.prepare('SELECT name, debt FROM customers WHERE id=?').get(id) as any
      db.prepare(`
        UPDATE customers 
        SET debt = CASE WHEN debt - ? < 0 THEN 0 ELSE debt - ? END,
            note = CASE WHEN ? != '' THEN COALESCE(note, '') || x'0A' || '[' || datetime('now', '+7 hours') || '] Thu nợ ' || ? || 'đ: ' || ? ELSE note END,
            updated_at = datetime('now', '+7 hours') 
        WHERE id = ?
      `).run(amt, amt, note || '', amt, note || '', id)
      logAudit(db, {
        action: 'Thu nợ khách hàng',
        entity: 'customers',
        entity_id: id,
        details: `Khách hàng "${cust?.name || `#${id}`}" trả nợ: ${new Intl.NumberFormat('vi-VN').format(amt)}đ (Nợ cũ: ${new Intl.NumberFormat('vi-VN').format(cust?.debt || 0)}đ -> Còn lại: ${new Intl.NumberFormat('vi-VN').format(Math.max(0, (cust?.debt || 0) - amt))}đ). Ghi chú: ${note || 'Không có'}`
      })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })
}
