import { contextBridge, ipcRenderer } from 'electron'

const validChannels = [
  // auth
  'auth:login', 'auth:logout', 'auth:getUsers', 'auth:createUser', 'auth:updateUser', 'auth:deleteUser', 'auth:changePassword',
  // products
  'products:getAll', 'products:getById', 'products:search', 'products:create', 'products:update', 'products:delete',
  'products:getLowStock', 'products:getImeis', 'products:addImeis', 'products:deleteImei',
  'products:getDeleted', 'products:restore', 'products:hardDelete',
  // categories
  'categories:getAll', 'categories:create', 'categories:update', 'categories:delete',
  // customers
  'customers:getAll', 'customers:getById', 'customers:search', 'customers:create', 'customers:update', 'customers:delete', 'customers:payDebt',
  // suppliers
  'suppliers:getAll', 'suppliers:create', 'suppliers:update', 'suppliers:delete',
  // orders
  'orders:create', 'orders:getAll', 'orders:getById', 'orders:cancel', 'orders:getTodaySummary',
  // inventory
  'inventory:addStock', 'inventory:getMovements', 'inventory:getLowStock',
  // reports
  'reports:getSummary', 'reports:getDailySales', 'reports:getMonthlySales', 'reports:getTopProducts', 'reports:getRevenueByChannel',
  // settings
  'settings:get', 'settings:getAll', 'settings:set', 'settings:setMultiple',
  'settings:getDatabasePath', 'settings:openDatabaseFolder', 'settings:backupDatabase',
  // print
  'print:invoice', 'print:testPrint', 'print:getAvailablePrinters', 'print:repairTicket',
  // warranties
  'warranties:check', 'warranties:getAll',
  // repair
  'repair:getAll', 'repair:getById', 'repair:create', 'repair:update', 'repair:updateStatus',
  'repair:addLine', 'repair:updateLine', 'repair:deleteLine', 'repair:delete',
  // cash
  'cash:getAll', 'cash:create', 'cash:getTodaySummary',
  // audit
  'audit:getAll', 'audit:log'
]

function invokeSafe(channel: string, ...args: any[]) {
  if (validChannels.includes(channel)) {
    return ipcRenderer.invoke(channel, ...args)
  }
  return Promise.reject(new Error(`Unauthorized IPC channel: ${channel}`))
}

