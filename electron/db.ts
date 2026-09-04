import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'
import * as bcrypt from 'bcryptjs'

let db: Database.Database

export function setupDatabase(): Database.Database {
  let dbDir: string
  try {
    const userDataPath = app.getPath('userData')
    dbDir = path.join(userDataPath, 'database')
  } catch (e) {
    dbDir = path.join(process.cwd(), 'database')
  }

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = path.join(dbDir, 'pos.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables()
  runMigrations()
  seedDefaultData()

  console.log('Database initialized at:', dbPath)
  return db
}

export function logAudit(
  database: Database.Database,
  data: {
    user_id?: number | null
    user_name?: string | null
    action: string
    entity?: string | null
    entity_id?: number | null
    details?: string | null
  }
) {
  try {
    let name = data.user_name
    if (!name && data.user_id) {
      const user = database.prepare('SELECT name FROM users WHERE id = ?').get(data.user_id) as any
      name = user?.name || null
    }
    database.prepare(`
      INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
    `).run(
      data.user_id || null,
      name || 'Hệ thống',
      data.action,
      data.entity || null,
      data.entity_id || null,
      data.details || null
    )
  } catch (e: any) {
    console.error('Audit log error:', e.message)
  }
}

function createTables() {
  db.exec(`
    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'cashier' CHECK(role IN ('admin', 'cashier', 'warehouse', 'employee')),
      phone TEXT,
      active INTEGER DEFAULT 1,
      require_password_change INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now', '+7 hours')),
      updated_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    -- Categories
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    -- Products
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id),
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      barcode TEXT UNIQUE,
      description TEXT,
      unit TEXT DEFAULT 'cái',
      cost_price REAL DEFAULT 0,
      sell_price REAL NOT NULL DEFAULT 0,
      wholesale_price REAL,
      stock_quantity INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      image_path TEXT,
      active INTEGER DEFAULT 1,
      is_imei INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now', '+7 hours')),
      updated_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    -- Product IMEIs
    CREATE TABLE IF NOT EXISTS product_imeis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      imei TEXT UNIQUE NOT NULL,
      status TEXT CHECK(status IN ('available', 'sold', 'returned')) DEFAULT 'available',
      warranty_months INTEGER DEFAULT 12,
      capacity TEXT,
      color TEXT,
      condition TEXT,
      price REAL,
      cost_price REAL,
      sold_at DATETIME,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      birthday TEXT,
      gender TEXT,
      customer_group TEXT DEFAULT 'regular',
      points INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      debt REAL DEFAULT 0,
      note TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', '+7 hours')),
      updated_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    -- Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      tax_code TEXT,
      contact_person TEXT,
      debt REAL DEFAULT 0,
      note TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', '+7 hours')),
      updated_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    -- Orders
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      user_id INTEGER REFERENCES users(id),
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      discount_percent REAL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'transfer', 'card', 'mixed')),
      cash_received REAL DEFAULT 0,
      change_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'completed' CHECK(status IN ('completed', 'cancelled', 'pending')),
      note TEXT,
      created_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    -- Order Items
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name TEXT NOT NULL,
      product_sku TEXT,
      unit TEXT DEFAULT 'cái',
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      subtotal REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      imei TEXT,
      warranty_expiry DATETIME,
      item_type TEXT DEFAULT 'product'
    );

    -- Stock Movements
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('in', 'out', 'adjust')),
      quantity INTEGER NOT NULL,
      quantity_before INTEGER,
      quantity_after INTEGER,
      unit_cost REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      reference_type TEXT,
      reference_id INTEGER,
      supplier_id INTEGER REFERENCES suppliers(id),
      note TEXT,
      user_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    -- Purchase Orders
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER REFERENCES suppliers(id),
      user_id INTEGER REFERENCES users(id),
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'completed' CHECK(status IN ('draft', 'completed', 'cancelled')),
      note TEXT,
      created_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    -- Purchase Order Items
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    -- Repair Tickets
    CREATE TABLE IF NOT EXISTS repair_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      device_info TEXT NOT NULL,
      imei TEXT,
      issue_description TEXT,
      status TEXT DEFAULT 'received' CHECK(status IN ('received', 'diagnosing', 'waiting_parts', 'repairing', 'done', 'returned', 'cancelled')),
      received_at DATETIME DEFAULT (datetime('now', '+7 hours')),
      promised_at DATETIME,
      completed_at DATETIME,
      returned_at DATETIME,
      staff_id INTEGER REFERENCES users(id),
      total_fee REAL DEFAULT 0,
      deposit_paid REAL DEFAULT 0,
      note TEXT,
      created_at DATETIME DEFAULT (datetime('now', '+7 hours')),
      updated_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    -- Repair Lines
    CREATE TABLE IF NOT EXISTS repair_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
      line_type TEXT DEFAULT 'service' CHECK(line_type IN ('labor', 'service', 'part')),
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      qty INTEGER NOT NULL DEFAULT 1,
      line_total REAL NOT NULL DEFAULT 0
    );

    -- Cash Transactions (Sổ quỹ)
    CREATE TABLE IF NOT EXISTS cash_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('in', 'out')),
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      note TEXT,
      staff_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    -- Audit Logs (Nhật ký hoạt động)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      user_name TEXT,
      action TEXT NOT NULL,
      entity TEXT,
      entity_id INTEGER,
      details TEXT,
      created_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    -- Settings
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );
  `)
}

function runMigrations() {
  try {
    const productsInfo = db.prepare('PRAGMA table_info(products)').all() as any[]
    if (!productsInfo.some(c => c.name === 'is_imei')) {
      db.prepare('ALTER TABLE products ADD COLUMN is_imei INTEGER DEFAULT 0').run()
    }
  } catch (e: any) {
    console.error('Migration products error:', e.message)
  }

  try {
    const orderItemsInfo = db.prepare('PRAGMA table_info(order_items)').all() as any[]
    if (!orderItemsInfo.some(c => c.name === 'imei')) {
      db.prepare('ALTER TABLE order_items ADD COLUMN imei TEXT').run()
    }
    if (!orderItemsInfo.some(c => c.name === 'warranty_expiry')) {
      db.prepare('ALTER TABLE order_items ADD COLUMN warranty_expiry DATETIME').run()
    }
    if (!orderItemsInfo.some(c => c.name === 'item_type')) {
      db.prepare("ALTER TABLE order_items ADD COLUMN item_type TEXT DEFAULT 'product'").run()
    }
  } catch (e: any) {
    console.error('Migration order_items error:', e.message)
  }

  try {
    const tableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='repair_tickets'").get() as any
    if (tableSql && tableSql.sql && (tableSql.sql.includes("status IN ('pending'") || !tableSql.sql.includes("'received'"))) {
      db.pragma('foreign_keys = OFF')
      db.exec(`
        CREATE TABLE repair_tickets_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticket_number TEXT UNIQUE NOT NULL,
          customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
          customer_name TEXT,
          customer_phone TEXT,
          device_info TEXT NOT NULL,
          imei TEXT,
          issue_description TEXT,
          status TEXT DEFAULT 'received' CHECK(status IN ('received', 'diagnosing', 'waiting_parts', 'repairing', 'done', 'returned', 'cancelled', 'pending', 'processing', 'completed', 'delivered')),
          received_at DATETIME DEFAULT (datetime('now', '+7 hours')),
          promised_at DATETIME,
          completed_at DATETIME,
          returned_at DATETIME,
          staff_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          total_fee REAL DEFAULT 0,
          deposit_paid REAL DEFAULT 0,
          note TEXT,
          total_amount REAL DEFAULT 0,
          paid_amount REAL DEFAULT 0,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          notes TEXT,
          resolved_at DATETIME,
          created_at DATETIME DEFAULT (datetime('now', '+7 hours')),
          updated_at DATETIME DEFAULT (datetime('now', '+7 hours'))
        );

        INSERT INTO repair_tickets_new (
          id, ticket_number, customer_id, customer_name, customer_phone, device_info,
          issue_description, notes, status, total_amount, paid_amount, user_id,
          resolved_at, created_at, updated_at, imei, received_at, promised_at,
          completed_at, returned_at, staff_id, total_fee, deposit_paid, note
        )
        SELECT 
          id, ticket_number, customer_id, customer_name, customer_phone, device_info,
          issue_description, notes, 
          CASE status
            WHEN 'pending' THEN 'received'
            WHEN 'processing' THEN 'repairing'
            WHEN 'completed' THEN 'done'
            WHEN 'delivered' THEN 'returned'
            ELSE status
          END,
          total_amount, paid_amount, user_id,
          resolved_at, created_at, updated_at, imei, received_at, promised_at,
          completed_at, returned_at, staff_id, total_fee, deposit_paid, note
        FROM repair_tickets;

        DROP TABLE repair_tickets;
        ALTER TABLE repair_tickets_new RENAME TO repair_tickets;
      `)
      db.pragma('foreign_keys = ON')
      console.log('Migrated repair_tickets to new status schema')
    }
  } catch (e: any) {
    console.error('Migration repair_tickets schema error:', e.message)
  }

  try {
    const repairTicketsInfo = db.prepare('PRAGMA table_info(repair_tickets)').all() as any[]
    const existingNames = new Set(repairTicketsInfo.map(c => c.name))
    const missingCols: [string, string][] = [
      ['received_at', "DATETIME DEFAULT (datetime('now', '+7 hours'))"],
      ['promised_at', 'DATETIME'],
      ['completed_at', 'DATETIME'],
      ['returned_at', 'DATETIME'],
      ['staff_id', 'INTEGER'],
      ['total_fee', 'REAL DEFAULT 0'],
      ['deposit_paid', 'REAL DEFAULT 0'],
      ['note', 'TEXT'],
      ['imei', 'TEXT'],
      ['total_amount', 'REAL DEFAULT 0'],
      ['paid_amount', 'REAL DEFAULT 0'],
      ['user_id', 'INTEGER'],
      ['notes', 'TEXT'],
      ['resolved_at', 'DATETIME']
    ]
    for (const [colName, colDef] of missingCols) {
      if (!existingNames.has(colName)) {
        db.prepare(`ALTER TABLE repair_tickets ADD COLUMN ${colName} ${colDef}`).run()
      }
    }
  } catch (e: any) {
    console.error('Migration repair_tickets error:', e.message)
  }

  try {
    const imeisInfo = db.prepare('PRAGMA table_info(product_imeis)').all() as any[]
    const existingNames = new Set(imeisInfo.map(c => c.name))
    const missingCols: [string, string][] = [
      ['capacity', 'TEXT'],
      ['color', 'TEXT'],
      ['condition', 'TEXT'],
      ['price', 'REAL'],
      ['cost_price', 'REAL']
    ]
    for (const [colName, colDef] of missingCols) {
      if (!existingNames.has(colName)) {
        db.prepare(`ALTER TABLE product_imeis ADD COLUMN ${colName} ${colDef}`).run()
      }
    }
  } catch (e: any) {
    console.error('Migration product_imeis error:', e.message)
  }

  try {
    const usersInfo = db.prepare('PRAGMA table_info(users)').all() as any[]
    if (!usersInfo.some(c => c.name === 'require_password_change')) {
      db.prepare('ALTER TABLE users ADD COLUMN require_password_change INTEGER DEFAULT 0').run()
      // If admin exists and password is admin123, enforce change
      const adminUser = db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get('admin') as any
      if (adminUser) {
        if (bcrypt.compareSync('admin123', adminUser.password_hash)) {
          db.prepare('UPDATE users SET require_password_change = 1 WHERE id = ?').run(adminUser.id)
        }
      }
    }
  } catch (e: any) {
    console.error('Migration users require_password_change error:', e.message)
  }

  try {
    const custSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='customers'").get() as any
    if (custSql && custSql.sql && (custSql.sql.includes('gender IN') || custSql.sql.includes('customer_group IN'))) {
      db.pragma('foreign_keys = OFF')
      db.exec(`
        CREATE TABLE customers_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          address TEXT,
          birthday TEXT,
          gender TEXT,
          customer_group TEXT DEFAULT 'regular',
          points INTEGER DEFAULT 0,
          total_spent REAL DEFAULT 0,
          debt REAL DEFAULT 0,
          note TEXT,
          active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT (datetime('now', '+7 hours')),
          updated_at DATETIME DEFAULT (datetime('now', '+7 hours'))
        );

        INSERT INTO customers_new (
          id, name, phone, email, address, birthday, gender,
          customer_group, points, total_spent, debt, note, active,
          created_at, updated_at
        )
        SELECT 
          id, name, phone, email, address, birthday, gender,
          customer_group, points, total_spent, debt, note, active,
          created_at, updated_at
        FROM customers;

        DROP TABLE customers;
        ALTER TABLE customers_new RENAME TO customers;
      `)
      db.pragma('foreign_keys = ON')
      console.log('Migrated customers table to remove restrictive CHECK constraints successfully')
    }
  } catch (e: any) {
    console.error('Migration customers error:', e.message)
    db.pragma('foreign_keys = ON')
  }

  try {
    const missingProducts = db.prepare("SELECT id FROM products WHERE sku IS NULL OR trim(sku) = '' OR barcode IS NULL OR trim(barcode) = ''").all() as any[]
    for (const p of missingProducts) {
      const generatedCode = `SP${String(p.id).padStart(6, '0')}`
      db.prepare(`
        UPDATE products 
        SET sku = COALESCE(NULLIF(trim(sku), ''), ?),
            barcode = COALESCE(NULLIF(trim(barcode), ''), NULLIF(trim(sku), ''), ?)
        WHERE id = ?
      `).run(generatedCode, generatedCode, p.id)
    }
  } catch (e: any) {
    console.error('Migration auto-sku error:', e.message)
  }
}

function seedDefaultData() {
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync('admin123', 10)
    db.prepare(`
      INSERT INTO users (name, username, password_hash, role, require_password_change)
      VALUES (?, ?, ?, ?, ?)
    `).run('Quản trị viên', 'admin', passwordHash, 'admin', 1)
  }

  const defaultSettings: Record<string, string> = {
    'store.name': 'Đại Nguyễn Mobile',
    'store.address': '123 Đường ABC, Quận XYZ, TP.HCM',
    'store.phone': '0901234567',
    'store.email': '',
    'store.tax_code': '',
    'store.logo': '',
    'inventory.default_min_stock': '5',
    'pos.show_image': '1',
    'pos.sound': '1',
    'print.enabled': '0',
    'print.type': 'usb',
    'print.ip': '192.168.1.100',
    'print.port': '9100',
    'print.device_path': '',
    'print.paper_width': '80',
    'invoice.show_logo': '1',
    'invoice.footer': 'Cảm ơn quý khách! Hẹn gặp lại.',
    'app.theme': 'light',
    'app.currency': 'VND',
    'app.low_stock_alert': '5'
  }

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value)
  }

  const categoriesCount = (db.prepare('SELECT COUNT(*) as count FROM categories').get() as any).count
  if (categoriesCount === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)')
    ;[
      ['Điện thoại', 1],
      ['Cáp & Sạc', 2],
      ['Tai nghe & Âm thanh', 3],
      ['Ốp lưng & Bao da', 4],
      ['Kính cường lực', 5],
      ['Đồ chơi công nghệ', 6]
    ].forEach(([name, order]) => insertCategory.run(name, order))
  }

  const productsCount = (db.prepare('SELECT COUNT(*) as count FROM products').get() as any).count
  if (productsCount === 0) {
    const getCatId = (name: string) => {
      const row = db.prepare('SELECT id FROM categories WHERE name = ?').get(name) as any
      return row ? row.id : 1
    }
    const insertProduct = db.prepare(`
      INSERT INTO products (category_id, name, sku, barcode, unit, cost_price, sell_price, stock_quantity, min_stock, is_imei)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const sampleProducts: [string, string, string, string, string, number, number, number, number, number][] = [
      ['Điện thoại', 'iPhone 15 Pro Max 256GB Chính hãng VN/A', 'IP15PM256', '8806098123456', 'máy', 26000000, 29490000, 15, 3, 1],
      ['Điện thoại', 'Samsung Galaxy S24 Ultra 256GB', 'S24U256', '8806098123463', 'máy', 24500000, 27990000, 10, 2, 1],
      ['Cáp & Sạc', 'Củ sạc nhanh Apple USB-C 20W Chính hãng', 'CU20WAP', '194252156973', 'cái', 350000, 550000, 120, 10, 0],
      ['Cáp & Sạc', 'Cáp sạc Type-C to Lightning Apple 1m', 'CAP1MAP', '194252156980', 'cái', 150000, 290000, 150, 15, 0],
      ['Cáp & Sạc', 'Sạc dự phòng Anker PowerCore 10000mAh', 'ANK10K', '848061053425', 'cái', 380000, 590000, 60, 5, 0],
      ['Tai nghe & Âm thanh', 'Tai nghe không dây AirPods Pro 2 USB-C', 'APPRO2C', '195949052456', 'hộp', 4200000, 5690000, 25, 4, 0],
      ['Tai nghe & Âm thanh', 'Loa Bluetooth JBL Go 4 Chính hãng', 'JBLGO4', '050036398762', 'cái', 650000, 990000, 30, 5, 0],
      ['Ốp lưng & Bao da', 'Ốp lưng Silicone MagSafe iPhone 15 Pro Max', 'OPMAG15', '195949123456', 'cái', 120000, 320000, 80, 10, 0],
      ['Kính cường lực', 'Kính cường lực Kingkong iPhone 15 Pro/Pro Max', 'KKIP15', '6971234567890', 'cái', 25000, 120000, 200, 20, 0],
      ['Đồ chơi công nghệ', 'Gậy Selfie kiêm Tripod chống rung bluetooth', 'TRIPODBT', '6979876543210', 'cái', 180000, 350000, 40, 5, 0]
    ]

    sampleProducts.forEach(([catName, name, sku, barcode, unit, cost, sell, stock, min_stock, is_imei]) => {
      const catId = getCatId(catName)
      insertProduct.run(catId, name, sku, barcode, unit, cost, sell, stock, min_stock, is_imei)
    })
  }
}
