# POS - Retail, Inventory & Repair Management System

A desktop Point of Sale (POS) and inventory management application tailored for mobile phone retail, accessories, and device repair businesses. Built with Electron, React 19, TypeScript, Vite, and an embedded SQLite database (better-sqlite3).

---

[English](#english) | [Tiếng Việt](#tiếng-việt)

---

<a name="english"></a>
## English Documentation

### Overview
This system is an offline-first desktop application designed for single-store retail operations. It combines rapid retail checkout with complex workflows specific to consumer electronics: serial/IMEI device variant tracking, repair ticketing with labor/parts cost decomposition, dual-column thermal barcode calibration, and purchase order management.

### Key Capabilities

#### 1. Point of Sale (POS) & IMEI Tracking
- Fast checkout interface optimized for barcode scanning and keyboard shortcuts.
- Multi-variant IMEI tracking: a single product model (e.g., iPhone 15 Pro Max) can manage distinct serial units, each with independent storage capacities, colors, cosmetic conditions, cost prices, and selling prices.
- Automated customer assignment prompt when an IMEI item is added to cart, ensuring warranty records are linked upon checkout.
- Parked order support: suspend current transactions to serve subsequent customers and resume anytime.
- Direct thermal receipt printing supporting standard 80mm and 58mm paper widths.

#### 2. Dual Barcode Label Calibration (Xprinter XP-350B)
- Optimized for the Xprinter XP-350B thermal label printer.
- Supports dual-label (72x22mm, 74x22mm) and single-label (40x30mm) formats.
- Independent horizontal offset calibration for left and right label columns (with right-column default set to -3mm offset calibration) to eliminate print drift.
- Calibration values are persisted locally in client storage.
- Automated SKU code generation formatted as `SP00xxxx` when creating items without barcodes.

#### 3. Device Repair Ticketing
- Comprehensive intake ticketing: device model, IMEI/serial, fault description, cosmetic condition upon reception, estimated delivery date, and deposit.
- Line item categorization distinguishing spare parts, service charges, and technician labor.
- Full ticket status progression: Received, Diagnosing, Awaiting Parts, Repairing, Completed, Returned, Cancelled.
- Printable service claim receipts for customers.

#### 4. Inventory & Purchase Orders (PO)
- Formal purchase order lifecycle for supplier procurement.
- Automatic inventory movement tracking (type, before/after quantity, unit cost, reference).
- Supplier account payable balance updates upon goods receipt.
- Configurable minimum stock warning thresholds.

#### 5. Customer Relationship Management & Receivables
- Customer profile directory with transaction history and reward point accumulation.
- Real-time accounts receivable tracking with partial or full debt settlement records.

#### 6. Financial Reporting & Profit Analytics
- Four primary key financial metrics: Daily Revenue, Monthly Revenue, Monthly Gross Profit (calculated from itemized inventory cost), and Service/Repair Revenue.
- Visual comparative charts for revenue vs. gross margin by day.
- Top 10 profitable products and services ranked by net profit over rolling 30-day windows.

#### 7. Role-Based Access Control & Security
- Distinct privilege tiers: Administrator and Employee.
- Session auto-lock / logout after 15 minutes of inactivity.
- Fast user profile selector on the authentication screen.
- Itemized audit trail recording critical actions, timestamps, and operator identities.

#### 8. Local Embedded Database & Automated Backups
- Embedded SQLite engine running in Write-Ahead Logging (WAL) mode for near-zero latency without external database servers.
- Automated daily database backup routines retaining up to 14 historical snapshots in local storage.

### Tech Stack
- Runtime & Packaging: Electron 33, electron-builder (NSIS)
- Frontend: React 19, TypeScript 5, Vite 6, React Router DOM v7
- Styling & Components: Custom modular CSS, Lucide Icons
- Data Visualization: Recharts
- Database: better-sqlite3 (SQLite 3 with WAL mode)
- Peripherals: node-thermal-printer, JsBarcode

### Prerequisites
- Operating System: Windows 10 or Windows 11 (64-bit)
- Node.js: v18.x or v20.x LTS
- Package Manager: npm (v9+)

### Installation & Development

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/POS_Quan_Ly_Ban_Hang.git
cd POS_Quan_Ly_Ban_Hang
```

2. Install dependencies:
```bash
npm install
```

3. Launch development environment:
```bash
npm run dev
```

### Production Build

1. Type-check and compile frontend and main process assets:
```bash
npm run build
```

2. Generate Windows NSIS installer package:
```bash
npm run dist:win
```
The resulting executable installer will be placed in the `dist-electron-app/` directory (e.g., `POS Quản Lý Bán Hàng Setup 2.0.0.exe`).

### Default Administrator Account
On a fresh installation, the database automatically seeds a default administrator account:
- Username: `admin`
- Password: `admin123`

The system requires changing the default password upon the first login.

### Project Layout
```
POS_Quan_Ly_Ban_Hang/
├── electron/                 # Electron main process source code
│   ├── handlers/             # Modular IPC handlers (auth, orders, products, repair, etc.)
│   ├── backup.ts             # SQLite automated backup routines
│   ├── db.ts                 # Database schema, migrations, and seed logic
│   ├── main.ts               # BrowserWindow creation and lifecycle management
│   ├── preload.ts            # Secure contextBridge API definition
│   └── session.ts            # Authentication state and RBAC enforcement
├── src/                      # React renderer source code
│   └── renderer/
│       ├── components/       # Reusable UI components (modals, pagination, barcode tools)
│       ├── context/          # React context providers (Auth, Notifications)
│       ├── pages/            # Application views (POS, Orders, Products, Repair, Reports)
│       ├── types/            # Global TypeScript definitions
│       └── utils/            # Currency and date formatting helpers
├── package.json              # Project metadata, scripts, and dependencies
├── tsconfig.json             # TypeScript configuration for the React renderer
├── tsconfig.electron.json    # TypeScript configuration for the Electron process
├── vite.config.ts            # Vite bundler configuration
├── .gitignore                # Git exclusions
├── .gitattributes            # Line ending normalization rules
└── LICENSE                   # MIT License
```

---

<a name="tiếng-việt"></a>
## Tài Liệu Tiếng Việt

### Tổng Quan
Hệ thống là ứng dụng máy tính (Desktop App) hoạt động độc lập (offline-first), được thiết kế chuyên biệt cho các cửa hàng bán lẻ điện thoại di động, phụ kiện công nghệ và dịch vụ sửa chữa thiết bị. Ứng dụng tích hợp quy trình bán hàng tốc độ cao cùng các nghiệp vụ đặc thù: quản lý máy theo số IMEI, bóc tách chi phí sửa chữa linh kiện và tiền công, in tem mã vạch nhiệt cân chỉnh hai cột và quản lý đơn nhập hàng nhà cung cấp.

### Các Tính Năng Trọng Tâm

#### 1. Màn Hình Bán Hàng (POS) & Quản Lý IMEI
- Giao diện bán hàng tối ưu cho đầu đọc mã vạch và thao tác bàn phím nhanh.
- Quản lý máy IMEI theo cấu hình chi tiết: một dòng sản phẩm (ví dụ iPhone 15 Pro Max) có thể quản lý nhiều máy với dung lượng, màu sắc, tình trạng ngoại quan, giá nhập và giá bán riêng biệt.
- Tự động bật hộp thoại chọn hoặc thêm khách hàng khi đưa sản phẩm IMEI vào đơn, đảm bảo liên kết dữ liệu bảo hành ngay khi thanh toán.
- Chức năng lưu tạm đơn hàng: tạm dừng giao dịch hiện tại để thanh toán cho khách tiếp theo và khôi phục lại bất kỳ lúc nào.
- In hóa đơn trực tiếp qua máy in nhiệt hỗ trợ khổ giấy tiêu chuẩn 80mm và 58mm.

#### 2. Cân Chỉnh In Tem Mã Vạch Kép (Xprinter XP-350B)
- Tương thích chuyên sâu với dòng máy in tem nhiệt Xprinter XP-350B.
- Hỗ trợ định dạng tem đôi (72x22mm, 74x22mm) và tem đơn (40x30mm).
- Bộ công cụ căn chỉnh độ lệch ngang độc lập cho cột tem trái và cột tem phải (cột phải mặc định mốc 0mm được đặt sẵn độ dịch -3mm) giúp loại bỏ hiện tượng lệch lề khi in.
- Toàn bộ giá trị cân chỉnh được lưu tự động trên bộ nhớ cục bộ của máy.
- Tự động tạo mã SKU duy nhất theo định dạng `SP00xxxx` khi tạo sản phẩm chưa có mã vạch.

#### 3. Tiếp Nhận & Quản Lý Sửa Chữa
- Quy trình tiếp nhận thiết bị đầy đủ: thông tin máy, số IMEI/Serial, mô tả lỗi, tình trạng ngoại quan khi nhận, ngày hẹn trả và số tiền tạm ứng.
- Bóc tách chi phí rõ ràng giữa linh kiện thay thế, phí dịch vụ và tiền công kỹ thuật.
- Theo dõi trạng thái sửa chữa theo chu trình: Đã tiếp nhận, Đang kiểm tra, Chờ linh kiện, Đang sửa, Đã hoàn thành, Đã trả máy, Đã hủy.
- In phiếu biên nhận dịch vụ sửa chữa cho khách hàng.

#### 4. Quản Lý Kho & Đơn Nhập Hàng (PO)
- Quản lý vòng đời đơn nhập hàng từ nhà cung cấp.
- Tự động ghi nhận lịch sử biến động kho (loại giao dịch, số lượng trước/sau, đơn giá vốn, mã tham chiếu).
- Tự động cộng dồn công nợ phải trả nhà cung cấp khi nhận hàng.
- Cấu hình mức tồn kho tối thiểu để đưa ra cảnh báo kịp thời.

#### 5. Khách Hàng & Quản Lý Công Nợ
- Quản lý hồ sơ khách hàng, phân nhóm khách hàng và tích lũy điểm thưởng.
- Theo dõi số dư công nợ theo thời gian thực, hỗ trợ thanh toán từng phần hoặc tất toán kèm lịch sử ghi chú.

#### 6. Báo Cáo Tài Chính & Phân Tích Lợi Nhuận
- Bốn chỉ số tài chính trọng yếu: Doanh thu hôm nay, Doanh thu tháng này, Lợi nhuận gộp tháng này (tính trên giá vốn thực tế của từng sản phẩm đã bán), và Doanh thu dịch vụ/sửa chữa.
- Biểu đồ đối chiếu trực quan biến động giữa doanh thu và lợi nhuận thuần theo từng ngày.
- Bảng thống kê Top 10 sản phẩm và dịch vụ mang lại lợi nhuận cao nhất trong 30 ngày gần nhất.

#### 7. Phân Quyền & Bảo Mật Hệ Thống
- Phân cấp quyền hạn: Quản trị viên (Admin) và Nhân viên bán hàng (Employee).
- Tự động khóa màn hình và đăng xuất phiên làm việc sau 15 phút không hoạt động.
- Danh sách chọn tài khoản đăng nhập nhanh theo tên nhân viên.
- Nhật ký kiểm toán (Audit Log) ghi nhận thời gian, danh tính người thao tác và chi tiết mọi biến động dữ liệu.

#### 8. Cơ Sở Dữ Liệu Cục Bộ & Tự Động Sao Lưu
- Sử dụng cơ sở dữ liệu SQLite nhúng với chế độ WAL cho tốc độ truy xuất tức thì mà không cần cài đặt máy chủ dữ liệu.
- Cơ chế tự động sao lưu định kỳ lưu trữ tối đa 14 bản sao lưu gần nhất tại máy tính.

### Công Nghệ Sử Dụng
- Nền tảng & Đóng gói: Electron 33, electron-builder (NSIS)
- Giao diện: React 19, TypeScript 5, Vite 6, React Router DOM v7
- Thiết kế: CSS Module tùy biến, Lucide Icons
- Biểu đồ: Recharts
- Cơ sở dữ liệu: better-sqlite3 (SQLite 3 WAL mode)
- Thiết bị ngoại vi: node-thermal-printer, JsBarcode

### Yêu Cầu Môi Trường
- Hệ điều hành: Windows 10 hoặc Windows 11 (64-bit)
- Node.js: phiên bản v18.x hoặc v20.x LTS
- Trình quản lý gói: npm (v9 trở lên)

### Cài Đặt & Phát Triển

1. Sao chép mã nguồn:
```bash
git clone https://github.com/YOUR_USERNAME/POS_Quan_Ly_Ban_Hang.git
cd POS_Quan_Ly_Ban_Hang
```

2. Cài đặt các gói phụ thuộc:
```bash
npm install
```

3. Khởi chạy ứng dụng ở chế độ phát triển:
```bash
npm run dev
```

### Đóng Gói Ứng Dụng

1. Kiểm tra mã nguồn và biên dịch các tệp:
```bash
npm run build
```

2. Tạo tệp cài đặt Windows NSIS:
```bash
npm run dist:win
```
Tệp cài đặt hoàn chỉnh sẽ nằm trong thư mục `dist-electron-app/` (ví dụ: `POS Quản Lý Bán Hàng Setup 2.0.0.exe`).

### Tài Khoản Quản Trị Mặc Định
Sau khi cài đặt lần đầu trên máy tính mới, hệ thống tự động khởi tạo tài khoản quản trị:
- Tên đăng nhập: `admin`
- Mật khẩu: `admin123`

Hệ thống sẽ yêu cầu đổi mật khẩu mới trong lần đăng nhập đầu tiên.

---

## License

This project is licensed under the terms of the [MIT License](LICENSE).
