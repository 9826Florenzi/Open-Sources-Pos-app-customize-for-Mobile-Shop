# ❖ POS Quản Lý Bán Hàng

Phần mềm POS Quản lý Bán hàng chuyên sâu dành cho **Cửa hàng Điện thoại • Phụ kiện • Sửa chữa thiết bị di động**.  
Xây dựng trên nền tảng **Electron**, **React 19**, **TypeScript**, **Vite** và cơ sở dữ liệu siêu tốc **SQLite (better-sqlite3)**.

---

## ✨ Tính Năng Nổi Bật

### 1. 📱 Màn Hình Bán Hàng (POS) & Quản Lý IMEI
- Giao diện bán hàng trực quan, tốc độ cao, hỗ trợ máy quét mã vạch (Barcode Scanner).
- **Quản lý sản phẩm IMEI theo cấu hình:** Một dòng sản phẩm (VD: iPhone 15 Pro Max) có thể chứa nhiều máy với dung lượng, màu sắc, tình trạng và giá bán riêng biệt.
- **Tự động nhắc nhập khách hàng:** Khi chọn sản phẩm có IMEI, hệ thống tự động nhắc nhân viên chọn/thêm khách hàng để lưu thông tin bảo hành máy.
- **Lưu tạm đơn hàng (Park Order):** Cho phép treo đơn của khách hiện tại để phục vụ khách khác và mở lại bất cứ lúc nào.
- In hóa đơn nhiệt tự động qua máy in bill (hỗ trợ khổ giấy 80mm & 58mm).

### 2. 🏷️ In Tem Mã Vạch Kép (Xprinter XP-350B)
- Tương thích tốt nhất với dòng máy in tem nhiệt phổ biến **Xprinter XP-350B**.
- Hỗ trợ tem đôi (72x22mm, 74x22mm) và tem đơn (40x30mm).
- **Bộ căn chỉnh lệch tem kép độc quyền:** Cho phép điều chỉnh độc lập tem trái và tem phải.
- Tự động sinh mã SKU duy nhất theo định dạng chuẩn `SP00xxxx` khi sản phẩm chưa có mã.

### 3. 🔧 Quản Lý Dịch Vụ Sửa Chữa
- Tiếp nhận máy, tạo phiếu hẹn, ghi nhận lỗi, tình trạng máy khi nhận và tiền cọc.
- Phân tách chi phí rõ ràng: tiền công thợ, linh kiện thay thế, dịch vụ.
- Quy trình trạng thái minh bạch: *Đã tiếp nhận ➔ Đang kiểm tra ➔ Chờ linh kiện ➔ Đang sửa ➔ Đã hoàn thành ➔ Đã trả máy*.
- In phiếu biên nhận sửa chữa chuyên nghiệp cho khách hàng.

### 4. 📦 Quản Lý Kho & Đơn Nhập Hàng (PO)
- Tạo đơn đặt hàng/nhập hàng từ nhà cung cấp (Purchase Orders).
- Tự động cập nhật biến động kho (Stock Movements), giá vốn và công nợ nhà cung cấp.
- Cảnh báo sản phẩm sắp hết hàng theo mức tồn kho tối thiểu tùy chỉnh.

### 5. 👥 Quản Lý Khách Hàng & Công Nợ
- Quản lý danh bạ khách hàng, phân hạng nhóm, tích điểm mua hàng.
- Theo dõi công nợ chi tiết, hỗ trợ thanh toán nợ từng phần hoặc toàn bộ kèm ghi chú.

### 6. 📊 Báo Cáo & Phân Tích Lợi Nhuận
- Lưới thống kê 4 chỉ số tài chính tức thì: *Doanh thu hôm nay, Doanh thu tháng này, Lợi nhuận gộp tháng này (theo giá vốn thực tế), Doanh thu dịch vụ/sửa chữa*.
- Biểu đồ trực quan so sánh biến động Doanh thu & Lợi nhuận từng ngày trong tháng.
- Bảng **Top 10 Sản phẩm & Dịch vụ sinh lời cao nhất** (30 ngày gần nhất).

### 7. 🛡️ Phân Quyền (RBAC) & Bảo Mật
- Phân chia vai trò rõ ràng: **Quản trị viên (Admin)** và **Nhân viên (Employee)**.
- Tự động khóa / đăng xuất sau 15 phút không hoạt động để bảo vệ dữ liệu.
- Màn hình đăng nhập hỗ trợ bảng chọn tài khoản theo họ tên nhanh chóng.
- Hệ thống ghi nhật ký kiểm toán (Audit Logs) lưu vết mọi thao tác quan trọng.

