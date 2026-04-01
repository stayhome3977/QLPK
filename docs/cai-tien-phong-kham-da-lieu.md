# 🏥 Cải Tiến Đề Tài: Hệ Thống Quản Lý Phòng Khám Da Liễu

> **Phiên bản nâng cấp** từ PHP thuần → Python FastAPI + JavaScript React + MySQL  
> **Môi trường phát triển:** Visual Studio Code 2026  
> **Mục tiêu:** Hệ thống đầy đủ nghiệp vụ, sẵn sàng triển khai thực tế

> **Ghi chú triển khai:** file SQL chính thức dùng để khởi tạo CSDL là `database/migrations/001_create_all_tables.sql`. Từ bản cập nhật này, tên bảng và cột trong migration đã được Việt hóa không dấu để đồng bộ với yêu cầu tài liệu.

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
| Thiếu module thanh toán | Không có hóa đơn, luồng dược sĩ thu tiền tích hợp |
| Thiếu kê đơn thuốc | Không quản lý đơn thuốc, kho dược |
| Bảo mật yếu | Nguy cơ SQL Injection nếu không dùng Prepared Statements |
| Không có báo cáo | Admin không xem được thống kê doanh thu |
| Không responsive | Giao diện không tương thích mobile |
| Không có API | Không thể mở rộng thành mobile app sau này |

### Những gì được thêm mới

- ✅ **4 roles**: Bệnh nhân, Bác sĩ, Dược sĩ, Quản trị
- ✅ **Module kê đơn thuốc** và quản lý kho dược
- ✅ **Module thanh toán tại quầy thuốc** và xuất hóa đơn
- ✅ **Dashboard thống kê** doanh thu, lịch khám, tồn kho
- ✅ **REST API chuẩn** — dễ mở rộng thành mobile app
- ✅ **Responsive** — tương thích mọi thiết bị
- ✅ **Realtime thông báo** qua WebSocket
- ✅ **Bảo mật chuẩn** JWT, bcrypt, CORS, input validation

### Nguyên tắc phạm vi triển khai thực tế

- **Phase 1** tập trung vào luồng chính: bệnh nhân tự đăng ký, chọn bác sĩ và xem lịch rảnh; bác sĩ duyệt lịch hoặc đề nghị hoãn; sau đó khám, kê đơn, thu tiền, xuất thuốc, báo cáo
- **BHYT** trong tài liệu này chỉ nên hiểu là **hỗ trợ nhập mức hỗ trợ/giảm trừ nội bộ**, chưa mặc định là tích hợp claim BHYT với cơ quan bảo hiểm
- **Kho thuốc** quản lý theo **lô nhập/hạn dùng** để tránh sai lệch tồn kho khi có nhiều lần nhập cùng một thuốc
- **Thanh toán** gắn với quy trình **dược sĩ giao thuốc + in hóa đơn**, vẫn tách **hóa đơn**, **dòng chi tiết**, **giao dịch thanh toán** để hỗ trợ đối soát

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
    role        ENUM('admin','doctor','pharmacist','patient')
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
- `doctor` — Bác sĩ khám bệnh, duyệt lịch của mình, đề nghị hoãn lịch
- `pharmacist` — Dược sĩ chuẩn bị thuốc, quản lý kho, thanh toán và in hóa đơn
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
    created_by  INT UNSIGNED NOT NULL COMMENT 'Admin/bác sĩ ghi nhận',
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

> Phòng khám da liễu thường thực hiện **nhiều dịch vụ trong cùng một lần khám** (VD: chiết xuất nhân mụn + laser + chăm sóc cơ bản). Bảng này lưu danh sách đầy đủ các dịch vụ đã làm, được bác sĩ hoặc admin bổ sung trong quá trình khám.