contextBridge.exposeInMainWorld('api', {
  auth: {
    login: (data: any) => invokeSafe('auth:login', data),
    logout: () => invokeSafe('auth:logout'),
    getUsers: () => invokeSafe('auth:getUsers'),
    createUser: (data: any) => invokeSafe('auth:createUser', data),
    updateUser: (data: any) => invokeSafe('auth:updateUser', data),
    deleteUser: (id: number) => invokeSafe('auth:deleteUser', id),
    changePassword: (data: any) => invokeSafe('auth:changePassword', data)
  },
  products: {
    getAll: (filters?: any) => invokeSafe('products:getAll', filters),
    getById: (id: number) => invokeSafe('products:getById', id),
    search: (query: string) => invokeSafe('products:search', query),
    create: (data: any) => invokeSafe('products:create', data),
    update: (data: any) => invokeSafe('products:update', data),
    delete: (id: number) => invokeSafe('products:delete', id),
    getLowStock: () => invokeSafe('products:getLowStock'),
    getImeis: (productId: number) => invokeSafe('products:getImeis', productId),
    addImeis: (data: any) => invokeSafe('products:addImeis', data),
    deleteImei: (id: number) => invokeSafe('products:deleteImei', id),
    getDeleted: () => invokeSafe('products:getDeleted'),
    restore: (id: number) => invokeSafe('products:restore', id),
    hardDelete: (id: number) => invokeSafe('products:hardDelete', id)
  },
  categories: {
    getAll: () => invokeSafe('categories:getAll'),
    create: (data: any) => invokeSafe('categories:create', data),
    update: (data: any) => invokeSafe('categories:update', data),
    delete: (id: number) => invokeSafe('categories:delete', id)
  },
  customers: {
    getAll: (filters?: any) => invokeSafe('customers:getAll', filters),
    getById: (id: number) => invokeSafe('customers:getById', id),
    search: (query: string) => invokeSafe('customers:search', query),
    create: (data: any) => invokeSafe('customers:create', data),
    update: (data: any) => invokeSafe('customers:update', data),
    delete: (id: number) => invokeSafe('customers:delete', id),
    payDebt: (data: any) => invokeSafe('customers:payDebt', data)
  },
  suppliers: {
    getAll: () => invokeSafe('suppliers:getAll'),
    create: (data: any) => invokeSafe('suppliers:create', data),
    update: (data: any) => invokeSafe('suppliers:update', data),
    delete: (id: number) => invokeSafe('suppliers:delete', id)
  },
  orders: {
    create: (data: any) => invokeSafe('orders:create', data),
    getAll: (filters?: any) => invokeSafe('orders:getAll', filters),
    getById: (id: number) => invokeSafe('orders:getById', id),
    cancel: (id: number) => invokeSafe('orders:cancel', id),
    getTodaySummary: () => invokeSafe('orders:getTodaySummary')
  },
  inventory: {
    addStock: (data: any) => invokeSafe('inventory:addStock', data),
    getMovements: (filters?: any) => invokeSafe('inventory:getMovements', filters),
    getLowStock: () => invokeSafe('inventory:getLowStock')
  },
  reports: {
    getSummary: () => invokeSafe('reports:getSummary'),
    getDailySales: (date?: string) => invokeSafe('reports:getDailySales', date),
    getMonthlySales: (data?: any) => invokeSafe('reports:getMonthlySales', data),
    getTopProducts: (limit?: number) => invokeSafe('reports:getTopProducts', limit),
    getRevenueByChannel: (filters?: any) => invokeSafe('reports:getRevenueByChannel', filters)
  },
  settings: {
    get: (key: string) => invokeSafe('settings:get', key),
    getAll: () => invokeSafe('settings:getAll'),
    set: (key: string, value: string) => invokeSafe('settings:set', key, value),
    setMultiple: (data: Record<string, string>) => invokeSafe('settings:setMultiple', data),
    getDatabasePath: () => invokeSafe('settings:getDatabasePath'),
    openDatabaseFolder: () => invokeSafe('settings:openDatabaseFolder'),
    backupDatabase: () => invokeSafe('settings:backupDatabase')
  },
  print: {
    invoice: (orderId: number) => invokeSafe('print:invoice', orderId),
    testPrint: (config: any) => invokeSafe('print:testPrint', config),
    getAvailablePrinters: () => invokeSafe('print:getAvailablePrinters'),
    repairTicket: (ticketId: number) => invokeSafe('print:repairTicket', ticketId)
  },
  warranties: {
    check: (query: string) => invokeSafe('warranties:check', query),
    getAll: (filters?: any) => invokeSafe('warranties:getAll', filters)
  },
  repair: {
    getAll: (filters?: any) => invokeSafe('repair:getAll', filters),
    getById: (id: number) => invokeSafe('repair:getById', id),
    create: (data: any) => invokeSafe('repair:create', data),
    update: (data: any) => invokeSafe('repair:update', data),
    updateStatus: (data: any) => invokeSafe('repair:updateStatus', data),
    addLine: (data: any) => invokeSafe('repair:addLine', data),
    updateLine: (data: any) => invokeSafe('repair:updateLine', data),
    deleteLine: (id: number) => invokeSafe('repair:deleteLine', id),
    delete: (id: number) => invokeSafe('repair:delete', id)
  },
  cash: {
    getAll: (filters?: any) => invokeSafe('cash:getAll', filters),
    create: (data: any) => invokeSafe('cash:create', data),
    getTodaySummary: () => invokeSafe('cash:getTodaySummary')
  },
  audit: {
    getAll: (filters?: any) => invokeSafe('audit:getAll', filters),
    log: (data: any) => invokeSafe('audit:log', data)
  }
})
