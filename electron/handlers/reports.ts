import { session } from '../session'
import { IpcMain } from 'electron'
import Database from 'better-sqlite3'

export function registerReportHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('reports:getSummary', () => {
    session.requireAdmin()
    const dates = db.prepare(`
      SELECT strftime('%Y-%m-%d', 'now', '+7 hours') as today,
             strftime('%Y-%m-01', 'now', '+7 hours') as month_start
    `).get() as any
    const today = dates.today
    const monthStart = dates.month_start

    return {
      today: db.prepare(`
        SELECT COALESCE(SUM(total_amount),0) as revenue, COUNT(*) as orders, SUM((total_amount - COALESCE((SELECT SUM(cost_price * quantity) FROM order_items WHERE order_id = orders.id), 0))) as profit
        FROM orders WHERE date(created_at)=? AND status='completed'
      `).get(today),
      month: db.prepare(`
        SELECT COALESCE(SUM(total_amount),0) as revenue, COUNT(*) as orders, SUM((total_amount - COALESCE((SELECT SUM(cost_price * quantity) FROM order_items WHERE order_id = orders.id), 0))) as profit
        FROM orders WHERE date(created_at)>=? AND status='completed'
      `).get(monthStart),
      total_products: db.prepare('SELECT COUNT(*) as count FROM products WHERE active=1').get(),
      total_customers: db.prepare('SELECT COUNT(*) as count FROM customers WHERE active=1').get(),
      low_stock: db.prepare('SELECT COUNT(*) as count FROM products WHERE active=1 AND stock_quantity<=min_stock').get(),
      repair_count: db.prepare("SELECT COUNT(*) as count FROM repair_tickets WHERE status NOT IN ('returned', 'cancelled')").get()
    }
  })

  ipcMain.handle('reports:getDailySales', (_, date?: string) => {
    session.requireAdmin()
    const targetDate = date || (db.prepare("SELECT strftime('%Y-%m-%d', 'now', '+7 hours') as d").get() as any).d
    return db.prepare(`
      SELECT 
        strftime('%H', created_at) as hour,
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        SUM((total_amount - COALESCE((SELECT SUM(cost_price * quantity) FROM order_items WHERE order_id = orders.id), 0))) as profit
      FROM orders WHERE date(created_at)=? AND status='completed'
      GROUP BY hour ORDER BY hour
    `).all(targetDate)
  })

  ipcMain.handle('reports:getMonthlySales', (_, { year, month }: any = {}) => {
    session.requireAdmin()
    let monthStr: string
    if (year && month) {
      monthStr = `${year}-${String(month).padStart(2, '0')}`
    } else {
      monthStr = (db.prepare("SELECT strftime('%Y-%m', 'now', '+7 hours') as m").get() as any).m
    }
    return db.prepare(`
      SELECT 
        strftime('%d', created_at) as day,
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        SUM(discount_amount) as discount,
        SUM((total_amount - COALESCE((SELECT SUM(cost_price * quantity) FROM order_items WHERE order_id = orders.id), 0))) as profit
      FROM orders WHERE strftime('%Y-%m', created_at)=? AND status='completed'
      GROUP BY day ORDER BY day
    `).all(monthStr)
  })

  ipcMain.handle('reports:getTopProducts', (_, limit: number = 10) => {
    session.requireAdmin()
    return db.prepare(`
      SELECT 
        oi.product_id,
        oi.product_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.subtotal) as total_revenue,
        SUM(oi.subtotal - (COALESCE(oi.cost_price, 0) * oi.quantity)) as total_profit,
        COUNT(DISTINCT oi.order_id) as order_count
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.status='completed' AND date(o.created_at) >= date('now', '+7 hours', '-30 days')
      GROUP BY oi.product_name
      ORDER BY total_revenue DESC LIMIT ?
    `).all(limit)
  })

  ipcMain.handle('reports:getRevenueByChannel', (_, filters: any = {}) => {
    session.requireAdmin()
    let dateFilter = "date(o.created_at) >= date('now', '+7 hours', '-30 days')"
    const dateParams: any[] = []
    if (filters.date_from && filters.date_to) {
      dateFilter = 'date(o.created_at) >= ? AND date(o.created_at) <= ?'
      dateParams.push(filters.date_from, filters.date_to)
    }

    const orderChannels = db.prepare(`
      SELECT 
        COALESCE(oi.item_type, 'product') as channel_type,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.subtotal) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed' AND ${dateFilter}
      GROUP BY channel_type
    `).all(...dateParams) as any[]

    const repairFilter = (filters.date_from && filters.date_to)
      ? 'date(created_at) >= ? AND date(created_at) <= ?'
      : "date(created_at) >= date('now', '+7 hours', '-30 days')"

    const repairRevenue = db.prepare(`
      SELECT 
        'repair' as channel_type,
        COUNT(id) as ticket_count,
        COALESCE(SUM(COALESCE(total_fee, total_amount, 0)), 0) as revenue
      FROM repair_tickets
      WHERE status IN ('done', 'returned')
        AND ${repairFilter}
    `).get(...dateParams) as any

    return {
      orderChannels,
      repairRevenue
    }
  })
}