```sql
CREATE TABLE appointment_services (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    appointment_id  INT UNSIGNED NOT NULL,
    service_id      INT UNSIGNED NOT NULL,
    quantity        INT NOT NULL DEFAULT 1,
    unit_price      DECIMAL(12,0) NOT NULL COMMENT 'Snapshot giá tại thời điểm thực hiện',
    added_by        INT UNSIGNED NOT NULL COMMENT 'user_id người thêm dịch vụ (bác sĩ/admin)',
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
- Trong lúc khám: bác sĩ hoặc admin có thể thêm dịch vụ phát sinh
- Khi lập hóa đơn: hệ thống tổng hợp từ `appointment_services` (không cần nhập tay)

---

#### Bảng `appointments` — Lịch hẹn

```sql
CREATE TABLE appointments (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    patient_id          INT UNSIGNED NOT NULL,
    doctor_id           INT UNSIGNED NOT NULL,
    primary_service_id  INT UNSIGNED COMMENT 'Dịch vụ chính / phân loại lịch hẹn',
    visit_type          ENUM('scheduled','follow_up')
                        NOT NULL DEFAULT 'scheduled',
    booking_source      ENUM('patient_app','admin','doctor')
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
    doctor_note         TEXT COMMENT 'Ghi chú phản hồi từ bác sĩ cho bệnh nhân',
    proposed_date       DATE COMMENT 'Ngày bác sĩ đề nghị đổi/hẹn lại',
    proposed_time       TIME COMMENT 'Giờ bác sĩ đề nghị đổi/hẹn lại',
    discount_percent    DECIMAL(5,2) DEFAULT 0 COMMENT 'Ưu đãi bác sĩ đề xuất nếu cần dời lịch',
    discount_note       VARCHAR(255) COMMENT 'Lý do hoặc nội dung ưu đãi',
    checked_in_at       DATETIME,
    started_at          DATETIME,
    completed_at        DATETIME,
    rescheduled_from_id INT UNSIGNED COMMENT 'Lịch gốc nếu đây là lịch đổi',
    reminder_24h_sent   TINYINT(1) DEFAULT 0 COMMENT 'Đã gửi nhắc trước 24 tiếng',
    reminder_2h_sent    TINYINT(1) DEFAULT 0 COMMENT 'Đã gửi nhắc trước 2 tiếng',
    notes               TEXT COMMENT 'Ghi chú bổ sung của hệ thống hoặc bác sĩ',
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
- `pending` — Vừa đặt, chờ bác sĩ duyệt hoặc phản hồi đề nghị hoãn
- `confirmed` — Bác sĩ đã chốt lịch
- `checked_in` — Bệnh nhân đã đến phòng khám và đã được ghi nhận đến khám
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
    supplier_id         INT UNSIGNED NOT NULL,
    imported_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    UNIQUE KEY uq_batch (medicine_id, batch_number),
    INDEX idx_expiry (expiry_date),
    INDEX idx_remaining (remaining_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

#### Bảng `suppliers` — Nhà cung cấp thuốc

```sql
CREATE TABLE suppliers (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(200) NOT NULL,
    contact_person      VARCHAR(150),
    phone               VARCHAR(15),
    email               VARCHAR(150),
    address             TEXT,
    tax_code            VARCHAR(50),
    notes               TEXT,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_supplier_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> Hệ thống phải có danh mục `suppliers` để dược sĩ hoặc admin quản lý nguồn nhập thuốc. Khi chưa có nhà cung cấp thì không nên hoàn tất phiếu nhập kho mới.

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
    pharmacist_id       INT UNSIGNED COMMENT 'Dược sĩ lập hóa đơn và thu tiền',
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
    FOREIGN KEY (pharmacist_id) REFERENCES users(id),
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

**Điều hướng UI sau đăng nhập:**
- `patient` → vẫn ở trang chủ, nhưng mở thêm khu đặt lịch và lịch hẹn của tôi
- `doctor` → vào thẳng dashboard bác sĩ
- `pharmacist` → vào thẳng dashboard dược sĩ
- `admin` → vào dashboard quản trị

**Đăng xuất:**
- Xóa token phiên hiện tại
- Quay lại màn hình đăng nhập

#### 1.3 Phân quyền theo vai trò

| Vai trò | Quyền truy cập |
|---|---|
| `admin` | Toàn bộ hệ thống, báo cáo, quản lý tài khoản, quản lý lịch khám, tạo tài khoản bác sĩ/dược sĩ/bệnh nhân, đặt lại mật khẩu |
| `doctor` | Lịch hẹn của mình, duyệt/chốt lịch, đề nghị hoãn lịch, hồ sơ bệnh nhân, danh sách bệnh nhân, kê đơn |
| `pharmacist` | Xem đơn thuốc, chuẩn bị thuốc, quản lý tồn kho, quản lý nhà cung cấp, thu tiền, in hóa đơn |
| `patient` | Đăng ký, đăng nhập, xem trang chủ, chọn bác sĩ, xem lịch rảnh, đặt lịch, xem lịch của mình, hồ sơ cá nhân, hóa đơn |

---

### Module 2: Quản Lý Lịch Hẹn

#### 2.1 Bệnh nhân đặt lịch

**Luồng chi tiết:**

1. Bệnh nhân chọn dịch vụ chính cần khám (VD: Điều trị mụn) — lưu vào `primary_service_id`, tự động thêm vào `appointment_services`
2. Hệ thống hiện danh sách bác sĩ có chuyên khoa phù hợp và các bác sĩ đang còn khung giờ rảnh
3. Bệnh nhân chọn đúng bác sĩ mình muốn khám → xem lịch trống theo tuần (dạng calendar)
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
10. Gửi thông báo cho bác sĩ phụ trách qua WebSocket hoặc notification
11. Gửi email xác nhận đã nhận yêu cầu đặt lịch cho bệnh nhân
12. Trả về thông tin lịch hẹn

**Kiểm tra hợp lệ khi đặt lịch:**
- Ngày được chọn không nằm trong `clinic_holidays` và bác sĩ không có trong `doctor_leave`
- Cho phép đặt lịch trong ngày nếu còn slot và trước giờ hẹn tối thiểu 30 phút
- Bệnh nhân không có lịch hẹn `confirmed`/`in_progress` trùng giờ
- Slot phải nằm trong giờ làm việc của bác sĩ
- Số lượng bệnh nhân trong slot chưa đạt `max_patients`

#### 2.2 Bác sĩ duyệt và chốt lịch

1. Bác sĩ xem danh sách lịch `pending` của chính mình trên dashboard
2. Bác sĩ đối chiếu thời gian rảnh, chuyên môn và ghi chú từ bệnh nhân
3. Gọi API `PATCH /api/v1/appointments/{id}/approve`
4. Cập nhật status → `confirmed`, ghi `confirmed_at`
5. Gửi email + notification xác nhận chính thức cho bệnh nhân
6. Hệ thống tiếp tục gửi reminder trước 24h và 2h qua cron job

#### 2.3 Bác sĩ đề nghị hoãn hoặc đổi giờ khám

1. Nếu khung giờ bệnh nhân chọn không còn phù hợp, bác sĩ mở lịch hẹn đang `pending`
2. Bác sĩ nhập:
   - `doctor_note` để giải thích cho bệnh nhân
   - `proposed_date` và `proposed_time` nếu muốn đề nghị giờ khác
   - `discount_percent` hoặc `discount_note` nếu có ưu đãi xin lỗi/khuyến khích đổi lịch
3. Gọi API `PATCH /api/v1/appointments/{id}/propose-reschedule`
4. Hệ thống gửi notification và email cho bệnh nhân
5. Bệnh nhân vào `Lịch hẹn của tôi` để xem đề nghị, ghi chú của bác sĩ và ưu đãi đi kèm
6. Khi bệnh nhân đồng ý, hệ thống cập nhật lịch sang giờ mới và chuyển status về `confirmed`

#### 2.4 Check-in khi bệnh nhân đến

1. Bệnh nhân đến phòng khám, xuất trình mã lịch hoặc tên
2. Bác sĩ hoặc quản trị viên tìm lịch hẹn đã `confirmed`
3. Gọi API `PATCH /api/v1/appointments/{id}/check-in`
4. Cập nhật status → `checked_in`, sinh `queue_number`, ghi `checked_in_at`
5. Hệ thống thêm bệnh nhân vào hàng chờ khám
6. Nếu có màn hình bệnh nhân, có thể cho bệnh nhân tự đánh dấu `Tôi đã đến` trước khi bác sĩ xác nhận

#### 2.5 Hủy lịch hẹn

**Bệnh nhân hủy:**
- Chỉ được hủy khi status là `pending` hoặc `confirmed`
- Phải hủy trước 4 tiếng so với giờ hẹn
- Nhập lý do hủy
- Cập nhật `cancelled_at`, `cancelled_by`
- Gửi thông báo cho bác sĩ

**Phòng khám hủy:**
- Admin hoặc bác sĩ phụ trách có thể hủy lịch của mình
- Phải nhập lý do và có ghi chú xin lỗi
- Gửi email thông báo + đề xuất lịch thay thế cho bệnh nhân

#### 2.6 Đổi lịch hẹn

1. Bệnh nhân hoặc bác sĩ chọn lịch hiện tại → chức năng `reschedule`
2. Hệ thống chỉ cho đổi lịch khi trạng thái đang là `pending` hoặc `confirmed`
3. Chọn slot mới và tạo lịch mới với `rescheduled_from_id` trỏ về lịch cũ
4. Lịch cũ cập nhật `status = cancelled`, lưu lý do "rescheduled"
5. Giữ lại lịch sử đổi lịch để đo tỷ lệ đổi/hủy và truy vết CSKH

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
- Bác sĩ hoặc admin có thể thêm dịch vụ vào `appointment_services` trong khi khám
- VD: đặt lịch ban đầu là "Điều trị mụn" nhưng sau khi khám bác sĩ làm thêm "Laser xoá thâm"
- Mỗi dịch vụ thêm ghi nhận `unit_price` tại thời điểm thực hiện (snapshot)
- Hệ thống hóa đơn sẽ tổng hợp từ `appointment_services` khi lập hóa đơn — không cần nhập tay

**Kê đơn thuốc:**
1. Tìm kiếm thuốc theo tên/hoạt chất trong kho
2. Hệ thống cảnh báo nếu thuốc gần hết hoặc hết hạn
3. Hệ thống cảnh báo nếu thuốc trong đơn trùng với dị ứng đã ghi trong hồ sơ bệnh nhân (`allergy_notes`)
4. Với mỗi thuốc: nhập số lượng, liều dùng, tần suất, hướng dẫn
5. Bác sĩ xem trước số lượng thuốc khả dụng trong kho để tránh kê vượt tồn
6. Lưu đơn thuốc với status = `pending`
7. Gọi `PATCH /api/v1/appointments/{id}/complete` → status = `completed`, ghi `completed_at`
8. Hệ thống sinh phiếu thuốc gửi sang dược sĩ

**Sau khi hoàn thành khám:**
- Thông báo tự động đến Dược sĩ: "Có phiếu thuốc mới từ bác sĩ cần chuẩn bị"
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

#### 4.2 Dược sĩ thanh toán và giao thuốc

1. Dược sĩ mở đơn ở trạng thái `awaiting_payment`
2. Hệ thống tự động tạo hoặc mở hóa đơn gắn với lịch khám
3. Dược sĩ kiểm tra:
   - phí khám
   - dịch vụ phát sinh
   - tiền thuốc
   - ưu đãi / hỗ trợ nếu có
4. Dược sĩ thu tiền trực tiếp tại quầy phát thuốc
5. Sau khi thanh toán thành công, dược sĩ xác nhận số lượng giao thực tế từng dòng thuốc
6. Hệ thống tự động:
   - Trừ tồn theo từng `medicine_batches`
   - Cập nhật `medicines.current_stock`
   - Ghi log vào `inventory_logs`
   - Cập nhật `dispensed_quantity`, `dispensed_by`, `dispensed_at`, `picked_up_at`
   - Sinh mã hóa đơn
   - In hóa đơn kèm danh sách thuốc đã giao
7. Nếu giao đủ: `status = dispensed`
8. Nếu giao thiếu: `status = partially_dispensed`

#### 4.3 Cảnh báo tồn kho

Hệ thống tự động cảnh báo khi:
- Tồn kho thuốc < `reorder_level` → cảnh báo vàng
- Tồn kho = 0 → cảnh báo đỏ, không thể kê đơn
- Có lô thuốc hết hạn trong 30 ngày tới → cảnh báo cam
- Thuốc đã hết hạn → tự động đánh dấu inactive

#### 4.4 Nhập kho thuốc mới

1. Dược sĩ/Admin tạo phiếu nhập kho
2. Chọn hoặc tạo `nhà cung cấp`
3. Nhập: tên thuốc, số lượng, số lô, hạn sử dụng, giá nhập, nhà cung cấp
4. Nếu chưa có nhà cung cấp thì phải bổ sung trước khi hoàn tất phiếu nhập
5. Hệ thống tạo `medicine_batches`, cộng dồn vào `medicines.current_stock`
6. Ghi log `inventory_logs` với action = `import`

#### 4.5 Quản lý nhà cung cấp

1. Dược sĩ/Admin xem danh sách nhà cung cấp
2. Thêm mới: tên nhà cung cấp, người liên hệ, số điện thoại, email, địa chỉ
3. Đánh dấu ngưng hợp tác khi cần
4. Tra cứu lịch sử các lô thuốc đã nhập từ từng nhà cung cấp

---

### Module 5: Thanh Toán & Hóa Đơn

> Ghi chú phạm vi: phần "BHYT" ở Phase 1 chỉ là **mức hỗ trợ/giảm trừ nhập tay** trên hóa đơn. Nếu cần tích hợp thanh toán/claim BHYT thật, nên tách thành phase riêng.

#### 5.1 Dược sĩ lập hóa đơn

1. Dược sĩ tìm bệnh nhân vừa khám xong (status = `completed`) hoặc đơn thuốc đang `awaiting_payment`
2. Gọi API `POST /api/v1/invoices/generate/{appointment_id}`
3. Hệ thống tự động tổng hợp thành `invoice_items`:
   - Phí khám: `doctors.consultation_fee`
   - Phí dịch vụ: tổng hợp từ **`appointment_services`** (bao gồm cả dịch vụ bổ sung trong lúc khám)
   - Tiền thuốc: tổng `prescription_items.quantity × unit_price`
4. Dược sĩ kiểm tra và áp dụng:
   - Giảm giá (%) hoặc số tiền cố định
   - Hỗ trợ nội bộ/BHYT nhập tay (nếu có)
   - Người duyệt giảm giá nếu vượt hạn mức
5. Hiển thị hóa đơn xem trước cho bệnh nhân
6. Bệnh nhân xác nhận → chọn phương thức thanh toán

#### 5.2 Ghi nhận thanh toán

```
Phương thức hỗ trợ:
- Tiền mặt: dược sĩ nhập số tiền nhận, hệ thống tính tiền thừa
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
7. In hóa đơn kèm danh sách thuốc cho bệnh nhân
8. Gửi email hóa đơn cho bệnh nhân

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

#### 6.1A Quản lý lịch khám

- Chỉ `admin` mới được tạo và chỉnh khung giờ khám của bác sĩ
- Chỉ `admin` mới được đánh dấu khoảng `bác sĩ bận` để giao diện booking hiển thị slot màu vàng
- Bác sĩ chỉ xem lịch khám của mình, không được sửa trực tiếp
- `admin` quản lý:
  - lịch làm việc theo tuần
  - số bệnh nhân tối đa mỗi khung giờ
  - ngày nghỉ đột xuất của bác sĩ
  - ngày nghỉ toàn phòng khám
  - ghi chú điều chỉnh lịch

#### 6.1B Quản lý tài khoản

- `admin` xem danh sách tất cả tài khoản bệnh nhân, bác sĩ, dược sĩ
- `admin` được tạo tài khoản bác sĩ
- `admin` được tạo tài khoản dược sĩ
- `admin` có thể tạo tài khoản bệnh nhân khi cần nhập hộ
- Bác sĩ không được tạo tài khoản bác sĩ khác
- Dược sĩ không được tạo tài khoản dược sĩ khác

#### 6.1C Đặt lại mật khẩu

- Chỉ `admin` mới được đặt lại mật khẩu cho tài khoản khác
- Form đặt lại mật khẩu cần có:
  - họ tên tài khoản
  - vai trò
  - mật khẩu mới
  - xác nhận mật khẩu mới
  - tùy chọn buộc đổi mật khẩu ở lần đăng nhập tiếp theo
- Sau khi đặt lại thành công, hệ thống ghi nhận người thực hiện và thời điểm đặt lại

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
│   │   ├── supplier.py
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
│   │   ├── suppliers.py
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
    _ = Depends(get_current_user)
):
    """Lấy danh sách slot trống của bác sĩ theo ngày"""
    service = AppointmentService(db)
    return service.get_available_slots(doctor_id, date)

@router.patch("/{id}/approve")
async def approve_appointment(
    id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["doctor", "admin"]))
):
    """Bác sĩ duyệt và chốt lịch hẹn"""
    service = AppointmentService(db)
    return await service.approve_appointment(id, current_user)

