import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
import { logAudit } from '../db'

export function registerRepairHandlers(ipcMain: IpcMain, db: Database.Database) {
  function generateTicketNumber() {
    const count = db.prepare("SELECT COUNT(*) as c FROM repair_tickets WHERE date(created_at) = date('now', '+7 hours')").get() as any
    const dateRow = db.prepare("SELECT strftime('%Y%m%d', 'now', '+7 hours') as d").get() as any
    return `SC${dateRow.d}${String((count.c || 0) + 1).padStart(3, '0')}`
  }

  function updateTotalFee(ticketId: number) {
    const sumResult = db.prepare('SELECT COALESCE(SUM(line_total), 0) as total FROM repair_lines WHERE ticket_id = ?').get(ticketId) as any
    db.prepare(`
      UPDATE repair_tickets 
      SET total_fee = ?, total_amount = ?, updated_at = datetime('now', '+7 hours') 
      WHERE id = ?
    `).run(sumResult.total, sumResult.total, ticketId)
  }

  ipcMain.handle('repair:getAll', (_, filters: any = {}) => {
    let query = `
      SELECT rt.*,
             COALESCE(rt.total_fee, rt.total_amount, 0) as total_fee,
             COALESCE(rt.deposit_paid, rt.paid_amount, 0) as deposit_paid,
             COALESCE(rt.note, rt.notes, '') as note,
             COALESCE(rt.staff_id, rt.user_id) as staff_id,
             COALESCE(rt.completed_at, rt.resolved_at) as completed_at,
             u.name as staff_name,
             (SELECT COUNT(*) FROM repair_lines rl WHERE rl.ticket_id = rt.id) as line_count
      FROM repair_tickets rt
      LEFT JOIN users u ON COALESCE(rt.staff_id, rt.user_id) = u.id
      WHERE 1=1
    `
    const params: any[] = []
    if (filters.status) {
      query += ' AND rt.status = ?'
      params.push(filters.status)
    }
    if (filters.search) {
      query += ' AND (rt.ticket_number LIKE ? OR rt.customer_name LIKE ? OR rt.customer_phone LIKE ? OR rt.device_info LIKE ? OR rt.imei LIKE ?)'
      const s = `%${filters.search}%`
      params.push(s, s, s, s, s)
    }
    query += ' ORDER BY rt.created_at DESC'
    return db.prepare(query).all(...params)
  })

  ipcMain.handle('repair:getById', (_, id: number) => {
    const ticket = db.prepare(`
      SELECT rt.*,
             COALESCE(rt.total_fee, rt.total_amount, 0) as total_fee,
             COALESCE(rt.deposit_paid, rt.paid_amount, 0) as deposit_paid,
             COALESCE(rt.note, rt.notes, '') as note,
             COALESCE(rt.staff_id, rt.user_id) as staff_id,
             COALESCE(rt.completed_at, rt.resolved_at) as completed_at,
             u.name as staff_name, c.phone as customer_phone_ref, c.address as customer_address
      FROM repair_tickets rt
      LEFT JOIN users u ON COALESCE(rt.staff_id, rt.user_id) = u.id
      LEFT JOIN customers c ON rt.customer_id = c.id
      WHERE rt.id = ?
    `).get(id) as any
    if (!ticket) return null

    // Support both repair_lines and legacy repair_ticket_items
    let lines = db.prepare('SELECT * FROM repair_lines WHERE ticket_id = ?').all(id)
    if (lines.length === 0) {
      const legacyItems = db.prepare('SELECT * FROM repair_ticket_items WHERE ticket_id = ?').all(id) as any[]
      if (legacyItems.length > 0) {
        lines = legacyItems.map(item => ({
          id: item.id,
          ticket_id: item.ticket_id,
          line_type: item.type || 'service',
          name: item.description,
          price: item.unit_price || 0,
          qty: item.quantity || 1,
          line_total: item.total || 0
        }))
      }
    }
    ticket.lines = lines
    return ticket
  })

  ipcMain.handle('repair:create', (_, data: any) => {
    try {
      const ticketNumber = generateTicketNumber()
      const imei = typeof data.imei === 'string' ? data.imei.trim() : ''
      const note = data.note || ''
      const depositPaid = data.deposit_paid || 0
      const staffId = data.staff_id || null

      const result = db.prepare(`
        INSERT INTO repair_tickets (
          ticket_number, customer_id, customer_name, customer_phone, device_info, imei,
          issue_description, status, promised_at, staff_id, deposit_paid, note,
          total_fee, total_amount, paid_amount, user_id, notes,
          received_at, created_at, updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, 'received', ?, ?, ?, ?,
          0, 0, ?, ?, ?,
          datetime('now', '+7 hours'), datetime('now', '+7 hours'), datetime('now', '+7 hours')
        )
      `).run(
        ticketNumber,
        data.customer_id || null,
        data.customer_name,
        data.customer_phone || '',
        data.device_info,
        imei || null,
        data.issue_description || '',
        data.promised_at || null,
        staffId,
        depositPaid,
        note,
        depositPaid,
        staffId,
        note
      )

      const ticketId = result.lastInsertRowid

      // If initial lines were supplied
      if (Array.isArray(data.lines) && data.lines.length > 0) {
        const insertLine = db.prepare(`
          INSERT INTO repair_lines (ticket_id, line_type, name, price, qty, line_total)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        for (const line of data.lines) {
          const qty = line.qty || 1
          const price = line.price || 0
          insertLine.run(ticketId, line.line_type || 'service', line.name, price, qty, price * qty)
        }
        updateTotalFee(ticketId as number)
      }

      logAudit(db, {
        user_id: staffId,
        action: 'Tiếp nhận sửa chữa',
        entity: 'repair',
        entity_id: ticketId as number,
        details: `Phiếu #${ticketNumber} - Khách: ${data.customer_name} - Máy: ${data.device_info}`
      })

      return { success: true, id: ticketId, ticketNumber }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('repair:update', (_, data: any) => {
    try {
      const imei = typeof data.imei === 'string' ? data.imei.trim() : ''
      const note = data.note || ''
      const depositPaid = data.deposit_paid || 0
      const staffId = data.staff_id || null

      db.prepare(`
        UPDATE repair_tickets SET 
          customer_name=?, customer_phone=?, device_info=?, imei=?, issue_description=?,
          promised_at=?, staff_id=?, user_id=?, deposit_paid=?, paid_amount=?, note=?, notes=?,
          updated_at=datetime('now', '+7 hours')
        WHERE id=?
      `).run(
        data.customer_name,
        data.customer_phone || '',
        data.device_info,
        imei || null,
        data.issue_description || '',
        data.promised_at || null,
        staffId,
        staffId,
        depositPaid,
        depositPaid,
        note,
        note,
        data.id
      )
      logAudit(db, {
        action: 'Cập nhật phiếu sửa',
        entity: 'repair',
        entity_id: data.id,
        details: `Cập nhật thông tin phiếu #${data.id} (Máy: ${data.device_info}, Khách: ${data.customer_name})`
      })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('repair:updateStatus', (_, { id, status }: any) => {
    try {
      let extraUpdate = ''
      if (status === 'done') {
        extraUpdate = ", completed_at = datetime('now', '+7 hours'), resolved_at = datetime('now', '+7 hours')"
      } else if (status === 'returned') {
        extraUpdate = ", returned_at = datetime('now', '+7 hours')"
      }
      const STATUS_NAMES: Record<string, string> = {
        received: 'Mới tiếp nhận',
        diagnosing: 'Đang chẩn đoán',
        waiting_parts: 'Chờ linh kiện',
        repairing: 'Đang sửa chữa',
        done: 'Đã hoàn thành',
        returned: 'Đã trả máy cho khách',
        cancelled: 'Đã hủy'
      }
      const oldTicket = db.prepare('SELECT ticket_number, customer_name, device_info, status FROM repair_tickets WHERE id=?').get(id) as any

      db.prepare(`
        UPDATE repair_tickets 
        SET status = ?, updated_at = datetime('now', '+7 hours') ${extraUpdate}
        WHERE id = ?
      `).run(status, id)

      const oldStatusName = STATUS_NAMES[oldTicket?.status] || oldTicket?.status || '—'
      const newStatusName = STATUS_NAMES[status] || status

      logAudit(db, {
        action: 'Cập nhật sửa chữa',
        entity: 'repair',
        entity_id: id,
        details: `Phiếu ${oldTicket?.ticket_number || `#${id}`} (${oldTicket?.device_info || 'Máy'}, Khách: ${oldTicket?.customer_name || 'Khách'}): Chuyển tiến độ "${oldStatusName}" ➔ "${newStatusName}"`
      })

      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('repair:addLine', (_, data: any) => {
    try {
      const qty = data.qty || 1
      const price = data.price || 0
      const lineTotal = price * qty
      const result = db.prepare(`
        INSERT INTO repair_lines (ticket_id, line_type, name, price, qty, line_total)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        data.ticket_id,
        data.line_type || 'service',
        data.name,
        price,
        qty,
        lineTotal
      )
      updateTotalFee(data.ticket_id)
      logAudit(db, {
        action: 'Thêm chi phí sửa chữa',
        entity: 'repair',
        entity_id: data.ticket_id,
        details: `Thêm hạng mục "${data.name}" (${data.line_type}): +${new Intl.NumberFormat('vi-VN').format(lineTotal)}đ cho phiếu #${data.ticket_id}`
      })
      return { success: true, id: result.lastInsertRowid }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('repair:updateLine', (_, data: any) => {
    try {
      const qty = data.qty || 1
      const price = data.price || 0
      const lineTotal = price * qty
      db.prepare(`
        UPDATE repair_lines 
        SET line_type = ?, name = ?, price = ?, qty = ?, line_total = ?
        WHERE id = ?
      `).run(
        data.line_type || 'service',
        data.name,
        price,
        qty,
        lineTotal,
        data.id
      )
      const line = db.prepare('SELECT ticket_id FROM repair_lines WHERE id = ?').get(data.id) as any
      if (line) updateTotalFee(line.ticket_id)
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('repair:deleteLine', (_, id: number) => {
    try {
      const line = db.prepare('SELECT ticket_id FROM repair_lines WHERE id = ?').get(id) as any
      if (line) {
        db.prepare('DELETE FROM repair_lines WHERE id = ?').run(id)
        updateTotalFee(line.ticket_id)
      }
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('repair:delete', (_, id: number) => {
    try {
      db.prepare("UPDATE repair_tickets SET status = 'cancelled', updated_at = datetime('now', '+7 hours') WHERE id = ?").run(id)
      logAudit(db, {
        action: 'Hủy phiếu sửa chữa',
        entity: 'repair',
        entity_id: id,
        details: `Hủy phiếu sửa chữa #${id}`
      })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })
}
