import { app, BrowserWindow, ipcMain, shell, session } from 'electron'
import * as path from 'path'
import { setupDatabase } from './db'
import { registerAllHandlers } from './handlers/index'
import { runAutoBackup } from './backup'

const isDev = process.env.NODE_ENV === 'development'
let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.maximize()
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (isDev && input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools()
      event.preventDefault()
    } else if (!isDev) {
      // Chặn các phím tắt mở DevTools và reload trong production
      const key = (input.key || '').toLowerCase()
      if (
        key === 'f12' ||
        (input.control && input.shift && (key === 'i' || key === 'j')) ||
        (input.control && (key === 'r' || key === 'u'))
      ) {
        event.preventDefault()
      }
    }
  })

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl)
      if (isDev) {
        if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.protocol !== 'file:') {
          event.preventDefault()
        }
      } else {
        if (parsedUrl.protocol !== 'file:') {
          event.preventDefault()
        }
      }
    } catch {
      event.preventDefault()
    }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools()
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'))
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.pos.quanlybanhang')
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false)
  })
  const db = setupDatabase()
  registerAllHandlers(ipcMain, db)
  runAutoBackup(db.name)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