@router.patch("/{id}/propose-reschedule")
async def propose_reschedule(
    id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["doctor", "admin"]))
):
    """Bác sĩ đề nghị hoãn/đổi giờ kèm ghi chú và ưu đãi"""
    service = AppointmentService(db)
    return await service.propose_reschedule(id, current_user)

@router.patch("/{id}/check-in")
async def check_in(
    id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["doctor", "admin"]))
):
    """Ghi nhận bệnh nhân đã đến khám"""
    service = AppointmentService(db)
    return await service.check_in(id, current_user)
```

### Danh sách API Endpoints đầy đủ

```
Xac thuc
POST   /api/v1/auth/register          Đăng ký tài khoản
POST   /api/v1/auth/login             Đăng nhập
POST   /api/v1/auth/logout            Đăng xuất
POST   /api/v1/auth/refresh           Làm mới access token
POST   /api/v1/auth/verify-email      Xác thực email
POST   /api/v1/auth/forgot-password   Quên mật khẩu
POST   /api/v1/auth/reset-password    Đặt lại mật khẩu

Quản trị tài khoản
POST   /api/v1/admin/accounts/doctor          Tạo tài khoản bác sĩ
POST   /api/v1/admin/accounts/pharmacist      Tạo tài khoản dược sĩ
POST   /api/v1/admin/accounts/patient         Tạo tài khoản bệnh nhân
PATCH  /api/v1/admin/accounts/{id}/reset-password Đặt lại mật khẩu tài khoản
PATCH  /api/v1/admin/accounts/{id}/lock       Khóa tài khoản
PATCH  /api/v1/admin/accounts/{id}/unlock     Mở khóa tài khoản

