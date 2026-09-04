import * as fs from 'fs'
import * as path from 'path'

export function runAutoBackup(dbPath: string) {
  try {
    const backupDir = path.join(path.dirname(dbPath), 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    
    const backupFileName = `pos_backup_${year}${month}${day}.db`
    const backupPath = path.join(backupDir, backupFileName)

    // Check if today's backup exists
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(dbPath, backupPath)
      console.log('Auto backup created:', backupFileName)
    }

    // Clean up old backups (keep last 7)
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('pos_backup_') && f.endsWith('.db'))
      .sort() // sorted by date since format is YYYYMMDD
    
    if (files.length > 7) {
      const toDelete = files.slice(0, files.length - 7)
      for (const f of toDelete) {
        fs.unlinkSync(path.join(backupDir, f))
        console.log('Deleted old backup:', f)
      }
    }

  } catch (e) {
    console.error('Auto backup failed:', e)
  }
}
