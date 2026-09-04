import React, { useState, useEffect } from 'react'
import { Plus, Pen, Trash2, Printer, Store, UserCog, Database, Folder, ShieldCheck } from 'lucide-react'
import { Modal } from '../components/Modal'
import { useAuth, useNotify } from '../context/AppContext'

export const Settings: React.FC = () => {
  const { user } = useAuth()
  const notify = useNotify()

  const [activeTab, setActiveTab] = useState<'store' | 'printer' | 'users' | 'database'>('store')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [users, setUsers] = useState<any[]>([])
  const [databasePath, setDatabasePath] = useState('')
  const [backingUp, setBackingUp] = useState(false)

  // User form modal
  const [showUserModal, setShowUserModal] = useState(false)
  const [editUserId, setEditUserId] = useState<number | null>(null)
  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'cashier',
    phone: ''
  })

  useEffect(() => {
    loadSettings()
    loadUsers()
    loadDatabasePath()
  }, [])

  async function loadSettings() {
    try {
      const data = await window.api.settings.getAll()
      setSettings(data || {})
    } catch (e) {
      console.error(e)
      setSettings({})
    }
  }

  async function loadUsers() {
    try {
      const list = await window.api.auth.getUsers()
      setUsers(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error(e)
      setUsers([])
    }
  }

  async function loadDatabasePath() {
    try {
      const path = await window.api.settings.getDatabasePath()
      setDatabasePath(path || '')
    } catch (e) {
      console.error(e)
    }
  }

  async function handleBackupDatabase() {
    setBackingUp(true)
    try {
      const res = await window.api.settings.backupDatabase()
      if (res.success) {
        notify.success('Đã sao lưu dữ liệu', res.path)
      } else if (!res.cancelled) {
        notify.error('Lỗi sao lưu', res.message || 'Không thể tạo bản sao lưu')
      }
    } catch (e: any) {
      notify.error('Lỗi sao lưu', e.message)
    } finally {
      setBackingUp(false)
    }
  }

  async function handleOpenDatabaseFolder() {
    const res = await window.api.settings.openDatabaseFolder()
    if (!res.success) {
      notify.error('Lỗi mở thư mục', res.message)
    }
  }

  async function handleSaveSettings() {
    try {
      const res = await window.api.settings.setMultiple(settings)
      if (res.success) {
        notify.success('Đã lưu cấu hình cài đặt')
      } else {
        notify.error('Lỗi', 'Không thể lưu cài đặt')
      }
    } catch (e: any) {
      notify.error('Lỗi', e.message)
    }
  }

  async function handleTestPrint() {
    notify.info('Đang gửi lệnh in test...')
    const res = await window.api.print.testPrint({
      type: settings['print.type'] || 'usb',
      ip: settings['print.ip'] || '192.168.1.100',
      port: parseInt(settings['print.port'] || '9100'),
      device_path: settings['print.device_path'] || 'COM3'
    })
    if (res.success) {
      notify.success('In test thành công!')
    } else {
      notify.error('Lỗi máy in', res.message)
    }
  }

  // Users CRUD
  function openCreateUser() {
    setUserForm({ name: '', username: '', password: '', role: 'cashier', phone: '' })
    setEditUserId(null)
    setShowUserModal(true)
  }

  async function handleSaveUser() {
    if (!userForm.name || !userForm.username) {
      notify.warning('Thiếu thông tin', 'Vui lòng nhập tên và tên đăng nhập')
      return
    }
    if (!editUserId && !userForm.password) {
      notify.warning('Thiếu mật khẩu', 'Vui lòng nhập mật khẩu cho tài khoản mới')
      return
    }

    if (editUserId) {
      const res = await window.api.auth.updateUser({ ...userForm, id: editUserId })
      if (res.success) {
        notify.success('Đã cập nhật tài khoản')
        setShowUserModal(false)
        loadUsers()
      } else notify.error('Lỗi', res.message)
    } else {
      const res = await window.api.auth.createUser(userForm)
      if (res.success) {
        notify.success('Đã tạo tài khoản mới')
        setShowUserModal(false)
        loadUsers()
      } else notify.error('Lỗi', res.message)
    }
  }

  async function handleDeleteUser(id: number) {
    if (!window.confirm('Xác nhận xóa tài khoản này?')) return
    const res = await window.api.auth.deleteUser(id)
    if (res.success) {
      notify.success('Đã xóa tài khoản')
      loadUsers()
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Cài đặt Hệ thống</h2>
          <p>Cấu hình cửa hàng, máy in & tài khoản phân quyền</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button
          className={`category-tab ${activeTab === 'store' ? 'active' : ''}`}
          onClick={() => setActiveTab('store')}
        >
          <Store size={14} style={{ display: 'inline', marginRight: 4 }} />
          Thông tin cửa hàng
        </button>
        <button
          className={`category-tab ${activeTab === 'printer' ? 'active' : ''}`}
          onClick={() => setActiveTab('printer')}
        >
          <Printer size={14} style={{ display: 'inline', marginRight: 4 }} />
          Cấu hình Máy in Bill
        </button>
        <button
          className={`category-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <UserCog size={14} style={{ display: 'inline', marginRight: 4 }} />
          Quản lý Nhân viên
        </button>
        <button
          className={`category-tab ${activeTab === 'database' ? 'active' : ''}`}
          onClick={() => setActiveTab('database')}
        >
          <Database size={14} style={{ display: 'inline', marginRight: 4 }} />
          Dữ liệu & Sao lưu
        </button>
      </div>

      {activeTab === 'store' && (
        <div className="card" style={{ maxWidth: 650 }}>
          <div className="card-header">
            <span className="card-title">Thông tin cửa hàng (In trên hóa đơn)</span>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Tên cửa hàng</label>
              <input
                className="form-input"
                value={settings['store.name'] || ''}
                onChange={e => setSettings({ ...settings, 'store.name': e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Địa chỉ</label>
              <input
                className="form-input"
                value={settings['store.address'] || ''}
                onChange={e => setSettings({ ...settings, 'store.address': e.target.value })}
              />
            </div>

            <div className="form-row col-2">
              <div className="form-group">
                <label className="form-label">Số điện thoại hotline</label>
                <input
                  className="form-input"
                  value={settings['store.phone'] || ''}
                  onChange={e => setSettings({ ...settings, 'store.phone': e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mã số thuế</label>
                <input
                  className="form-input"
                  value={settings['store.tax_code'] || ''}
                  onChange={e => setSettings({ ...settings, 'store.tax_code': e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mức cảnh báo tồn kho tối thiểu mặc định (cho sản phẩm mới)</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={settings['inventory.default_min_stock'] ?? '5'}
                onChange={e => setSettings({ ...settings, 'inventory.default_min_stock': e.target.value })}
                placeholder="5"
                style={{ maxWidth: 200 }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Khi tồn kho của sản phẩm giảm xuống bằng hoặc dưới mức này, hệ thống sẽ cảnh báo màu cam/đỏ.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Lời chào / Lời cảm ơn chân trang hóa đơn</label>
              <input
                className="form-input"
                value={settings['invoice.footer'] || ''}
                onChange={e => setSettings({ ...settings, 'invoice.footer': e.target.value })}
              />
            </div>

            <button className="btn btn-primary btn-lg" onClick={handleSaveSettings}>
              Lưu thay đổi
            </button>
          </div>
        </div>
      )}

      {activeTab === 'printer' && (
        <div className="card" style={{ maxWidth: 650 }}>
          <div className="card-header">
            <span className="card-title">Cấu hình máy in hóa đơn ESC/POS</span>
          </div>
          <div className="card-body">
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="print_enabled"
                checked={settings['print.enabled'] === '1'}
                onChange={e => setSettings({ ...settings, 'print.enabled': e.target.checked ? '1' : '0' })}
                style={{ width: 18, height: 18 }}
              />
              <label htmlFor="print_enabled" style={{ fontWeight: 700, cursor: 'pointer' }}>
                Bật tính năng tự động in hóa đơn khi thanh toán
              </label>
            </div>

            <div className="form-row col-2">
              <div className="form-group">
                <label className="form-label">Kiểu kết nối máy in</label>
                <select
                  className="form-select"
                  value={settings['print.type'] || 'usb'}
                  onChange={e => setSettings({ ...settings, 'print.type': e.target.value })}
                >
                  <option value="usb">Cổng USB / Serial COM</option>
                  <option value="network">Mạng LAN / WiFi (TCP/IP)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Khổ giấy in</label>
                <select
                  className="form-select"
                  value={settings['print.paper_width'] || '80'}
                  onChange={e => setSettings({ ...settings, 'print.paper_width': e.target.value })}
                >
                  <option value="80">K80 (Khổ rộng 80mm)</option>
                  <option value="58">K58 (Khổ nhỏ 58mm)</option>
                </select>
              </div>
            </div>

            {settings['print.type'] === 'network' ? (
              <div className="form-row col-2">
                <div className="form-group">
                  <label className="form-label">Địa chỉ IP máy in</label>
                  <input
                    className="form-input"
                    placeholder="192.168.1.100"
                    value={settings['print.ip'] || ''}
                    onChange={e => setSettings({ ...settings, 'print.ip': e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Port</label>
                  <input
                    className="form-input"
                    placeholder="9100"
                    value={settings['print.port'] || '9100'}
                    onChange={e => setSettings({ ...settings, 'print.port': e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Tên cổng máy in (Windows COM / USB path)</label>
                <input
                  className="form-input"
                  placeholder="VD: COM3 hoặc LPT1..."
                  value={settings['print.device_path'] || ''}
                  onChange={e => setSettings({ ...settings, 'print.device_path': e.target.value })}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleSaveSettings}>
                Lưu cấu hình
              </button>
              <button className="btn btn-outline" onClick={handleTestPrint}>
                <Printer size={15} />
                <span>In thử (Test print)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <span className="card-title">Danh sách tài khoản nhân viên</span>
            <button className="btn btn-primary btn-sm" onClick={openCreateUser}>
              <Plus size={14} />
              <span>Thêm tài khoản</span>
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Tên đăng nhập</th>
                  <th>Vai trò</th>
                  <th>Số điện thoại</th>
                  <th>Trạng thái</th>
                  <th className="text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.username}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-gray'}`}>
                        {u.role === 'admin' ? 'Quản trị viên' : 'Thu ngân / Nhân viên'}
                      </span>
                    </td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <span className={`badge ${u.active ? 'badge-success' : 'badge-danger'}`}>
                        {u.active ? 'Hoạt động' : 'Khóa'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => {
                            setUserForm({
                              name: u.name,
                              username: u.username,
                              password: '',
                              role: u.role,
                              phone: u.phone || ''
                            })
                            setEditUserId(u.id)
                            setShowUserModal(true)
                          }}
                        >
                          <Pen size={13} />
                        </button>
                        {u.username !== 'admin' && (
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDeleteUser(u.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="card" style={{ maxWidth: 700 }}>
          <div className="card-header">
            <span className="card-title">Cơ sở dữ liệu SQLite & Sao lưu an toàn</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: '#f8fafc', padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 20 }}>
              <ShieldCheck size={28} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                  Hệ thống Local Offline 100% - Dữ liệu bảo mật tuyệt đối
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                  Dữ liệu cửa hàng của bạn được lưu trữ trực tiếp trên máy tính dưới dạng file SQLite local (`pos.db`). Không phụ thuộc internet, tốc độ phản hồi tức thì và không lo rò rỉ thông tin.
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Đường dẫn file cơ sở dữ liệu trên máy tính:</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  readOnly
                  value={databasePath || '%APPDATA%\\pos-quan-ly-ban-hang\\database\\pos.db'}
                  style={{ background: 'var(--bg)', color: 'var(--primary)', fontWeight: 700 }}
                />
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    navigator.clipboard.writeText(databasePath || '%APPDATA%\\pos-quan-ly-ban-hang\\database\\pos.db')
                    notify.success('Đã sao chép đường dẫn!')
                  }}
                >
                  Sao chép
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleBackupDatabase} disabled={backingUp}>
                <Database size={15} />
                <span>{backingUp ? 'Đang sao lưu...' : 'Sao lưu dữ liệu'}</span>
              </button>
              <button className="btn btn-outline" onClick={handleOpenDatabaseFolder}>
                <Folder size={15} />
                <span>Mở thư mục dữ liệu</span>
              </button>
            </div>

            <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--text-primary)' }}>
                💡 Hướng dẫn sao lưu (Backup) dữ liệu định kỳ:
              </div>
              <ol style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 18, lineHeight: 1.8 }}>
                <li>Nhấn tổ hợp phím <b>Windows + R</b>, dán: <code>%APPDATA%\pos-quan-ly-ban-hang\database</code> và nhấn <b>Enter</b>.</li>
                <li>Copy file <code>pos.db</code> và lưu trữ vào ổ đĩa khác, USB hoặc Google Drive.</li>
                <li>Khi cần khôi phục (Restore), chỉ cần copy file <code>pos.db</code> đã sao lưu đè lại vào thư mục trên.</li>
              </ol>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Phiên bản POS: <b>2.0.0 PRO Clean</b></span>
              <span className="badge badge-success">WAL Mode Enabled</span>
            </div>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      <Modal
        show={showUserModal}
        onClose={() => setShowUserModal(false)}
        title={editUserId ? 'Sửa tài khoản nhân viên' : 'Thêm tài khoản mới'}
        size="md"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowUserModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={handleSaveUser}>Lưu tài khoản</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Họ và tên nhân viên *</label>
          <input
            className="form-input"
            value={userForm.name}
            onChange={e => setUserForm({ ...userForm, name: e.target.value })}
            autoFocus
          />
        </div>

        <div className="form-row col-2">
          <div className="form-group">
            <label className="form-label">Tên đăng nhập *</label>
            <input
              className="form-input"
              value={userForm.username}
              disabled={!!editUserId}
              onChange={e => setUserForm({ ...userForm, username: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Vai trò</label>
            <select
              className="form-select"
              value={userForm.role}
              onChange={e => setUserForm({ ...userForm, role: e.target.value })}
            >
              <option value="cashier">Thu ngân / Bán hàng</option>
              <option value="admin">Quản trị viên (Toàn quyền)</option>
            </select>
          </div>
        </div>

        <div className="form-row col-2">
          <div className="form-group">
            <label className="form-label">{editUserId ? 'Mật khẩu mới (Bỏ trống nếu không đổi)' : 'Mật khẩu *'}</label>
            <input
              type="password"
              className="form-input"
              value={userForm.password}
              onChange={e => setUserForm({ ...userForm, password: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Số điện thoại</label>
            <input
              className="form-input"
              value={userForm.phone}
              onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
