import { IpcMain } from 'electron'
import Database from 'better-sqlite3'
import * as bcrypt from 'bcryptjs'
import { logAudit } from '../db'
import { session } from '../session'

interface LoginAttempt {
  count: number
  lockedUntil: number
}
const loginAttempts = new Map<string, LoginAttempt>()

export function registerAuthHandlers(ipcMain: IpcMain, db: Database.Database) {
  ipcMain.handle('auth:login', (_, { username, password }) => {
    try {
      const cleanUsername = String(username || '').trim()
      const now = Date.now()
      const attempt = loginAttempts.get(cleanUsername)

      if (attempt && attempt.lockedUntil > now) {
        const remainingMinutes = Math.ceil((attempt.lockedUntil - now) / 60000)
        return {
          success: false,
          message: `Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau ${remainingMinutes} phút.`
        }
      }

      const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(cleanUsername) as any
      if (!user) return { success: false, message: 'Tài khoản không tồn tại' }

      const valid = bcrypt.compareSync(password || '', user.password_hash)
      if (!valid) {
        const curAttempt = attempt && attempt.lockedUntil <= now ? { count: 0, lockedUntil: 0 } : (attempt || { count: 0, lockedUntil: 0 })
        curAttempt.count += 1

        if (curAttempt.count >= 5) {
          curAttempt.lockedUntil = now + 10 * 60 * 1000 // Khóa 10 phút
          loginAttempts.set(cleanUsername, curAttempt)

          logAudit(db, {
            user_id: user.id,
            user_name: user.name,
            action: 'Tài khoản bị khóa tạm thời',
            entity: 'auth',
            details: `Tài khoản (${cleanUsername}) bị tạm khóa 10 phút do nhập sai mật khẩu 5 lần liên tiếp`
          })

          return {
            success: false,
            message: 'Bạn đã nhập sai mật khẩu 5 lần liên tiếp. Tài khoản bị tạm khóa 10 phút để đảm bảo an toàn.'
          }
        } else {
          loginAttempts.set(cleanUsername, curAttempt)

          logAudit(db, {
            user_id: user.id,
            user_name: user.name,
            action: 'Đăng nhập thất bại',
            entity: 'auth',
            details: `Nhập sai mật khẩu lần ${curAttempt.count}/5 cho tài khoản (${cleanUsername})`
          })

          return {
            success: false,
            message: `Mật khẩu không đúng. Bạn còn ${5 - curAttempt.count} lần thử trước khi bị khóa tạm thời.`
          }
        }
      }

      // Login success: reset attempt counter
      loginAttempts.delete(cleanUsername)

      const { password_hash, ...userInfo } = user
      if (userInfo.role === 'cashier' || userInfo.role === 'warehouse') {
        userInfo.role = 'employee'
      }

      if (user.require_password_change === 1) {
        return { success: true, requirePasswordChange: true, user: userInfo }
      }

      session.setUser(userInfo)

      logAudit(db, {
        user_id: user.id,
        user_name: user.name,
        action: 'Đăng nhập',
        entity: 'auth',
        details: `Đăng nhập vào hệ thống (${cleanUsername})`
      })
      return { success: true, user: userInfo }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('auth:logout', () => {
    session.clearUser()
    return { success: true }
  })

  ipcMain.handle('auth:getActiveUsers', () => {
    return db.prepare('SELECT id, name, username, role FROM users WHERE active = 1 ORDER BY role = "admin" DESC, id ASC').all()
  })

  ipcMain.handle('auth:getUsers', () => {
    session.requireAdmin()
    const users = db.prepare('SELECT id, name, username, role, phone, active, created_at FROM users').all() as any[]
    return users.map(u => {
      if (u.role === 'cashier' || u.role === 'warehouse') {
        u.role = 'employee'
      }
      return u
    })
  })

  ipcMain.handle('auth:createUser', (_, data) => {
    try {
      session.requireAdmin()
      const hash = bcrypt.hashSync(data.password, 10)
      let role = data.role || 'employee'
      if (role === 'employee') role = 'cashier'
      const result = db.prepare(`
        INSERT INTO users (name, username, password_hash, role, phone)
        VALUES (?, ?, ?, ?, ?)
      `).run(data.name, data.username, hash, role, data.phone || '')
      logAudit(db, {
        action: 'Tạo tài khoản',
        entity: 'users',
        entity_id: Number(result.lastInsertRowid),
        details: `Tạo tài khoản nhân viên "${data.name}" (Tên đăng nhập: ${data.username}, Quyền: ${role})`
      })
      return { success: true, id: result.lastInsertRowid }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('auth:updateUser', (_, data) => {
    try {
      session.requireAdmin()
      let role = data.role
      if (role === 'employee') role = 'cashier'
      db.prepare(`
        UPDATE users SET name=?, role=?, phone=?, active=?, updated_at=datetime('now', '+7 hours') WHERE id=?
      `).run(data.name, role, data.phone || '', data.active ?? 1, data.id)
      logAudit(db, {
        action: 'Cập nhật tài khoản',
        entity: 'users',
        entity_id: data.id,
        details: `Cập nhật thông tin nhân viên "${data.name}" (${data.username || ''})`
      })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('auth:deleteUser', (_, id) => {
    try {
      session.requireAdmin()
      const u = db.prepare('SELECT name, username FROM users WHERE id=?').get(id) as any
      db.prepare('UPDATE users SET active=0 WHERE id=?').run(id)
      logAudit(db, {
        action: 'Khóa tài khoản',
        entity: 'users',
        entity_id: id,
        details: `Khóa tài khoản người dùng "${u?.name || `#${id}`}" (${u?.username || ''})`
      })
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('auth:changePassword', (_, { userId, oldPassword, newPassword }) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId) as any
      if (!user) return { success: false, message: 'Không tìm thấy người dùng' }
      if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
        return { success: false, message: 'Mật khẩu cũ không đúng' }
      }
      const hash = bcrypt.hashSync(newPassword, 10)
      db.prepare('UPDATE users SET password_hash=?, require_password_change=0 WHERE id=?').run(hash, userId)
      
      const { password_hash, ...userInfo } = user
      if (userInfo.role === 'cashier' || userInfo.role === 'warehouse') {
        userInfo.role = 'employee'
      }
      if (user.require_password_change === 1) {
        session.setUser(userInfo)
      }

      logAudit(db, {
        user_id: userId,
        user_name: user.name,
        action: 'Đổi mật khẩu',
        entity: 'users',
        entity_id: userId,
        details: `Người dùng "${user.name}" (${user.username}) đã đổi mật khẩu thành công`
      })
      return { success: true, user: userInfo }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })
}