Benh nhan
GET    /api/v1/patients               Danh sách bệnh nhân (admin/doctor)
GET    /api/v1/patients/{id}          Chi tiết bệnh nhân
PUT    /api/v1/patients/{id}          Cập nhật thông tin
GET    /api/v1/patients/{id}/history  Lịch sử khám bệnh

Bac si
GET    /api/v1/doctors                Danh sách bác sĩ (public)
GET    /api/v1/doctors/{id}           Chi tiết bác sĩ
GET    /api/v1/doctors/{id}/schedule  Xem lịch làm việc bác sĩ

Quản trị lịch khám
POST   /api/v1/admin/doctors/{id}/schedule     Tạo/cập nhật lịch làm việc bác sĩ
POST   /api/v1/admin/doctors/{id}/busy-slots   Đánh dấu khoảng bận của bác sĩ
POST   /api/v1/admin/doctors/{id}/leave        Ghi ngày nghỉ đột xuất
DELETE /api/v1/admin/doctors/{id}/leave/{date} Huỷ ngày nghỉ

Ngay nghi phong kham
GET    /api/v1/holidays               Danh sách ngày lễ
POST   /api/v1/holidays               Thêm ngày lễ (admin)
DELETE /api/v1/holidays/{id}          Xoá ngày lễ (admin)

