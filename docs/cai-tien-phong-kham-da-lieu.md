# 🏥 Cải Tiến Đề Tài: Hệ Thống Quản Lý Phòng Khám Da Liễu

> **Phiên bản nâng cấp** từ PHP thuần → Python FastAPI + JavaScript React + MySQL  
> **Môi trường phát triển:** Visual Studio Code 2026  
> **Mục tiêu:** Hệ thống đầy đủ nghiệp vụ, sẵn sàng triển khai thực tế

---

## 📋 Mục Lục

1. [Tổng quan cải tiến](#1-tổng-quan-cải-tiến)
2. [Tech Stack & Lý do lựa chọn](#2-tech-stack--lý-do-lựa-chọn)
3. [Cài đặt môi trường VS Code 2026](#3-cài-đặt-môi-trường-vs-code-2026)
4. [Kiến trúc hệ thống](#4-kiến-trúc-hệ-thống)
5. [Cơ sở dữ liệu MySQL - Thiết kế chi tiết](#5-cơ-sở-dữ-liệu-mysql---thiết-kế-chi-tiết)
6. [Nghiệp vụ chi tiết theo từng Module](#6-nghiệp-vụ-chi-tiết-theo-từng-module)
7. [Backend Python FastAPI - Cấu trúc & API](#7-backend-python-fastapi---cấu-trúc--api)
8. [Frontend JavaScript React - Cấu trúc & Màn hình](#8-frontend-javascript-react---cấu-trúc--màn-hình)
9. [Luồng nghiệp vụ đầy đủ](#9-luồng-nghiệp-vụ-đầy-đủ)
10. [Bảo mật hệ thống](#10-bảo-mật-hệ-thống)
11. [So sánh trước và sau cải tiến](#11-so-sánh-trước-và-sau-cải-tiến)

---

## 1. Tổng Quan Cải Tiến

### Vấn đề của phiên bản cũ (PHP thuần)

| Hạn chế | Mô tả |
|---|---|
| Kiến trúc không tách biệt | PHP xử lý cả logic lẫn giao diện trong cùng file |
| Thiếu module thanh toán | Không có hóa đơn, thu ngân |
| Thiếu kê đơn thuốc | Không quản lý đơn thuốc, kho dược |
| Bảo mật yếu | Nguy cơ SQL Injection nếu không dùng Prepared Statements |
| Không có báo cáo | Admin không xem được thống kê doanh thu |
| Không responsive | Giao diện không tương thích mobile |
| Không có API | Không thể mở rộng thành mobile app sau này |

### Những gì được thêm mới

- ✅ **5 roles** thay vì 3: Bệnh nhân, Bác sĩ, Lễ tân, Thu ngân, Dược sĩ
- ✅ **Module kê đơn thuốc** và quản lý kho dược
- ✅ **Module thanh toán** và xuất hóa đơn
- ✅ **Dashboard thống kê** doanh thu, lịch khám, tồn kho
- ✅ **REST API chuẩn** — dễ mở rộng thành mobile app
- ✅ **Responsive** — tương thích mọi thiết bị
- ✅ **Realtime thông báo** qua WebSocket
- ✅ **Bảo mật chuẩn** JWT, bcrypt, CORS, input validation

### Nguyên tắc phạm vi triển khai thực tế

- **Phase 1** tập trung vào vận hành nội bộ phòng khám: đặt lịch, check-in, khám, kê đơn, thu tiền, xuất thuốc, báo cáo
- **BHYT** trong tài liệu này chỉ nên hiểu là **hỗ trợ nhập mức hỗ trợ/giảm trừ nội bộ**, chưa mặc định là tích hợp claim BHYT với cơ quan bảo hiểm
- **Kho thuốc** quản lý theo **lô nhập/hạn dùng** để tránh sai lệch tồn kho khi có nhiều lần nhập cùng một thuốc
- **Thanh toán** tách thành **hóa đơn**, **dòng chi tiết**, **giao dịch thanh toán** để hỗ trợ trả nhiều lần, hoàn tiền, đối soát

---

## 2. Tech Stack & Lý Do Lựa Chọn

### Backend — Python + FastAPI

```
Python 3.11+
├── FastAPI          — Web framework hiệu năng cao, tự động sinh Swagger docs
├── SQLAlchemy       — ORM kết nối MySQL, quản lý model và migration
├── Alembic          — Database migration (thay đổi schema không mất dữ liệu)
├── Pydantic v2      — Validate dữ liệu đầu vào tự động
├── python-jose      — Tạo và xác thực JWT token
├── passlib[bcrypt]  — Mã hóa mật khẩu an toàn
├── python-multipart — Upload file (ảnh bác sĩ, kết quả xét nghiệm)
├── fastapi-mail     — Gửi email thông báo tự động
└── pymysql          — Driver kết nối MySQL
```

**Lý do chọn FastAPI thay vì Flask/Django:**
- Nhanh gấp 2-3 lần Flask nhờ async/await
- Tự động sinh Swagger UI tại `/docs` — test API không cần Postman
- Type hints + Pydantic giúp validate request/response tự động
- Gần với cách viết code hiện đại, dễ maintain

### Frontend — JavaScript + React

```
Node.js 20+ / npm
├── React 19 + Vite  — UI library + build tool cực nhanh
├── React Router v6  — Điều hướng giữa các trang
├── TailwindCSS v3   — Utility-first CSS, responsive dễ dàng
├── ShadcnUI         — Bộ component UI đẹp, có sẵn: Table, Dialog, Form...
├── React Query v5   — Quản lý state server, cache API call tự động
├── Axios            — HTTP client gọi API backend
├── React Hook Form  — Quản lý form, validate phía client
├── Recharts         — Vẽ biểu đồ doanh thu, thống kê
├── date-fns         — Xử lý ngày giờ lịch hẹn
└── Socket.IO client — Nhận thông báo realtime
```

### Database — MySQL 8.0

```
MySQL 8.0+
├── InnoDB Engine     — Hỗ trợ Foreign Key, Transaction
├── utf8mb4 charset   — Hỗ trợ tiếng Việt và emoji
└── Kết nối qua SQLAlchemy (ORM) từ Python backend
```

### Môi trường phát triển

```
Visual Studio Code 2026
├── Extension: Python (Microsoft)
├── Extension: Pylance
├── Extension: ES7+ React/Redux/React-Native snippets
├── Extension: Tailwind CSS IntelliSense
├── Extension: Thunder Client (test API thay Postman)
├── Extension: MySQL (cweijan) — xem database trong VS Code
├── Extension: GitLens
└── Extension: Prettier + ESLint
```

---

## 3. Cài Đặt Môi Trường VS Code 2026

### Bước 1: Cài đặt phần mềm cần thiết

```bash
# Kiểm tra Python
python --version  # cần >= 3.11

# Kiểm tra Node.js
node --version    # cần >= 20

# Kiểm tra MySQL
mysql --version   # cần >= 8.0
```

### Bước 2: Khởi tạo Backend Python

```bash
# Tạo thư mục dự án
mkdir phong-kham-da-lieu
cd phong-kham-da-lieu

# Tạo virtual environment
python -m venv venv

# Kích hoạt (Windows)
venv\Scripts\activate
# Kích hoạt (Mac/Linux)
source venv/bin/activate

# Cài dependencies
pip install fastapi uvicorn sqlalchemy alembic pymysql \
            python-jose[cryptography] passlib[bcrypt] \
            python-multipart fastapi-mail pydantic-settings
```

### Bước 3: Khởi tạo Frontend React

```bash
# Tạo project React với Vite
npm create vite@latest frontend -- --template react
cd frontend
npm install

# Cài thêm packages
npm install axios react-router-dom @tanstack/react-query \
            react-hook-form @hookform/resolvers zod \
            recharts date-fns socket.io-client

# Cài TailwindCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Bước 4: Tạo database MySQL

```sql
-- Chạy trong MySQL Workbench hoặc terminal
CREATE DATABASE phong_kham_da_lieu
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE USER 'pkdl_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON phong_kham_da_lieu.* TO 'pkdl_user'@'localhost';
FLUSH PRIVILEGES;
```

### Bước 5: Cấu hình kết nối .env

```env
# backend/.env
DATABASE_URL=mysql+pymysql://pkdl_user:your_password@localhost:3306/phong_kham_da_lieu
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_gmail_app_password
MAIL_FROM=noreply@phongkhamdalieu.vn
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
```

---

## 4. Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT BROWSER                     │
│         React + Vite (chạy port 5173)               │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP Request / WebSocket
                       ▼
┌─────────────────────────────────────────────────────┐
│              PYTHON FASTAPI SERVER                   │
│               (chạy port 8000)                       │
│  /docs  → Swagger UI tự động                        │
│  /api/v1/auth      → Authentication                 │
│  /api/v1/patients  → Quản lý bệnh nhân              │
│  /api/v1/doctors   → Quản lý bác sĩ                 │
│  /api/v1/appointments → Lịch hẹn                    │
│  /api/v1/medical-records → Hồ sơ bệnh               │
│  /api/v1/prescriptions → Đơn thuốc                  │
│  /api/v1/medicines → Kho dược                       │
│  /api/v1/invoices  → Hóa đơn                        │
│  /api/v1/reports   → Báo cáo & thống kê             │
│  /ws               → WebSocket thông báo            │
└──────────────────────┬──────────────────────────────┘
                       │ SQLAlchemy ORM
                       ▼
┌─────────────────────────────────────────────────────┐
│                 MySQL 8.0 DATABASE                   │
│            phong_kham_da_lieu                        │
│  16 bảng chính + indexes + foreign keys             │
└─────────────────────────────────────────────────────┘
```

---

## 5. Cơ Sở Dữ Liệu MySQL - Thiết Kế Chi Tiết

### Sơ đồ quan hệ tổng quát

```
users ──┬── patients ──── appointments ──────── medical_records ──── prescriptions ──── prescription_items
        │         │             │         │                                  │                    │
        │         │             │         └── appointment_services           │                 medicines
        │         │             │                      │                     │                    │
        │         │             └──────── invoices ────┘────── invoice_items │             medicine_batches
        │         │                           │                              │                    │
        │         │                    payment_transactions                  │              inventory_logs
        │         │                                                          │
        ├── doctors ──┬── doctor_schedules                                   │
        │             ├── doctor_leave                                       │
        │             └── clinic_holidays                                    │
        └── notifications
```

### Chi tiết từng bảng

---

#### Bảng `users` — Tài khoản hệ thống

```sql
CREATE TABLE users (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
    role        ENUM('admin','doctor','receptionist','cashier','pharmacist','patient')
                NOT NULL DEFAULT 'patient',
    full_name   VARCHAR(100) NOT NULL,
    phone       VARCHAR(15),
    avatar_url  VARCHAR(500),
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    email_verified_at DATETIME,
    last_login  DATETIME,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Giải thích role:**
- `admin` — Quản trị toàn hệ thống
- `doctor` — Bác sĩ khám bệnh
- `receptionist` — Lễ tân xác nhận lịch, check-in
- `cashier` — Thu ngân lập và thu hóa đơn
- `pharmacist` — Dược sĩ xuất thuốc, quản lý kho
- `patient` — Bệnh nhân đặt lịch

---

#### Bảng `patients` — Hồ sơ bệnh nhân

```sql
CREATE TABLE patients (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id           INT UNSIGNED NOT NULL UNIQUE,
    date_of_birth     DATE,
    gender            ENUM('male','female','other'),
    blood_type        ENUM('A+','A-','B+','B-','O+','O-','AB+','AB-'),
    address           TEXT,
    insurance_number  VARCHAR(50) COMMENT 'Số BHYT',
    insurance_expire  DATE,
    occupation        VARCHAR(100),
    emergency_contact_name  VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    allergy_notes     TEXT COMMENT 'Ghi chú dị ứng thuốc',
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### Bảng `doctors` — Thông tin bác sĩ

```sql
CREATE TABLE doctors (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id           INT UNSIGNED NOT NULL UNIQUE,
    specialty         VARCHAR(100) NOT NULL COMMENT 'Chuyên khoa (Da liễu, Thẩm mỹ da...)',
    license_number    VARCHAR(50) NOT NULL UNIQUE COMMENT 'Số chứng chỉ hành nghề',
    degree            VARCHAR(100) COMMENT 'Bằng cấp (Tiến sĩ, Thạc sĩ...)',
    experience_years  INT UNSIGNED DEFAULT 0,
    consultation_fee  DECIMAL(12,0) NOT NULL DEFAULT 200000 COMMENT 'Phí khám (VNĐ)',
    bio               TEXT,
    is_available      TINYINT(1) DEFAULT 1,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### Bảng `doctor_schedules` — Lịch làm việc bác sĩ

```sql
CREATE TABLE doctor_schedules (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    doctor_id       INT UNSIGNED NOT NULL,
    day_of_week     TINYINT NOT NULL COMMENT '0=CN, 1=T2, ..., 6=T7',
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    slot_duration   INT NOT NULL DEFAULT 30 COMMENT 'Phút/lượt khám',
    max_patients    INT NOT NULL DEFAULT 20,
    is_active       TINYINT(1) DEFAULT 1,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    UNIQUE KEY uq_doctor_day (doctor_id, day_of_week, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### Bảng `doctor_leave` — Ngày nghỉ đột xuất của bác sĩ

> Khi bác sĩ xin nghỉ một ngày cụ thể, hệ thống phải ngăn không cho đặt lịch vào ngày đó dù `doctor_schedules` vẫn còn slot.

```sql
CREATE TABLE doctor_leave (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    doctor_id   INT UNSIGNED NOT NULL,
    leave_date  DATE NOT NULL,
    reason      VARCHAR(200),
    created_by  INT UNSIGNED NOT NULL COMMENT 'Admin/lễ tân ghi nhận',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE KEY uq_doc_date (doctor_id, leave_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### Bảng `clinic_holidays` — Ngày nghỉ lễ / phòng khám đóng cửa

```sql
CREATE TABLE clinic_holidays (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    holiday_date DATE NOT NULL UNIQUE,
    name         VARCHAR(100) NOT NULL COMMENT 'VD: Tết Nguyên Đán, 30/4...',
    is_active    TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> Logic `GET /api/v1/appointments/available-slots` phải kiểm tra cả `doctor_leave` lẫn `clinic_holidays` trước khi trả slot trống.

---

#### Bảng `services` — Dịch vụ khám

```sql
CREATE TABLE services (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    category    VARCHAR(100) COMMENT 'Điều trị mụn, Laser, Chăm sóc da...',
    description TEXT,
    price       DECIMAL(12,0) NOT NULL,
    duration    INT NOT NULL DEFAULT 30 COMMENT 'Thời gian thực hiện (phút)',
    is_active   TINYINT(1) DEFAULT 1,
    image_url   VARCHAR(500),
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### Bảng `appointment_services` — Dịch vụ thực hiện trong buổi khám

> Phòng khám da liễu thường thực hiện **nhiều dịch vụ trong cùng một lần khám** (VD: chiết xuất nhân mụn + laser + chăm sóc cơ bản). Bảng này lưu danh sách đầy đủ các dịch vụ đã làm, được Thu ngân hoặc Bác sĩ bổ sung trong quá trình khám.

```sql
CREATE TABLE appointment_services (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    appointment_id  INT UNSIGNED NOT NULL,
    service_id      INT UNSIGNED NOT NULL,
    quantity        INT NOT NULL DEFAULT 1,
    unit_price      DECIMAL(12,0) NOT NULL COMMENT 'Snapshot giá tại thời điểm thực hiện',
    added_by        INT UNSIGNED NOT NULL COMMENT 'user_id người thêm dịch vụ (bác sĩ/lễ tân)',
    added_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT COMMENT 'Ghi chú riêng cho dịch vụ này',
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (added_by) REFERENCES users(id),
    INDEX idx_appointment (appointment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Luồng sử dụng:**
- Khi đặt lịch: tự động thêm `primary_service_id` vào `appointment_services`
- Trong lúc khám: bác sĩ/lễ tân có thể thêm dịch vụ phát sinh
- Khi lập hóa đơn: hệ thống tổng hợp từ `appointment_services` (không cần nhập tay)

---

#### Bảng `appointments` — Lịch hẹn

```sql
CREATE TABLE appointments (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    patient_id          INT UNSIGNED NOT NULL,
    doctor_id           INT UNSIGNED NOT NULL,
    primary_service_id  INT UNSIGNED COMMENT 'Dịch vụ chính / phân loại lịch hẹn',
    visit_type          ENUM('scheduled','walk_in','follow_up')
                        NOT NULL DEFAULT 'scheduled',
    booking_source      ENUM('patient_app','phone','frontdesk','admin')
                        NOT NULL DEFAULT 'patient_app',
    appointment_date    DATE NOT NULL,
    appointment_time    TIME NOT NULL,
    duration_minutes    INT NOT NULL DEFAULT 30,
    status              ENUM('pending','confirmed','checked_in','in_progress',
                             'completed','cancelled','no_show')
                        NOT NULL DEFAULT 'pending',
    queue_number        INT COMMENT 'Số thứ tự trong ngày',
    chief_complaint     TEXT COMMENT 'Lý do khám / triệu chứng chính',
    cancel_reason       TEXT,
    cancelled_by        INT UNSIGNED COMMENT 'user_id người hủy',
    cancelled_at        DATETIME,
    confirmed_at        DATETIME,
    checked_in_at       DATETIME,
    started_at          DATETIME,
    completed_at        DATETIME,
    rescheduled_from_id INT UNSIGNED COMMENT 'Lịch gốc nếu đây là lịch đổi',
    reminder_24h_sent   TINYINT(1) DEFAULT 0 COMMENT 'Đã gửi nhắc trước 24 tiếng',
    reminder_2h_sent    TINYINT(1) DEFAULT 0 COMMENT 'Đã gửi nhắc trước 2 tiếng',
    notes               TEXT COMMENT 'Ghi chú thêm của lễ tân',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    FOREIGN KEY (primary_service_id) REFERENCES services(id),
    FOREIGN KEY (rescheduled_from_id) REFERENCES appointments(id),
    INDEX idx_date_doctor (appointment_date, doctor_id),
    INDEX idx_patient (patient_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> **Lưu ý:** `primary_service_id` chỉ dùng để phân loại lịch hẹn. Danh sách dịch vụ thực tế thực hiện trong buổi khám được quản lý ở bảng `appointment_services` bên dưới.

**Giải thích trạng thái:**
- `pending` — Vừa đặt, chờ lễ tân xác nhận
- `confirmed` — Lễ tân đã xác nhận, đã gửi email
- `checked_in` — Bệnh nhân đã đến, lễ tân check-in
- `in_progress` — Đang khám với bác sĩ
- `completed` — Khám xong, có kết quả
- `cancelled` — Đã hủy (bệnh nhân hoặc phòng khám)
- `no_show` — Bệnh nhân không đến

---

#### Bảng `medical_records` — Hồ sơ bệnh án

```sql
CREATE TABLE medical_records (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    appointment_id      INT UNSIGNED NOT NULL UNIQUE,
    patient_id          INT UNSIGNED NOT NULL,
    doctor_id           INT UNSIGNED NOT NULL,
    symptoms            TEXT COMMENT 'Triệu chứng bệnh nhân mô tả',
    clinical_findings   TEXT COMMENT 'Kết quả thăm khám lâm sàng',
    diagnosis           VARCHAR(500) NOT NULL COMMENT 'Chẩn đoán bệnh',
    icd10_code          VARCHAR(20) COMMENT 'Mã ICD-10 của bệnh',
    treatment_plan      TEXT COMMENT 'Phác đồ điều trị',
    follow_up_date      DATE COMMENT 'Ngày tái khám',
    follow_up_notes     TEXT,
    doctor_notes        TEXT COMMENT 'Ghi chú riêng của bác sĩ',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    INDEX idx_patient (patient_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### Bảng `medicines` — Danh mục thuốc

```sql
CREATE TABLE medicines (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(200) NOT NULL,
    generic_name        VARCHAR(200) COMMENT 'Tên hoạt chất',
    category            VARCHAR(100) COMMENT 'Kháng sinh, Corticoid, Kem bôi...',
    unit                VARCHAR(20) NOT NULL COMMENT 'Viên, Lọ, Tuýp, ml...',
    price_per_unit      DECIMAL(12,0) NOT NULL COMMENT 'Giá/đơn vị (VNĐ)',
    current_stock       INT NOT NULL DEFAULT 0 COMMENT 'Tồn tổng hợp từ các lô còn hiệu lực',
    reorder_level       INT NOT NULL DEFAULT 50 COMMENT 'Cảnh báo khi tồn kho < mức này',
    manufacturer        VARCHAR(200),
    storage_conditions  VARCHAR(200) COMMENT 'Điều kiện bảo quản',
    description         TEXT,
    is_active           TINYINT(1) DEFAULT 1,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_category (category),
    INDEX idx_stock (current_stock)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> `medicines` là master danh mục. Hạn dùng, giá nhập và tồn thực tế theo từng lần nhập được quản lý ở bảng `medicine_batches`.

---

#### Bảng `medicine_batches` — Lô nhập thuốc

```sql
CREATE TABLE medicine_batches (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    medicine_id         INT UNSIGNED NOT NULL,
    batch_number        VARCHAR(100) NOT NULL,
    expiry_date         DATE NOT NULL,
    import_quantity     INT NOT NULL,
    remaining_quantity  INT NOT NULL,
    import_unit_cost    DECIMAL(12,0) NOT NULL DEFAULT 0,
    supplier_name       VARCHAR(200),
    imported_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id),
    UNIQUE KEY uq_batch (medicine_id, batch_number),
    INDEX idx_expiry (expiry_date),
    INDEX idx_remaining (remaining_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### Bảng `prescriptions` — Đơn thuốc

```sql
CREATE TABLE prescriptions (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    medical_record_id   INT UNSIGNED NOT NULL UNIQUE,
    doctor_id           INT UNSIGNED NOT NULL,
    patient_id          INT UNSIGNED NOT NULL,
    status              ENUM('pending','prepared','awaiting_payment',
                             'partially_dispensed','dispensed','cancelled')
                        NOT NULL DEFAULT 'pending',
    prepared_by         INT UNSIGNED COMMENT 'user_id dược sĩ chuẩn bị thuốc',
    prepared_at         DATETIME,
    dispensed_by        INT UNSIGNED COMMENT 'user_id dược sĩ xuất thuốc',
    dispensed_at        DATETIME,
    picked_up_at        DATETIME COMMENT 'Bệnh nhân đã nhận thuốc',
    notes               TEXT COMMENT 'Lưu ý chung của đơn thuốc',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medical_record_id) REFERENCES medical_records(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (prepared_by) REFERENCES users(id),
    FOREIGN KEY (dispensed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### Bảng `prescription_items` — Chi tiết đơn thuốc

```sql
CREATE TABLE prescription_items (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    prescription_id INT UNSIGNED NOT NULL,
    medicine_id     INT UNSIGNED NOT NULL,
    quantity        INT NOT NULL COMMENT 'Số lượng kê',
    dispensed_quantity INT NOT NULL DEFAULT 0 COMMENT 'Số lượng đã giao thực tế',
    dosage          VARCHAR(100) NOT NULL COMMENT 'Liều dùng (VD: 1 viên)',
    frequency       VARCHAR(100) NOT NULL COMMENT 'Tần suất (VD: 2 lần/ngày)',
    duration_days   INT COMMENT 'Số ngày dùng',
    instruction     TEXT COMMENT 'Hướng dẫn dùng chi tiết (trước/sau ăn...)',
    unit_price      DECIMAL(12,0) NOT NULL COMMENT 'Giá tại thời điểm kê đơn',
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### Bảng `invoices` — Hóa đơn

```sql
CREATE TABLE invoices (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    appointment_id      INT UNSIGNED NOT NULL UNIQUE,
    patient_id          INT UNSIGNED NOT NULL,
    cashier_id          INT UNSIGNED COMMENT 'Thu ngân tạo hóa đơn',
    invoice_number      VARCHAR(20) NOT NULL UNIQUE COMMENT 'PKD-2026-0001',
    invoice_status      ENUM('draft','issued','partially_paid','paid','cancelled','refunded')
                        NOT NULL DEFAULT 'draft',
    subtotal_amount     DECIMAL(12,0) NOT NULL DEFAULT 0,
    discount_amount     DECIMAL(12,0) NOT NULL DEFAULT 0,
    discount_reason     VARCHAR(200),
    approved_discount_by INT UNSIGNED COMMENT 'Người duyệt giảm giá nếu vượt ngưỡng',
    insurance_support_amount DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT 'Mức hỗ trợ nội bộ/BHYT nhập tay',
    total_amount        DECIMAL(12,0) NOT NULL COMMENT 'Sau giảm giá/hỗ trợ',
    paid_amount         DECIMAL(12,0) NOT NULL DEFAULT 0,
    payment_status      ENUM('unpaid','partial','paid','refunded')
                        NOT NULL DEFAULT 'unpaid',
    notes               TEXT,
    paid_at             DATETIME,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (cashier_id) REFERENCES users(id),
    FOREIGN KEY (approved_discount_by) REFERENCES users(id),
    INDEX idx_patient (patient_id),
    INDEX idx_status (payment_status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### Bảng `invoice_items` — Dòng chi tiết hóa đơn

```sql
CREATE TABLE invoice_items (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_id       INT UNSIGNED NOT NULL,
    item_type        ENUM('exam','service','medicine','other') NOT NULL,
    reference_id     INT UNSIGNED COMMENT 'service_id / prescription_item_id ...',
    description      VARCHAR(255) NOT NULL,
    quantity         INT NOT NULL DEFAULT 1,
    unit_price       DECIMAL(12,0) NOT NULL,
    line_total       DECIMAL(12,0) NOT NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX idx_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### Bảng `payment_transactions` — Giao dịch thanh toán

```sql
CREATE TABLE payment_transactions (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_id          INT UNSIGNED NOT NULL,
    transaction_type    ENUM('payment','refund') NOT NULL DEFAULT 'payment',
    payment_method      ENUM('cash','card','transfer','insurance_support','other') NOT NULL,
    amount              DECIMAL(12,0) NOT NULL,
    transaction_ref     VARCHAR(100) COMMENT 'Mã giao dịch ngân hàng/POS',
    status              ENUM('pending','success','failed','cancelled')
                        NOT NULL DEFAULT 'success',
    created_by          INT UNSIGNED NOT NULL,
    approved_by         INT UNSIGNED COMMENT 'Duyệt hoàn tiền hoặc giao dịch nhạy cảm',
    paid_at             DATETIME,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX idx_invoice (invoice_id),
    INDEX idx_paid_at (paid_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### Bảng `inventory_logs` — Lịch sử xuất nhập kho

```sql
CREATE TABLE inventory_logs (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    medicine_id     INT UNSIGNED NOT NULL,
    batch_id        INT UNSIGNED COMMENT 'Lô bị tác động nếu có',
    user_id         INT UNSIGNED NOT NULL COMMENT 'Người thực hiện',
    action          ENUM('import','export','adjust','expired') NOT NULL,
    quantity_change INT NOT NULL COMMENT 'Dương = nhập, Âm = xuất',
    quantity_before INT NOT NULL,
    quantity_after  INT NOT NULL,
    reference_id    INT UNSIGNED COMMENT 'prescription_id nếu là xuất theo đơn',
    reference_type  VARCHAR(50),
    notes           TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id),
    FOREIGN KEY (batch_id) REFERENCES medicine_batches(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### Bảng `notifications` — Thông báo

```sql
CREATE TABLE notifications (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    title       VARCHAR(200) NOT NULL,
    message     TEXT NOT NULL,
    type        ENUM('appointment','prescription','invoice','system','reminder')
                NOT NULL DEFAULT 'system',
    is_read     TINYINT(1) NOT NULL DEFAULT 0,
    action_url  VARCHAR(500) COMMENT 'Link đến trang liên quan',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 6. Nghiệp Vụ Chi Tiết Theo Từng Module

---

### Module 1: Xác Thực & Phân Quyền

#### 1.1 Đăng ký tài khoản bệnh nhân

**Luồng xử lý:**

1. Bệnh nhân điền form: họ tên, email, mật khẩu, số điện thoại
2. Frontend validate: email đúng định dạng, mật khẩu >= 8 ký tự, có chữ hoa/thường/số
3. Gọi API `POST /api/v1/auth/register`
4. Backend kiểm tra email chưa tồn tại trong DB
5. Mã hóa mật khẩu bằng bcrypt (cost factor 12)
6. Tạo bản ghi `users` (role = 'patient') và `patients`
7. Tạo email verification token (JWT, hết hạn 24h)
8. Gửi email xác thực qua FastAPI-Mail (SMTP Gmail)
9. Trả về `201 Created` + thông báo "Kiểm tra email để xác thực tài khoản"

**Validate rules:**
```
email:     required, email format, unique
password:  required, min 8 chars, phải có chữ hoa + số
full_name: required, min 2 chars, max 100 chars
phone:     optional, 10-11 chữ số VN
```

#### 1.2 Đăng nhập

1. Nhập email + mật khẩu
2. Gọi API `POST /api/v1/auth/login`
3. Backend kiểm tra email tồn tại
4. So sánh mật khẩu với bcrypt hash
5. Kiểm tra `is_active = 1` và `email_verified_at IS NOT NULL`
6. Tạo `access_token` (JWT, hết hạn 30 phút) + `refresh_token` (JWT, hết hạn 7 ngày)
7. Lưu `refresh_token` vào HttpOnly Cookie (bảo mật)
8. Cập nhật `last_login`
9. Frontend lưu `access_token` vào memory (không localStorage)
10. Redirect tới dashboard theo role

#### 1.3 Phân quyền theo role

| Role | Quyền truy cập |
|---|---|
| `admin` | Toàn bộ hệ thống, báo cáo, quản lý users |
| `doctor` | Lịch hẹn của mình, hồ sơ bệnh nhân, kê đơn |
| `receptionist` | Quản lý lịch hẹn, check-in, thông báo |
| `cashier` | Tạo hóa đơn, thu tiền, lịch sử thanh toán |
| `pharmacist` | Xem đơn thuốc, xuất kho, quản lý tồn kho |
| `patient` | Lịch hẹn của mình, hồ sơ cá nhân, hóa đơn |

---

### Module 2: Quản Lý Lịch Hẹn

#### 2.1 Bệnh nhân đặt lịch

**Luồng chi tiết:**

1. Bệnh nhân chọn dịch vụ chính cần khám (VD: Điều trị mụn) — lưu vào `primary_service_id`, tự động thêm vào `appointment_services`
2. Hệ thống hiện danh sách bác sĩ có chuyên khoa phù hợp
3. Bệnh nhân chọn bác sĩ → xem lịch trống theo tuần (dạng calendar)
4. Gọi API `GET /api/v1/appointments/available-slots?doctor_id=1&date=2026-04-01`
5. Backend tính slot trống:
   - Kiểm tra `clinic_holidays` — nếu ngày đó là ngày lễ → trả về rỗng
   - Kiểm tra `doctor_leave` — nếu bác sĩ nghỉ ngày đó → trả về rỗng
   - Lấy `doctor_schedules` của bác sĩ theo ngày trong tuần
   - Lấy danh sách lịch hẹn đã có trong ngày đó
   - Loại bỏ slot đã được đặt hoặc đã qua giờ hiện tại
   - Trả về danh sách slot còn trống
6. Bệnh nhân chọn slot → điền lý do khám → xác nhận
7. Gọi API `POST /api/v1/appointments`
8. Backend kiểm tra slot chưa bị đặt (race condition: dùng DB transaction + SELECT FOR UPDATE)
9. Tạo bản ghi `appointments` với status = `pending`; tạo bản ghi `appointment_services` cho dịch vụ chính
10. Gửi thông báo cho lễ tân qua WebSocket
11. Gửi email xác nhận đặt lịch cho bệnh nhân
12. Trả về thông tin lịch hẹn

**Kiểm tra hợp lệ khi đặt lịch:**
- Ngày được chọn không nằm trong `clinic_holidays` và bác sĩ không có trong `doctor_leave`
- Cho phép đặt lịch trong ngày nếu còn slot và trước giờ hẹn tối thiểu 30 phút
- Bệnh nhân không có lịch hẹn `confirmed`/`in_progress` trùng giờ
- Slot phải nằm trong giờ làm việc của bác sĩ
- Số lượng bệnh nhân trong slot chưa đạt `max_patients`

#### 2.2 Lễ tân xác nhận lịch

1. Lễ tân xem danh sách lịch `pending` trên dashboard
2. Kiểm tra thông tin bệnh nhân và ghi chú
3. Gọi API `PATCH /api/v1/appointments/{id}/confirm`
4. Cập nhật status → `confirmed`, ghi `confirmed_at`
5. Gửi email xác nhận chính thức kèm thông tin chi tiết (địa chỉ, bản đồ, lưu ý)
6. Tạo notification cho bệnh nhân
7. Gửi reminder email trước 24h và 2h qua cron job

#### 2.3 Check-in khi bệnh nhân đến

1. Bệnh nhân đến phòng khám, xuất trình tên/mã lịch hẹn
2. Lễ tân tìm kiếm theo tên hoặc số điện thoại
3. Xác nhận danh tính → Gọi API `PATCH /api/v1/appointments/{id}/check-in`
4. Cập nhật status → `checked_in`, sinh `queue_number`, ghi `checked_in_at`
5. Thông báo cho bác sĩ qua WebSocket: "Bệnh nhân [tên] đã đến, STT [số]"
6. Hệ thống thêm bệnh nhân vào hàng chờ

#### 2.4 Hủy lịch hẹn

**Bệnh nhân hủy:**
- Chỉ được hủy khi status là `pending` hoặc `confirmed`
- Phải hủy trước 4 tiếng so với giờ hẹn
- Nhập lý do hủy
- Cập nhật `cancelled_at`, `cancelled_by`
- Gửi thông báo cho bác sĩ và lễ tân

**Phòng khám hủy:**
- Admin/Lễ tân có thể hủy bất kỳ lịch nào
- Phải nhập lý do và có ghi chú xin lỗi
- Gửi email thông báo + đề xuất lịch thay thế cho bệnh nhân

#### 2.5 Đổi lịch hẹn

1. Bệnh nhân/lễ tân chọn lịch hiện tại → chức năng `reschedule`
2. Hệ thống chỉ cho đổi lịch khi trạng thái đang là `pending` hoặc `confirmed`
3. Chọn slot mới và tạo lịch mới với `rescheduled_from_id` trỏ về lịch cũ
4. Lịch cũ cập nhật `status = cancelled`, lưu lý do "rescheduled"
5. Giữ lại lịch sử đổi lịch để đo tỷ lệ đổi/hủy và truy vết CSKH

#### 2.6 Khách vãng lai (walk-in)

1. Lễ tân tạo lịch mới với `visit_type = walk_in`, `booking_source = frontdesk`
2. Hệ thống xếp vào hàng chờ của bác sĩ đang nhận khám
3. Nếu phòng khám có nhiều bác sĩ cùng chuyên khoa, lễ tân có thể chọn bác sĩ ít tải nhất
4. Walk-in vẫn đi chung luồng: check-in → khám → hóa đơn → cấp thuốc

---

### Module 3: Khám Bệnh & Hồ Sơ Bệnh Án

#### 3.1 Bác sĩ bắt đầu khám

1. Bác sĩ xem danh sách bệnh nhân `checked_in` hôm nay
2. Gọi `PATCH /api/v1/appointments/{id}/start` → status = `in_progress`, ghi `started_at`
3. Xem hồ sơ bệnh nhân: lịch sử khám, dị ứng thuốc, chẩn đoán cũ
4. Thực hiện khám lâm sàng

#### 3.2 Bác sĩ nhập kết quả và kê đơn

**Nhập hồ sơ bệnh án:**
```
- Triệu chứng bệnh nhân mô tả
- Kết quả thăm khám lâm sàng (quan sát da, đo lường...)
- Chẩn đoán bệnh + mã ICD-10
- Phác đồ điều trị
- Ngày tái khám (nếu cần)
- Ghi chú riêng của bác sĩ
```

**Bổ sung dịch vụ phát sinh trong lúc khám:**
- Bác sĩ hoặc lễ tân có thể thêm dịch vụ vào `appointment_services` trong khi khám
- VD: đặt lịch ban đầu là "Điều trị mụn" nhưng sau khi khám bác sĩ làm thêm "Laser xoá thâm"
- Mỗi dịch vụ thêm ghi nhận `unit_price` tại thời điểm thực hiện (snapshot)
- Thu ngân sẽ tổng hợp từ `appointment_services` khi lập hóa đơn — không cần nhập tay

**Kê đơn thuốc:**
1. Tìm kiếm thuốc theo tên/hoạt chất trong kho
2. Hệ thống cảnh báo nếu thuốc gần hết hoặc hết hạn
3. Hệ thống cảnh báo nếu thuốc trong đơn trùng với dị ứng đã ghi trong hồ sơ bệnh nhân (`allergy_notes`)
4. Với mỗi thuốc: nhập số lượng, liều dùng, tần suất, hướng dẫn
5. Lưu đơn thuốc với status = `pending`
6. Gọi `PATCH /api/v1/appointments/{id}/complete` → status = `completed`, ghi `completed_at`

**Sau khi hoàn thành khám:**
- Thông báo tự động đến Thu ngân: "Bệnh nhân [tên] khám xong, chờ thanh toán"
- Thông báo tự động đến Dược sĩ: "Có đơn thuốc mới cần chuẩn bị"
- Gửi email kết quả khám cho bệnh nhân

---

### Module 4: Quản Lý Đơn Thuốc & Kho Dược

#### 4.1 Dược sĩ chuẩn bị thuốc

1. Dược sĩ xem danh sách đơn thuốc `pending` theo thứ tự thời gian
2. Click vào đơn → xem chi tiết từng thuốc cần cấp
3. Kiểm tra tồn kho thực tế theo từng `medicine_batches`, ưu tiên lô gần hết hạn trước (FEFO)
4. Nếu đủ thuốc: dược sĩ ghi nhận `prepared_by`, `prepared_at`
5. Sau khi chuẩn bị xong toàn bộ, đơn chuyển sang `awaiting_payment`
6. Hệ thống giữ danh sách thuốc đã chuẩn bị nhưng **chưa giao cho bệnh nhân**
7. Nếu thiếu thuốc:
   - Cho phép `partially_dispensed` từng dòng thuốc
   - Hoặc báo bác sĩ điều chỉnh đơn

#### 4.2 Giao thuốc sau thanh toán

1. Sau khi hóa đơn đạt trạng thái `paid` hoặc được phép công nợ, dược sĩ mở đơn ở trạng thái `awaiting_payment`
2. Xác nhận số lượng giao thực tế từng dòng thuốc
3. Hệ thống tự động:
   - Trừ tồn theo từng `medicine_batches`
   - Cập nhật `medicines.current_stock`
   - Ghi log vào `inventory_logs`
   - Cập nhật `dispensed_quantity`, `dispensed_by`, `dispensed_at`, `picked_up_at`
4. Nếu giao đủ: `status = dispensed`
5. Nếu giao thiếu: `status = partially_dispensed`

#### 4.3 Cảnh báo tồn kho

Hệ thống tự động cảnh báo khi:
- Tồn kho thuốc < `reorder_level` → cảnh báo vàng
- Tồn kho = 0 → cảnh báo đỏ, không thể kê đơn
- Có lô thuốc hết hạn trong 30 ngày tới → cảnh báo cam
- Thuốc đã hết hạn → tự động đánh dấu inactive

#### 4.4 Nhập kho thuốc mới

1. Dược sĩ/Admin tạo phiếu nhập kho
2. Nhập: tên thuốc, số lượng, số lô, hạn sử dụng, giá nhập, nhà cung cấp
3. Hệ thống tạo `medicine_batches`, cộng dồn vào `medicines.current_stock`
4. Ghi log `inventory_logs` với action = `import`

---

### Module 5: Thanh Toán & Hóa Đơn

> Ghi chú phạm vi: phần "BHYT" ở Phase 1 chỉ là **mức hỗ trợ/giảm trừ nhập tay** trên hóa đơn. Nếu cần tích hợp thanh toán/claim BHYT thật, nên tách thành phase riêng.

#### 5.1 Thu ngân lập hóa đơn

1. Thu ngân tìm bệnh nhân vừa khám xong (status = `completed`)
2. Gọi API `POST /api/v1/invoices/generate/{appointment_id}`
3. Hệ thống tự động tổng hợp thành `invoice_items`:
   - Phí khám: `doctors.consultation_fee`
   - Phí dịch vụ: tổng hợp từ **`appointment_services`** (bao gồm cả dịch vụ bổ sung trong lúc khám)
   - Tiền thuốc: tổng `prescription_items.quantity × unit_price`
4. Thu ngân kiểm tra và áp dụng:
   - Giảm giá (%) hoặc số tiền cố định
   - Hỗ trợ nội bộ/BHYT nhập tay (nếu có)
   - Người duyệt giảm giá nếu vượt hạn mức
5. Hiển thị hóa đơn xem trước cho bệnh nhân
6. Bệnh nhân xác nhận → chọn phương thức thanh toán

#### 5.2 Ghi nhận thanh toán

```
Phương thức hỗ trợ:
- Tiền mặt: thu ngân nhập số tiền nhận, hệ thống tính tiền thừa
- Thẻ ngân hàng: nhập số tham chiếu giao dịch
- Chuyển khoản: nhập mã giao dịch, hệ thống chờ xác nhận
- Hỗ trợ nội bộ/BHYT nhập tay: nhập số tiền hỗ trợ, lý do, người duyệt (nếu cần)
```

1. Gọi `PATCH /api/v1/invoices/{id}/pay`
2. Mỗi lần thu tiền tạo một bản ghi `payment_transactions`
3. Cập nhật `paid_amount` và `payment_status` theo tổng giao dịch thành công
4. Nếu thanh toán đủ: `payment_status = paid`, `paid_at = now()`
5. Sinh mã hóa đơn tự động: `PKD-2026-0001`
6. Xuất PDF hóa đơn (dùng thư viện reportlab Python)
7. Gửi email hóa đơn cho bệnh nhân

#### 5.3 Hoàn tiền / hủy hóa đơn

1. Chỉ cho hoàn tiền khi đã có giao dịch thành công
2. Bắt buộc nhập lý do hoàn tiền
3. Nếu hoàn toàn bộ: `payment_status = refunded`, `invoice_status = refunded`
4. Nếu hoàn một phần: tạo thêm `payment_transactions` loại `refund`, không sửa lịch sử giao dịch cũ
5. Các khoản hoàn tiền vượt ngưỡng phải có `approved_by`

---

### Module 6: Dashboard & Báo Cáo (Admin)

#### 6.1 Dashboard tổng quan

Hiển thị realtime:
- Số lịch hẹn hôm nay / tuần / tháng
- Số bệnh nhân đang chờ / đang khám
- Doanh thu hôm nay / tháng
- Tồn kho thuốc sắp hết (< reorder level)
- Biểu đồ lịch hẹn theo giờ trong ngày
- Tất cả chỉ số thời gian lấy từ `checked_in_at`, `started_at`, `completed_at`

#### 6.2 Báo cáo doanh thu

```
Tham số lọc: từ ngày - đến ngày, theo bác sĩ, theo dịch vụ
Kết quả:
- Tổng doanh thu
- Doanh thu theo từng phương thức thanh toán
- Doanh thu theo bác sĩ
- Top 10 dịch vụ có doanh thu cao nhất
- Biểu đồ cột/đường theo ngày/tuần/tháng
```

#### 6.3 Báo cáo bệnh nhân

- Số bệnh nhân mới / bệnh nhân quay lại
- Tỷ lệ hủy lịch / không đến (no-show)
- Bệnh phổ biến nhất (theo diagnosis)
- Thời gian chờ trung bình (`started_at - checked_in_at`)
- Thời gian khám trung bình (`completed_at - started_at`)
- Tỷ lệ đổi lịch

---

## 7. Backend Python FastAPI - Cấu Trúc & API

### Cấu trúc thư mục

```
backend/
├── main.py                    # Khởi tạo FastAPI app
├── .env                       # Biến môi trường (không commit git)
├── requirements.txt
├── alembic/                   # Database migrations
│   ├── env.py
│   └── versions/
│       └── 001_initial_schema.py
├── app/
│   ├── core/
│   │   ├── config.py          # Đọc settings từ .env
│   │   ├── database.py        # Tạo engine MySQL + session
│   │   ├── security.py        # JWT, bcrypt helpers
│   │   └── dependencies.py    # Dependency injection (get_current_user...)
│   ├── models/                # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── patient.py
│   │   ├── doctor.py
│   │   ├── appointment.py
│   │   ├── medical_record.py
│   │   ├── prescription.py
│   │   ├── medicine.py
│   │   ├── medicine_batch.py
│   │   ├── invoice.py
│   │   ├── invoice_item.py
│   │   ├── payment_transaction.py
│   │   └── notification.py
│   ├── schemas/               # Pydantic schemas (request/response)
│   │   ├── auth.py
│   │   ├── appointment.py
│   │   ├── prescription.py
│   │   └── ...
│   ├── routers/               # API routes
│   │   ├── auth.py            # /api/v1/auth/*
│   │   ├── patients.py        # /api/v1/patients/*
│   │   ├── doctors.py         # /api/v1/doctors/*
│   │   ├── appointments.py    # /api/v1/appointments/*
│   │   ├── medical_records.py
│   │   ├── prescriptions.py
│   │   ├── medicines.py
│   │   ├── invoices.py
│   │   └── reports.py
│   ├── services/              # Business logic
│   │   ├── appointment_service.py
│   │   ├── notification_service.py
│   │   ├── email_service.py
│   │   ├── invoice_service.py
│   │   └── inventory_service.py
│   └── websocket/
│       └── manager.py         # WebSocket connection manager
└── tests/
    ├── test_auth.py
    └── test_appointments.py
```

### Ví dụ code mẫu

#### `app/core/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    echo=False  # True để debug SQL queries
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### `app/routers/appointments.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.schemas.appointment import AppointmentCreate, AppointmentResponse
from app.services.appointment_service import AppointmentService

router = APIRouter(prefix="/api/v1/appointments", tags=["Appointments"])

@router.post("/", response_model=AppointmentResponse, status_code=201)
async def create_appointment(
    data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Bệnh nhân đặt lịch hẹn mới"""
    service = AppointmentService(db)
    return await service.create_appointment(data, current_user)

@router.get("/available-slots")
async def get_available_slots(
    doctor_id: int,
    date: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    """Lấy danh sách slot trống của bác sĩ theo ngày"""
    service = AppointmentService(db)
    return service.get_available_slots(doctor_id, date)

@router.patch("/{id}/confirm")
async def confirm_appointment(
    id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["admin", "receptionist"]))
):
    """Lễ tân xác nhận lịch hẹn"""
    service = AppointmentService(db)
    return await service.confirm_appointment(id, current_user)

@router.patch("/{id}/check-in")
async def check_in(
    id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["receptionist", "admin"]))
):
    """Check-in khi bệnh nhân đến"""
    service = AppointmentService(db)
    return await service.check_in(id, current_user)
```

### Danh sách API Endpoints đầy đủ

```
Authentication
POST   /api/v1/auth/register          Đăng ký tài khoản
POST   /api/v1/auth/login             Đăng nhập
POST   /api/v1/auth/logout            Đăng xuất
POST   /api/v1/auth/refresh           Làm mới access token
POST   /api/v1/auth/verify-email      Xác thực email
POST   /api/v1/auth/forgot-password   Quên mật khẩu
POST   /api/v1/auth/reset-password    Đặt lại mật khẩu

Patients
GET    /api/v1/patients               Danh sách bệnh nhân (admin/receptionist)
GET    /api/v1/patients/{id}          Chi tiết bệnh nhân
PUT    /api/v1/patients/{id}          Cập nhật thông tin
GET    /api/v1/patients/{id}/history  Lịch sử khám bệnh

Doctors
GET    /api/v1/doctors                Danh sách bác sĩ (public)
GET    /api/v1/doctors/{id}           Chi tiết bác sĩ
GET    /api/v1/doctors/{id}/schedule  Lịch làm việc
POST   /api/v1/doctors/{id}/schedule  Cập nhật lịch làm việc
POST   /api/v1/doctors/{id}/leave     Ghi ngày nghỉ đột xuất
DELETE /api/v1/doctors/{id}/leave/{date} Huỷ ngày nghỉ

Clinic Holidays
GET    /api/v1/holidays               Danh sách ngày lễ
POST   /api/v1/holidays               Thêm ngày lễ (admin)
DELETE /api/v1/holidays/{id}          Xoá ngày lễ (admin)

Appointments
GET    /api/v1/appointments           Danh sách (lọc theo role)
POST   /api/v1/appointments           Đặt lịch mới
GET    /api/v1/appointments/{id}      Chi tiết lịch hẹn
PATCH  /api/v1/appointments/{id}/confirm    Xác nhận
PATCH  /api/v1/appointments/{id}/check-in   Check-in
PATCH  /api/v1/appointments/{id}/start      Bắt đầu khám
PATCH  /api/v1/appointments/{id}/complete   Hoàn thành khám
PATCH  /api/v1/appointments/{id}/reschedule Đổi lịch
POST   /api/v1/appointments/walk-in   Tạo lịch cho khách vãng lai
DELETE /api/v1/appointments/{id}      Hủy lịch hẹn
GET    /api/v1/appointments/available-slots Slot trống
POST   /api/v1/appointments/{id}/services   Thêm dịch vụ phát sinh
DELETE /api/v1/appointments/{id}/services/{sid} Xoá dịch vụ phát sinh

Medical Records
POST   /api/v1/medical-records        Tạo hồ sơ bệnh án
GET    /api/v1/medical-records/{id}   Chi tiết hồ sơ
PUT    /api/v1/medical-records/{id}   Cập nhật hồ sơ

Prescriptions
POST   /api/v1/prescriptions          Tạo đơn thuốc
GET    /api/v1/prescriptions/{id}     Chi tiết đơn
PATCH  /api/v1/prescriptions/{id}/prepare   Chuẩn bị thuốc
PATCH  /api/v1/prescriptions/{id}/dispense  Dược sĩ xuất thuốc

Medicines
GET    /api/v1/medicines              Danh sách thuốc
POST   /api/v1/medicines              Thêm thuốc mới
PUT    /api/v1/medicines/{id}         Cập nhật thuốc
POST   /api/v1/medicines/{id}/batches/import  Nhập kho theo lô
GET    /api/v1/medicines/low-stock    Thuốc sắp hết

Invoices
POST   /api/v1/invoices/generate/{appointment_id}  Tạo hóa đơn
GET    /api/v1/invoices/{id}          Chi tiết hóa đơn
PATCH  /api/v1/invoices/{id}/pay      Thanh toán
POST   /api/v1/invoices/{id}/refund   Hoàn tiền
GET    /api/v1/invoices/{id}/pdf      Xuất PDF

Reports
GET    /api/v1/reports/revenue        Báo cáo doanh thu
GET    /api/v1/reports/appointments   Báo cáo lịch hẹn
GET    /api/v1/reports/inventory      Báo cáo tồn kho
GET    /api/v1/reports/dashboard      Dữ liệu dashboard

Notifications
GET    /api/v1/notifications          Danh sách thông báo
PATCH  /api/v1/notifications/{id}/read   Đánh dấu đã đọc
PATCH  /api/v1/notifications/read-all   Đọc tất cả
```

---

## 8. Frontend JavaScript React - Cấu Trúc & Màn Hình

### Cấu trúc thư mục

```
frontend/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── src/
│   ├── main.jsx               # Entry point
│   ├── App.jsx                # Router chính
│   ├── api/
│   │   ├── axios.js           # Axios instance + interceptors
│   │   ├── auth.api.js
│   │   ├── appointment.api.js
│   │   └── ...
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useAppointments.js
│   │   └── useNotifications.js
│   ├── stores/                # Zustand state management
│   │   └── authStore.js
│   ├── pages/
│   │   ├── public/            # Không cần đăng nhập
│   │   │   ├── HomePage.jsx
│   │   │   ├── DoctorsPage.jsx
│   │   │   ├── ServicesPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── RegisterPage.jsx
│   │   ├── patient/           # Giao diện bệnh nhân
│   │   │   ├── BookAppointment.jsx
│   │   │   ├── MyAppointments.jsx
│   │   │   ├── MedicalHistory.jsx
│   │   │   └── MyInvoices.jsx
│   │   ├── doctor/            # Giao diện bác sĩ
│   │   │   ├── DoctorDashboard.jsx
│   │   │   ├── TodayPatients.jsx
│   │   │   ├── MedicalRecord.jsx
│   │   │   └── PrescriptionForm.jsx
│   │   ├── receptionist/      # Giao diện lễ tân
│   │   │   ├── AppointmentQueue.jsx
│   │   │   └── CheckIn.jsx
│   │   ├── cashier/           # Giao diện thu ngân
│   │   │   ├── InvoiceList.jsx
│   │   │   └── PaymentForm.jsx
│   │   ├── pharmacist/        # Giao diện dược sĩ
│   │   │   ├── PrescriptionQueue.jsx
│   │   │   └── InventoryPage.jsx
│   │   └── admin/             # Giao diện quản trị
│   │       ├── AdminDashboard.jsx
│   │       ├── UserManagement.jsx
│   │       ├── DoctorManagement.jsx
│   │       ├── MedicineManagement.jsx
│   │       └── Reports.jsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Footer.jsx
│   │   ├── shared/
│   │   │   ├── AppointmentCalendar.jsx
│   │   │   ├── NotificationBell.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   └── forms/
│   │       ├── AppointmentForm.jsx
│   │       └── PrescriptionForm.jsx
│   └── utils/
│       ├── formatDate.js
│       ├── formatCurrency.js
│       └── constants.js
```

### Màn hình theo từng role

#### Bệnh nhân (Patient)

| Màn hình | Chức năng |
|---|---|
| Trang chủ | Giới thiệu phòng khám, bác sĩ nổi bật, dịch vụ |
| Đặt lịch | Chọn dịch vụ → bác sĩ → ngày giờ → xác nhận |
| Lịch hẹn của tôi | Xem, hủy lịch; lọc theo trạng thái |
| Lịch sử khám | Xem kết quả chẩn đoán, đơn thuốc cũ |
| Hóa đơn | Xem và tải hóa đơn PDF |
| Hồ sơ | Cập nhật thông tin cá nhân, dị ứng thuốc |

#### Bác sĩ (Doctor)

| Màn hình | Chức năng |
|---|---|
| Dashboard | Lịch làm việc hôm nay, số bệnh nhân chờ |
| Danh sách bệnh nhân hôm nay | Theo thứ tự, trạng thái |
| Khám bệnh | Nhập triệu chứng, chẩn đoán, phác đồ |
| Kê đơn thuốc | Tìm kiếm thuốc, nhập liều dùng |
| Lịch sử bệnh nhân | Xem toàn bộ lịch sử khám của bệnh nhân |
| Lịch làm việc | Quản lý khung giờ khám |

#### Lễ tân (Receptionist)

| Màn hình | Chức năng |
|---|---|
| Queue hôm nay | Danh sách lịch hẹn, cập nhật trạng thái |
| Xác nhận lịch | Duyệt lịch pending, gửi email |
| Check-in | Tìm bệnh nhân, xác nhận đến |
| Tạo lịch nhanh | Đặt lịch trực tiếp cho bệnh nhân gọi điện |

#### Thu ngân (Cashier)

| Màn hình | Chức năng |
|---|---|
| Danh sách cần thanh toán | Bệnh nhân khám xong |
| Tạo hóa đơn | Xem chi tiết, áp dụng giảm giá, hỗ trợ nội bộ/BHYT nhập tay |
| Thanh toán | Nhập phương thức và số tiền |
| Lịch sử hóa đơn | Tra cứu, in lại hóa đơn |

#### Dược sĩ (Pharmacist)

| Màn hình | Chức năng |
|---|---|
| Đơn thuốc cần cấp | Danh sách `pending` / `awaiting_payment` theo thứ tự |
| Xuất thuốc | Xác nhận từng thuốc, trừ kho theo lô sau thanh toán |
| Tồn kho | Danh sách thuốc, lọc sắp hết/hết hạn |
| Nhập kho | Nhập theo lô, hạn dùng, nhà cung cấp |
| Lịch sử xuất nhập | Tra cứu log |

---

## 9. Luồng Nghiệp Vụ Đầy Đủ

```
BỆNH NHÂN                  LỄ TÂN             BÁC SĨ         THU NGÂN        DƯỢC SĨ
    │                          │                  │               │               │
    │── Đặt lịch ──────────────►                  │               │               │
    │                   [Nhận thông báo]           │               │               │
    │◄─── Email xác nhận đặt lịch ─────────────────────────────────────────────────│
    │                          │                  │               │               │
    │                   [Xác nhận lịch]            │               │               │
    │◄─── Email xác nhận chính thức ──────────────────────────────────────────────│
    │                          │                  │               │               │
    │── Đến phòng khám ────────►                  │               │               │
    │                   [Check-in]                │               │               │
    │                   ─── Thông báo ───────────►│               │               │
    │                          │                  │               │               │
    │                          │          [Gọi bệnh nhân vào]     │               │
    │                          │          [Khám bệnh]              │               │
    │                          │          [Nhập chẩn đoán]         │               │
    │                          │          [Kê đơn thuốc]           │               │
    │◄── Email kết quả khám ───────────────────────────────────────────────────────│
    │                          │          ─── Thông báo ──────────►│               │
    │                          │          ─── Thông báo ────────────────────────►  │
    │                          │                  │               │        [Chuẩn bị thuốc]
    │                          │                  │               │        [Xuất kho]
    │── Đến quầy thu ngân ─────────────────────────────────────►  │               │
    │                          │                  │      [Lập hóa đơn]            │
    │                          │                  │      [Thu tiền]               │
    │◄─── Email hóa đơn ───────────────────────────────────────────────────────────│
    │                          │                  │               │               │
    │── Nhận thuốc ────────────────────────────────────────────────────────────►   │
    │                          │                  │               │               │
   XONG
```

---

## 10. Bảo Mật Hệ Thống

### Backend (Python FastAPI)

```python
# Sử dụng Prepared Statements qua SQLAlchemy — không bao giờ dùng string format
# BAD:  db.execute(f"SELECT * FROM users WHERE email = '{email}'")
# GOOD: db.query(User).filter(User.email == email).first()

# Mã hóa mật khẩu bcrypt
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed = pwd_context.hash(plain_password)

# CORS — chỉ cho phép domain frontend
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://phongkhamdalieu.vn"],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=True
)

# Rate limiting — chống brute force đăng nhập
# 5 lần sai liên tiếp → khóa 15 phút
```

### Frontend (React)

```javascript
// Access token lưu trong memory (biến JS), không trong localStorage
// Refresh token trong HttpOnly Cookie (JS không đọc được)

// Axios interceptor: tự động thêm Bearer token và refresh khi hết hạn
axiosInstance.interceptors.request.use(config => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Validate input với Zod trước khi gửi lên server
const appointmentSchema = z.object({
  doctor_id: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string(),
  complaint: z.string().min(10).max(500)
});
```

### Database (MySQL)

```sql
-- Chỉ dùng user có quyền tối thiểu
GRANT SELECT, INSERT, UPDATE, DELETE ON phong_kham_da_lieu.* TO 'pkdl_user'@'localhost';
-- Không GRANT DROP, ALTER, CREATE cho ứng dụng

-- Không lưu mật khẩu plaintext
-- Không lưu số thẻ ngân hàng đầy đủ
-- Backup định kỳ mỗi ngày
```

---

## 11. So Sánh Trước Và Sau Cải Tiến

| Tiêu chí | Phiên bản cũ (PHP) | Phiên bản mới (Python + React) |
|---|---|---|
| **Kiến trúc** | Monolithic, PHP + HTML lẫn lộn | Tách biệt hoàn toàn FE/BE qua REST API |
| **Số roles** | 3 (Admin, Doctor, Patient) | 5 (+ Receptionist, Cashier, Pharmacist) |
| **Thanh toán** | Không có | Đầy đủ: hóa đơn chi tiết, nhiều giao dịch, hoàn tiền, PDF |
| **Đơn thuốc** | Không có | Kê đơn, xuất kho, cảnh báo tồn kho |
| **Báo cáo** | Không có | Doanh thu, thống kê, biểu đồ |
| **Thông báo** | Email cơ bản | Email + Realtime WebSocket |
| **Bảo mật** | Tiềm ẩn SQL Injection | JWT, bcrypt, CORS, rate limiting, validation |
| **Responsive** | Không | Tương thích mọi thiết bị |
| **API docs** | Không có | Swagger UI tự động tại /docs |
| **Mở rộng** | Khó | Dễ mở rộng thành mobile app |
| **Performance** | Thấp | Async FastAPI, React Query caching |
| **Deploy** | Laragon local | Docker, Railway, Render |

---

## 📁 Tài Nguyên Tham Khảo

- **FastAPI docs:** https://fastapi.tiangolo.com
- **React docs:** https://react.dev
- **TailwindCSS:** https://tailwindcss.com
- **ShadcnUI:** https://ui.shadcn.com
- **SQLAlchemy:** https://docs.sqlalchemy.org
- **React Query:** https://tanstack.com/query

---

*Tài liệu này được tạo cho đề tài cải tiến: Hệ thống Quản lý Phòng Khám Da Liễu*  
*Phiên bản: 2.0 | Ngày: 2026*
