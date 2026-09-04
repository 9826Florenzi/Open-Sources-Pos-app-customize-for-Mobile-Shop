import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
// @ts-ignore
import ThermalPrinter from 'node-thermal-printer'

const { printer: Printer, types: PrinterTypes } = ThermalPrinter

export function registerPrintHandlers(ipcMain: IpcMain, db: Database.Database) {
  function getSettings(): Record<string, string> {
    const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'print.%' OR key LIKE 'store.%' OR key LIKE 'invoice.%'").all() as any[]
    return rows.reduce((acc, r) => {
      acc[r.key] = r.value
      return acc
    }, {} as Record<string, string>)
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
  }

  ipcMain.handle('print:getAvailablePrinters', () => {
    return {
      success: true,
      types: ['USB/Serial Port', 'Network (TCP/IP)'],
      message: 'Cấu hình máy in trong phần Cài đặt > Máy in'
    }
  })

  ipcMain.handle('print:testPrint', async (_, config: any) => {
    try {
      const printerConfig = {
        type: config.type === 'network' ? PrinterTypes.EPSON : PrinterTypes.EPSON,
        interface: config.type === 'network' ? `tcp://${config.ip}:${config.port || 9100}` : config.device_path || 'COM3'
      }
      const printer = new Printer(printerConfig)
      printer.alignCenter()
      printer.bold(true)
      printer.println('=== TEST PRINT ===')
      printer.bold(false)
      printer.println('Máy in hoạt động bình thường!')
      printer.println(new Date().toLocaleString('vi-VN'))
      printer.cut()
      await printer.execute()
      return { success: true }
    } catch (e: any) {
      return { success: false, message: 'Lỗi kết nối máy in: ' + e.message }
    }
  })

  ipcMain.handle('print:invoice', async (_, orderId: number) => {
    try {
      const settings = getSettings()
      if (settings['print.enabled'] !== '1') {
        return { success: false, message: 'Máy in chưa được bật trong cài đặt' }
      }

      const order = db.prepare(`
        SELECT o.*, c.name as customer_name, c.phone as customer_phone, u.name as user_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `).get(orderId) as any

      if (!order) return { success: false, message: 'Không tìm thấy đơn hàng' }

      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as any[]
      const paperWidth = parseInt(settings['print.paper_width'] || '80')
      const printerInterface = settings['print.type'] === 'network'
        ? `tcp://${settings['print.ip']}:${settings['print.port'] || 9100}`
        : settings['print.device_path'] || 'COM3'

      const printer = new Printer({
        type: PrinterTypes.EPSON,
        interface: printerInterface,
        width: paperWidth === 58 ? 32 : 48
      })

      printer.alignCenter()
      printer.bold(true)
      printer.setTextSize(1, 1)
      printer.println(settings['store.name'] || 'CỬA HÀNG')
      printer.setTextNormal()
      printer.bold(false)
      printer.println(settings['store.address'] || '')
      printer.println('Tel: ' + (settings['store.phone'] || ''))
      printer.drawLine()

      printer.alignCenter()
      printer.bold(true)
      printer.println('HÓA ĐƠN BÁN HÀNG')
      printer.bold(false)
      printer.alignLeft()
      printer.println(`Số HĐ: ${order.order_number}`)
      printer.println(`Ngày: ${new Date(order.created_at).toLocaleString('vi-VN')}`)
      if (order.customer_name) printer.println(`KH: ${order.customer_name}`)
      if (order.user_name) printer.println(`Thu ngân: ${order.user_name}`)
      printer.drawLine()

      for (const item of items) {
        printer.alignLeft()
        printer.println(item.product_name)
        if (item.imei) {
          printer.println(`  IMEI: ${item.imei}`)
        }
        if (item.discount_amount > 0) {
          if (item.subtotal === 0) {
            printer.println(`  [Tang kem 0d] (Gia goc: ${formatCurrency(item.unit_price * item.quantity)})`)
          } else {
            printer.println(`  (Giam truc tiep: -${formatCurrency(item.discount_amount)})`)
          }
        }
        printer.tableCustom([
          { text: `  ${item.quantity} x ${formatCurrency(item.unit_price)}`, align: 'LEFT', width: 0.6 },
          { text: formatCurrency(item.subtotal), align: 'RIGHT', width: 0.4 }
        ])
      }

      printer.drawLine()
      if (order.discount_amount > 0) {
        printer.tableCustom([
          { text: 'Tổng:', align: 'LEFT', width: 0.5 },
          { text: formatCurrency(order.subtotal), align: 'RIGHT', width: 0.5 }
        ])
        printer.tableCustom([
          { text: 'Giảm giá:', align: 'LEFT', width: 0.5 },
          { text: '-' + formatCurrency(order.discount_amount), align: 'RIGHT', width: 0.5 }
        ])
      }

      printer.bold(true)
      printer.tableCustom([
        { text: 'TỔNG CỘNG:', align: 'LEFT', width: 0.5 },
        { text: formatCurrency(order.total_amount), align: 'RIGHT', width: 0.5 }
      ])
      printer.bold(false)

      const pmLabel: Record<string, string> = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ' }
      printer.tableCustom([
        { text: pmLabel[order.payment_method] || 'Tiền mặt', align: 'LEFT', width: 0.5 },
        { text: formatCurrency(order.cash_received), align: 'RIGHT', width: 0.5 }
      ])
      if (order.change_amount > 0) {
        printer.tableCustom([
          { text: 'Tiền thối:', align: 'LEFT', width: 0.5 },
          { text: formatCurrency(order.change_amount), align: 'RIGHT', width: 0.5 }
        ])
      }

      printer.drawLine()
      printer.alignCenter()
      printer.println(settings['invoice.footer'] || 'Cảm ơn quý khách!')
      printer.newLine()
      printer.cut()
      await printer.execute()
      return { success: true }
    } catch (e: any) {
      return { success: false, message: 'Lỗi in hóa đơn: ' + e.message }
    }
  })

  ipcMain.handle('print:repairTicket', async (_, ticketId: number) => {
    try {
      const settings = getSettings()
      if (settings['print.enabled'] !== '1') {
        return { success: false, message: 'Máy in chưa được bật' }
      }

      const ticket = db.prepare(`
        SELECT rt.*,
               COALESCE(rt.total_fee, rt.total_amount, 0) as total_fee,
               COALESCE(rt.deposit_paid, rt.paid_amount, 0) as deposit_paid,
               u.name as staff_name
        FROM repair_tickets rt
        LEFT JOIN users u ON COALESCE(rt.staff_id, rt.user_id) = u.id
        WHERE rt.id = ?
      `).get(ticketId) as any

      if (!ticket) return { success: false, message: 'Không tìm thấy phiếu sửa chữa' }

      let lines = db.prepare('SELECT * FROM repair_lines WHERE ticket_id = ?').all(ticketId) as any[]
      if (lines.length === 0) {
        const legacy = db.prepare('SELECT * FROM repair_ticket_items WHERE ticket_id = ?').all(ticketId) as any[]
        lines = legacy.map(l => ({ name: l.description, line_total: l.total }))
      }

      const printerInterface = settings['print.type'] === 'network'
        ? `tcp://${settings['print.ip']}:${settings['print.port'] || 9100}`
        : settings['print.device_path'] || 'COM3'

      const printer = new Printer({
        type: PrinterTypes.EPSON,
        interface: printerInterface,
        width: 48
      })

      printer.alignCenter()
      printer.bold(true)
      printer.println(settings['store.name'] || 'CỬA HÀNG')
      printer.bold(false)
      printer.println('PHIẾU TIẾP NHẬN SỬA CHỮA')
      printer.drawLine()
      printer.alignLeft()
      printer.println(`Mã phiếu: ${ticket.ticket_number}`)
      printer.println(`Khách hàng: ${ticket.customer_name}`)
      if (ticket.customer_phone) printer.println(`SĐT: ${ticket.customer_phone}`)
      printer.println(`Thiết bị: ${ticket.device_info}`)
      if (ticket.imei) printer.println(`IMEI: ${ticket.imei}`)
      printer.println(`Tình trạng lỗi: ${ticket.issue_description || 'Không mô tả'}`)
      if (ticket.deposit_paid > 0) printer.println(`Đặt cọc: ${formatCurrency(ticket.deposit_paid)}`)
      printer.drawLine()

      if (lines.length > 0) {
        printer.println('Hạng mục sửa chữa:')
        for (const line of lines) {
          printer.tableCustom([
            { text: ` ${line.name}`, align: 'LEFT', width: 0.6 },
            { text: formatCurrency(line.line_total), align: 'RIGHT', width: 0.4 }
          ])
        }
        printer.drawLine()
        printer.tableCustom([
          { text: 'Tổng dự kiến:', align: 'LEFT', width: 0.5 },
          { text: formatCurrency(ticket.total_fee), align: 'RIGHT', width: 0.5 }
        ])
      }

      printer.newLine()
      printer.cut()
      await printer.execute()
      return { success: true }
    } catch (e: any) {
      return { success: false, message: 'Lỗi in phiếu: ' + e.message }
    }
  })
}
