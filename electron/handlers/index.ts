import { registerPurchaseOrderHandlers } from './purchaseOrders'
import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
import { registerAuthHandlers } from './auth'
import { registerProductHandlers } from './products'
import { registerCategoryHandlers } from './categories'
import { registerCustomerHandlers } from './customers'
import { registerSupplierHandlers } from './suppliers'
import { registerOrderHandlers } from './orders'
import { registerInventoryHandlers } from './inventory'
import { registerReportHandlers } from './reports'
import { registerSettingsHandlers } from './settings'
import { registerPrintHandlers } from './print'
import { registerWarrantyHandlers } from './warranties'
import { registerRepairHandlers } from './repair'
import { registerCashHandlers } from './cash'
import { registerAuditHandlers } from './audit'

export function registerAllHandlers(ipcMain: IpcMain, db: Database.Database) {
  registerAuthHandlers(ipcMain, db)
  registerProductHandlers(ipcMain, db)
  registerCategoryHandlers(ipcMain, db)
  registerCustomerHandlers(ipcMain, db)
  registerSupplierHandlers(ipcMain, db)
  registerOrderHandlers(ipcMain, db)
  registerInventoryHandlers(ipcMain, db)
  registerReportHandlers(ipcMain, db)
  registerSettingsHandlers(ipcMain, db)
  registerPrintHandlers(ipcMain, db)
  registerWarrantyHandlers(ipcMain, db)
  registerRepairHandlers(ipcMain, db)
  registerCashHandlers(ipcMain, db)
  registerPurchaseOrderHandlers(ipcMain, db)
  registerAuditHandlers(ipcMain, db)
}