Lich hen
GET    /api/v1/appointments           Danh sách (lọc theo role)
POST   /api/v1/appointments           Đặt lịch mới
GET    /api/v1/appointments/{id}      Chi tiết lịch hẹn
PATCH  /api/v1/appointments/{id}/approve    Bác sĩ chốt lịch
PATCH  /api/v1/appointments/{id}/propose-reschedule Đề nghị hoãn/đổi giờ + ghi chú/ưu đãi
PATCH  /api/v1/appointments/{id}/check-in   Ghi nhận bệnh nhân đã đến
PATCH  /api/v1/appointments/{id}/start      Bắt đầu khám
PATCH  /api/v1/appointments/{id}/complete   Hoàn thành khám
PATCH  /api/v1/appointments/{id}/reschedule Đổi lịch
DELETE /api/v1/appointments/{id}      Hủy lịch hẹn
GET    /api/v1/appointments/available-slots Slot trống
POST   /api/v1/appointments/{id}/services   Thêm dịch vụ phát sinh
DELETE /api/v1/appointments/{id}/services/{sid} Xoá dịch vụ phát sinh

Benh an
POST   /api/v1/medical-records        Tạo hồ sơ bệnh án
GET    /api/v1/medical-records/{id}   Chi tiết hồ sơ
PUT    /api/v1/medical-records/{id}   Cập nhật hồ sơ

