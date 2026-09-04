import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useNotify } from '../context/AppContext'

export const Login: React.FC = () => {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [usersList, setUsersList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // States for forced password change
  const [requireChange, setRequireChange] = useState(false)
  const [pendingUser, setPendingUser] = useState<any>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { login } = useAuth()
  const notify = useNotify()
  const navigate = useNavigate()

  useEffect(() => {
    window.api?.auth?.getActiveUsers?.().then((users: any[]) => {
      if (Array.isArray(users) && users.length > 0) {
        setUsersList(users)
        setUsername(users[0].username)
      }
    }).catch(console.error)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) {
      notify.warning('Thiếu thông tin', 'Vui lòng nhập tên đăng nhập và mật khẩu')
      return
    }
    setLoading(true)
    try {
      const res = await window.api.auth.login({ username, password })
      if (res.success) {
        if (res.requirePasswordChange) {
          setRequireChange(true)
          setPendingUser(res.user)
          notify.warning('Đổi mật khẩu', 'Bạn đang sử dụng mật khẩu mặc định. Vui lòng đổi mật khẩu mới để tiếp tục.')
        } else if (res.user) {
          login(res.user)
          notify.success('Đăng nhập thành công', `Chào mừng ${res.user.name}`)
          navigate('/pos')
        }
      } else {
        notify.error('Đăng nhập thất bại', res.message || 'Sai tên đăng nhập hoặc mật khẩu')
      }
    } catch (err: any) {
      notify.error('Lỗi', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      notify.warning('Mật khẩu yếu', 'Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }
    if (newPassword !== confirmPassword) {
      notify.warning('Không khớp', 'Mật khẩu xác nhận không khớp')
      return
    }
    setLoading(true)
    try {
      const res = await window.api.auth.changePassword({
        userId: pendingUser.id,
        oldPassword: password, // Mật khẩu cũ vừa đăng nhập thành công
        newPassword
      })
      if (res.success) {
        notify.success('Đổi mật khẩu thành công', 'Hệ thống đã lưu mật khẩu mới')
        login(res.user || pendingUser)
        navigate('/pos')
      } else {
        notify.error('Lỗi', res.message)
      }
    } catch (err: any) {
      notify.error('Lỗi', err.message)
    } finally {
      setLoading(false)
    }
  }

  if (requireChange) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-icon">🔒</div>
            <h1>ĐỔI MẬT KHẨU</h1>
            <p>Bắt buộc đổi mật khẩu mặc định</p>
          </div>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Mật khẩu mới</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full" style={{ marginTop: 8 }} disabled={loading}>
              {loading ? 'Đang lưu...' : 'XÁC NHẬN ĐỔI MẬT KHẨU'}
            </button>
            <button type="button" className="btn btn-outline btn-lg w-full" style={{ marginTop: 8 }} onClick={() => setRequireChange(false)} disabled={loading}>
              Quay lại
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">❖</div>
          <h1>POS QUẢN LÝ</h1>
          <p>Cửa hàng Điện thoại • Phụ kiện • Sửa chữa</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Tài khoản nhân viên / quản lý</label>
            {usersList.length > 0 ? (
              <select
                className="form-select"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{ fontSize: 14, fontWeight: 600, height: 42 }}
              >
                {usersList.map(u => (
                  <option key={u.id} value={u.username}>
                    👤 {u.name} ({u.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                autoFocus
              />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            style={{ marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Đang xác thực...' : 'ĐĂNG NHẬP'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
          Hệ thống Quản lý Bán hàng Đại Nguyễn Mobile
        </p>
      </div>
    </div>
  )
}
