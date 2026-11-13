# 🌍 TRIPLA — Nền tảng Du lịch & Video Shorts Trải Nghiệm Toàn Diện

> **TRIPLA Full-Stack Project** (Angular 20 Standalone + Express RESTful API + MongoDB Compass / Atlas Normalized ERD).

---

## 📋 Yêu cầu tiên quyết (Prerequisites)

Trước khi chạy, máy tính của bạn cần cài đặt:
1. **Node.js** (Khuyên dùng bản LTS `>= 18.x` hoặc `20.x`).
2. **MongoDB Community Server** hoặc **MongoDB Compass** (chạy tại cổng mặc định `mongodb://localhost:27017`).
3. **Git**.

---

## 🚀 Hướng Dẫn Chạy Dự Án Sau Khi Pull Về

### Bước 1: Pull code và chuyển vào nhánh mới nhất
```bash
git clone https://github.com/hoangvy10d/tripla-website.git
cd tripla-website

# Chuyển sang nhánh hoàn thiện nhất
git checkout feat/tripla-complete-system
```

---

### Bước 2: Khởi động Backend (`my-server-mongodb`)

Mở Terminal thứ nhất:

```bash
cd my-server-mongodb

# 1. Cài đặt các thư viện cần thiết
npm install

# 2. Nạp dữ liệu mẫu ban đầu vào MongoDB Compass (tự động tạo 15 collections chuẩn ERD + 37 reels/shorts + 18 khách sạn)
npm run seed

# 3. Khởi động máy chủ backend
npm start
# (Hoặc: node index.js)
```

> 🟢 **Backend sẽ chạy tại**: `http://localhost:3000`  
> * Endpoint kiểm tra sức khỏe hệ thống: `http://localhost:3000/api/v1/health`  
> * Kho hình ảnh & media nội bộ: `http://localhost:3000/data/...`

---

### Bước 3: Khởi động Frontend (`tripla_website`)

Mở Terminal thứ hai (giữ Terminal thứ nhất tiếp tục chạy):

```bash
cd tripla_website

# 1. Cài đặt các packages Angular
npm install

# 2. Khởi chạy ứng dụng Web
npm start
# (Hoặc: npx ng serve --port 4200)
```

> 🌐 **Frontend sẽ chạy tại**: `http://localhost:4200`  
> Hãy mở trình duyệt và truy cập `http://localhost:4200` để trải nghiệm!

---

## 🔑 Tài Khoản Demo Sẵn Có (Seed Accounts)

Hệ thống đã được nạp sẵn các tài khoản thử nghiệm theo phân quyền:

| Phân quyền | Email đăng nhập | Mật khẩu | Chức năng nổi bật |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@tripla.vn` | `admin123` | Quản lý kiểm duyệt Reels, duyệt bài đăng, xem doanh thu tại `/admin` |
| **Nhà sáng tạo (Creator)** | `creator@tripla.vn` | `creator123` | Upload video YouTube Shorts, quản lý video đã đăng, thông số tương tác tại `/creator` |
| **Khách du lịch (Tourist)** | `tourist@tripla.vn` | `user123` | Like, bình luận, lưu chuyến đi, giỏ hàng, đặt phòng khách sạn tại `/profile` |

---

## 🗄️ Cấu Trúc Dự Án (Project Structure)

```text
Tripla/
├── my-server-mongodb/         # Backend RESTful API (Express + Mongoose)
│   ├── compass_data/          # Dữ liệu nguồn JSON cho seed
│   ├── data/                  # Kho media 213 files (ảnh khách sạn, avatar, banners)
│   ├── database_export/       # Bản xuất JSON 25 collections MongoDB
│   ├── modules/               # 11 modules nghiệp vụ (reels, hotels, bookings, auth...)
│   ├── index.js               # Entry point chính của backend (port 3000)
│   ├── seed.js                # Script nạp dữ liệu chuẩn tự động
│   ├── import_db.js           # Script tự động import từ thư mục database_export
│   └── tripla_database.zip    # File zip trọn gói dữ liệu database để sao lưu
│
├── tripla_website/            # Frontend Web (Angular 20 + TypeScript + Tailwind/CSS)
│   ├── src/app/pages/         # Các trang chính:
│   │   ├── home/              # Trang chủ với thẻ khách sạn cân đối 3x2 & video hero
│   │   ├── tripshort/         # Mạng xã hội video du lịch (YouTube Shorts + Tua + Audio ON)
│   │   ├── creator/           # Creator Studio đăng tải video & thống kê
│   │   ├── trip-shop/         # Đặt phòng khách sạn, resort, vé xe, tour
│   │   ├── explore-map/       # Bản đồ tương tác du lịch
│   │   ├── admin/             # Trang quản trị phê duyệt nội dung
│   │   └── profile/           # Thông tin cá nhân & lịch sử đặt phòng
│   └── public/                # Ảnh tĩnh & video nền MP4
│
├── docs/                      # Tài liệu kiến trúc ERD, Flows & Data Contracts
└── scripts/                   # Script kiểm thử và tự động audit hệ thống
```

---

## 🛠️ Các Lệnh Hữu Ích Khác

* **Chạy kiểm thử tự động Frontend**:
  ```bash
  cd tripla_website
  npm test
  ```
* **Chạy kịch bản Audit toàn diện toàn dự án** (API + Database + Media):
  ```bash
  node scripts/full-project-audit.js
  ```
* **Sao lưu dữ liệu từ MongoDB ra file JSON**:
  ```bash
  cd my-server-mongodb
  npm run export-db
  ```