Don thuoc
POST   /api/v1/prescriptions          Tạo đơn thuốc
GET    /api/v1/prescriptions/{id}     Chi tiết đơn
PATCH  /api/v1/prescriptions/{id}/prepare   Chuẩn bị thuốc
PATCH  /api/v1/prescriptions/{id}/dispense  Dược sĩ xuất thuốc

Nha cung cap
GET    /api/v1/suppliers              Danh sách nhà cung cấp
POST   /api/v1/suppliers              Tạo nhà cung cấp mới
PUT    /api/v1/suppliers/{id}         Cập nhật nhà cung cấp

Thuoc
GET    /api/v1/medicines              Danh sách thuốc
POST   /api/v1/medicines              Thêm thuốc mới
PUT    /api/v1/medicines/{id}         Cập nhật thuốc
POST   /api/v1/medicines/{id}/batches/import  Nhập kho theo lô
GET    /api/v1/medicines/low-stock    Thuốc sắp hết

Hoa don
POST   /api/v1/invoices/generate/{appointment_id}  Tạo hóa đơn
GET    /api/v1/invoices/{id}          Chi tiết hóa đơn
PATCH  /api/v1/invoices/{id}/pay      Dược sĩ ghi nhận thanh toán
POST   /api/v1/invoices/{id}/refund   Hoàn tiền
GET    /api/v1/invoices/{id}/pdf      Xuất PDF