### 8. 💾 Cơ Sở Dữ Liệu Cục Bộ & Tự Động Sao Lưu
- Dữ liệu lưu trữ 100% tại máy tính (`SQLite WAL Mode`), hoạt động mượt mà không cần internet.
- Tự động sao lưu cơ sở dữ liệu (`Auto Backup`) định kỳ, lưu trữ tối đa 14 bản gần nhất.

---

## 🛠️ Công Nghệ Sử Dụng

- **Desktop Framework:** [Electron 33](https://www.electronjs.org/)
- **Frontend:** [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Vite 6](https://vitejs.dev/)
- **Router:** React Router DOM v7
- **Database:** [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (SQLite cục bộ với WAL mode)
- **Charts:** [Recharts](https://recharts.org/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Barcode & Thermal Printing:** [JsBarcode](https://lindell.me/JsBarcode/), [node-thermal-printer](https://github.com/Klemen1337/node-thermal-printer)
- **Packager:** [electron-builder](https://www.electron.build/) (NSIS Installer)

---

## 🚀 Hướng Dẫn Cài Đặt & Phát Triển

### Yêu Cầu Hệ Thống
- Hệ điều hành: Windows 10/11 (64-bit)
- [Node.js](https://nodejs.org/) phiên bản `18.x` hoặc `20.x`
- npm hoặc yarn

### 1. Cài đặt Dependencies
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/POS_Quan_Ly_Ban_Hang.git
cd POS_Quan_Ly_Ban_Hang

# Cài đặt thư viện
npm install
```

### 2. Chạy Môi Trường Phát Triển (Development)
```bash
npm run dev
```
Ứng dụng sẽ đồng thời khởi chạy Vite Dev Server (`http://localhost:5173`) và cửa sổ ứng dụng Electron.

### 3. Đóng Gói Ứng Dụng (Production Build)
Biên dịch mã nguồn và kiểm tra type check:
```bash
npm run build
```

Đóng gói file cài đặt Windows Installer (`.exe`):
```bash
npm run dist:win
```
File cài đặt hoàn chỉnh sẽ được tạo tại thư mục `dist-electron-app/` (VD: `POS Quản Lý Bán Hàng Setup 2.0.0.exe`).

---

## 🔑 Tài Khoản Mặc Định Ban Đầu

Khi khởi chạy ứng dụng lần đầu tiên trên máy mới, cơ sở dữ liệu sẽ tự động được khởi tạo với tài khoản quản trị viên:

- **Tên đăng nhập:** `admin`
- **Mật khẩu:** `admin123`

*(Hệ thống sẽ yêu cầu đổi mật khẩu mới trong lần đăng nhập đầu tiên để đảm bảo tính an toàn)*.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
POS_Quan_Ly_Ban_Hang/
├── electron/                 # Mã nguồn Electron Main Process
│   ├── handlers/             # IPC Handlers (auth, products, orders, print, repair, ...)
│   ├── backup.ts             # Cơ chế tự động sao lưu SQLite
│   ├── db.ts                 # SQLite schema, migrations & seed data
│   ├── main.ts               # Electron BrowserWindow & lifecycle
│   ├── preload.ts            # ContextBridge an toàn giữa Main & Renderer
│   └── session.ts            # Quản lý phiên đăng nhập & RBAC
├── src/                      # Mã nguồn React Frontend (Renderer)
│   └── renderer/
│       ├── components/       # UI Components (Sidebar, Header, Modals, Pagination, BarcodeModal...)
│       ├── context/          # React Context (Auth, Notifications, Settings)
│       ├── pages/            # Màn hình chức năng (POS, Orders, Products, Repair, Reports, ...)
│       ├── types/            # TypeScript Type definitions
│       └── utils/            # Định dạng tiền tệ, ngày tháng
├── package.json              # Khai báo dependencies & build scripts
├── tsconfig.json             # Cấu hình TypeScript Frontend
├── tsconfig.electron.json    # Cấu hình TypeScript Electron Main
├── vite.config.ts            # Cấu hình đóng gói Vite
├── .gitignore                # Danh sách loại trừ khi đưa lên Git
├── .gitattributes            # Chuẩn hóa line endings
└── LICENSE                   # Giấy phép nguồn mở MIT
```

---

## 📄 Bản Quyền (License)

Dự án được phát hành theo giấy phép nguồn mở [MIT License](LICENSE). Tự do sử dụng, chỉnh sửa và đóng góp cho cộng đồng.
