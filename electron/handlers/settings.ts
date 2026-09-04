import { app, BrowserWindow, dialog, IpcMain, shell } from 'electron'
import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'
import { logAudit } from '../db'
import { session } from '../session'

export function registerSettingsHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('settings:get', (_, key: string) => {
    const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key) as any
    return row?.value || null
  })

  ipcMain.handle('settings:getAll', () => {
    const rows = db.prepare('SELECT key, value FROM settings').all() as any[]
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value
      return acc
    }, {} as Record<string, string>)
  })

  ipcMain.handle('settings:set', (_, key: string, value: string) => {
    try {
      session.requireAdmin()
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now', '+7 hours'))").run(key, String(value))
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('settings:setMultiple', (_, data: Record<string, string>) => {
    try {
      session.requireAdmin()
      const insert = db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now', '+7 hours'))")
      const insertMany = db.transaction((settings: Record<string, string>) => {
        for (const [key, value] of Object.entries(settings)) {
          insert.run(key, String(value))
        }
      })
      insertMany(data)
      logAudit(db, {
        action: 'Cập nhật cài đặt',
        entity: 'settings',
        details: `Cập nhật cấu hình hệ thống: ${Object.keys(data).join(', ')}`
      })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('settings:getDatabasePath', () => {
    return db.name
  })

  ipcMain.handle('settings:openDatabaseFolder', async () => {
    try {
      const dbDir = path.dirname(db.name)
      if (!fs.existsSync(dbDir)) {
        return { success: false, message: 'Không tìm thấy thư mục dữ liệu' }
      }
      await shell.openPath(dbDir)
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('settings:backupDatabase', async (event) => {
    try {
      const owner = BrowserWindow.fromWebContents(event.sender)
      const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')
      const defaultPath = path.join(
        app.getPath('documents'),
        `pos-backup-${stamp}.db`
      )
      const options = {
        title: 'Chọn nơi lưu bản sao lưu dữ liệu POS',
        defaultPath,
        filters: [
          { name: 'SQLite database', extensions: ['db'] },
          { name: 'All files', extensions: ['*'] }
        ]
      }
      const result = owner
        ? await dialog.showSaveDialog(owner, options)
        : await dialog.showSaveDialog(options)

      if (result.canceled || !result.filePath) {
        return { success: false, cancelled: true }
      }

      await db.backup(result.filePath)
      logAudit(db, {
        action: 'Sao lưu dữ liệu',
        entity: 'database',
        details: `Tạo bản sao lưu cơ sở dữ liệu tới file: ${path.basename(result.filePath)}`
      })
      return { success: true, path: result.filePath }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })
}