Bao cao
GET    /api/v1/reports/revenue        Báo cáo doanh thu
GET    /api/v1/reports/appointments   Báo cáo lịch hẹn
GET    /api/v1/reports/inventory      Báo cáo tồn kho
GET    /api/v1/reports/dashboard      Dữ liệu dashboard

Thong bao
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
│   │   │   ├── AppointmentApproval.jsx
│   │   │   ├── PatientList.jsx
│   │   │   ├── TodayPatients.jsx
│   │   │   ├── MedicalRecord.jsx
│   │   │   └── PrescriptionForm.jsx
│   │   ├── pharmacist/        # Giao diện dược sĩ
│   │   │   ├── PrescriptionQueue.jsx
│   │   │   ├── InventoryPage.jsx
│   │   │   ├── BillingPage.jsx
│   │   │   └── SupplierPage.jsx
│   │   └── admin/             # Giao diện quản trị
│   │       ├── AdminDashboard.jsx
│   │       ├── AccountManagement.jsx
│   │       ├── PasswordResetDialog.jsx
│   │       ├── ScheduleManagement.jsx
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

#### Bệnh nhân

| Màn hình | Chức năng |
|---|---|
| Trang chủ | Giới thiệu phòng khám, bác sĩ nổi bật, dịch vụ; hiển thị cho cả khách và bệnh nhân |
| Đặt lịch | Chọn bác sĩ → xem lịch rảnh/bận → chọn ngày giờ → xác nhận |
| Lịch hẹn của tôi | Xem, hủy lịch; lọc theo trạng thái |
| Lịch sử khám | Xem kết quả chẩn đoán, đơn thuốc cũ |
| Hóa đơn | Xem và tải hóa đơn PDF |
| Hồ sơ | Cập nhật thông tin cá nhân, dị ứng thuốc |

#### Bác sĩ

| Màn hình | Chức năng |
|---|---|
| Trang điều khiển | Lịch làm việc hôm nay, số bệnh nhân chờ, lịch cần duyệt |
| Duyệt lịch hẹn | Chốt lịch, đề nghị dời lịch, ghi chú cho bệnh nhân, thêm ưu đãi |
| Bệnh nhân | Danh sách bệnh nhân, tìm kiếm hồ sơ, xem dị ứng thuốc và lịch sử khám |
| Danh sách bệnh nhân hôm nay | Theo thứ tự, trạng thái |
| Khám bệnh | Nhập triệu chứng, chẩn đoán, phác đồ |
| Kê đơn thuốc | Tìm kiếm thuốc, nhập số lượng, kiểm tra tồn và gửi phiếu sang dược sĩ |
| Lịch sử bệnh nhân | Xem toàn bộ lịch sử khám của bệnh nhân |
| Lịch làm việc | Chỉ xem lịch đã được quản trị cấu hình, không được tự sửa |

#### Dược sĩ

| Màn hình | Chức năng |
|---|---|
| Đơn thuốc cần cấp | Danh sách `pending` / `awaiting_payment` theo thứ tự |
| Giao thuốc & thanh toán | Xác nhận từng thuốc, thu tiền, trừ kho theo lô, in hóa đơn |
| Tồn kho | Danh sách thuốc, lọc sắp hết/hết hạn |
| Nhập kho | Nhập theo lô, hạn dùng, nhà cung cấp |
| Nhà cung cấp | Quản lý thông tin nhà cung cấp thuốc |
| Lịch sử xuất nhập | Tra cứu log |

#### Quản trị

| Màn hình | Chức năng |
|---|---|
| Trang điều khiển | Tổng quan vận hành, số lịch hẹn, doanh thu, cảnh báo kho |
| Quản lý lịch khám | Tạo và chỉnh khung giờ khám, ngày nghỉ bác sĩ, ngày nghỉ phòng khám, khoảng bận |
| Quản lý tài khoản | Xem danh sách tài khoản, khóa/mở khóa, phân vai trò |
| Tạo tài khoản bác sĩ | Chỉ quản trị được tạo tài khoản bác sĩ và gắn hồ sơ bác sĩ |
| Tạo tài khoản dược sĩ | Chỉ quản trị được tạo tài khoản dược sĩ |
| Tạo tài khoản bệnh nhân | Quản trị có thể tạo tài khoản bệnh nhân nhập hộ |
| Đặt lại mật khẩu | Quản trị đặt lại mật khẩu cho tài khoản khác và có thể buộc đổi mật khẩu lần đầu |
| Báo cáo | Xem báo cáo doanh thu, bệnh nhân, tồn kho |

---

## 9. Luồng Nghiệp Vụ Đầy Đủ

```
BỆNH NHÂN                      BÁC SĨ                          DƯỢC SĨ
    │                            │                                │
    │── Đăng ký / đăng nhập ────►│                                │
    │                            │                                │
    │── Chọn bác sĩ + xem lịch rảnh/bận ─────────────────────────►│
    │── Gửi yêu cầu đặt lịch ───►│                                │
    │◄── Email đã nhận yêu cầu ───────────────────────────────────│
    │                            │                                │
    │                    [Duyệt / chốt lịch]                      │
    │◄── Email xác nhận chính thức ───────────────────────────────│
    │                            │                                │
    │                    [Hoãn / đề nghị giờ khác]                │
    │◄── Ghi chú + ưu đãi giảm giá (nếu có) ─────────────────────│
    │                            │                                │
    │── Đến phòng khám ─────────►│                                │
    │                    [Check-in / xác nhận đã đến]             │
    │                            │                                │
    │                    [Gọi bệnh nhân vào]                      │
    │                    [Khám bệnh]                              │
    │                    [Nhập chẩn đoán]                         │
    │                    [Nhập thuốc + số lượng]                  │
    │                    [Gửi phiếu thuốc] ─────────────────────► │
    │◄── Email kết quả khám ─────────────────────────────────────│
    │                            │                       [Chuẩn bị thuốc]
    │                            │                       [Kiểm tra tồn kho]
    │                            │                       [Nếu thiếu: báo lại]
    │── Đến quầy thuốc ─────────────────────────────────────────► │
    │                                                    [Lập hóa đơn]
    │                                                    [Thu tiền]
    │                                                    [In hóa đơn + DS thuốc]
    │◄─── Email hóa đơn ─────────────────────────────────────────│
    │◄─── Nhận thuốc ────────────────────────────────────────────│
    │                            │                                │
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
| **Số roles** | 3 (Admin, Doctor, Patient) | 4 (Admin, Doctor, Pharmacist, Patient) |
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
