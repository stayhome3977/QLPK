---
description: Project identity, stack, roles và kiến trúc tổng thể. LUÔN áp dụng cho mọi file.
globs: ["**/*"]
alwaysApply: true
---

# Phòng Khám Da Liễu — Project Rules

## Stack
| Layer | Tech |
|-------|------|
| Backend | Python 3.11, FastAPI, SQLAlchemy, Alembic, Pydantic v2, PyMySQL |
| Frontend | React 19, Vite, TailwindCSS v3, ShadcnUI, React Query v5, React Hook Form + Zod, Axios |
| Database | MySQL 8.0, utf8mb4, InnoDB |
| Auth | JWT access 30m / refresh 7d (HttpOnly cookie), bcrypt |
| Realtime | Socket.IO |

## 4 Roles & Redirect sau login
| Role | Sau login |
|------|-----------|
| `benh_nhan` | `/` trang chủ (có thêm menu cá nhân) |
| `bac_si` | `/doctor/dashboard` |
| `duoc_si` | `/pharmacy/dashboard` |
| `quan_tri` | `/admin/dashboard` |

> Đăng xuất → luôn về `/login`  
> `bac_si` và `duoc_si` không thấy trang chủ public

## Trạng thái lịch hẹn (KHÔNG đổi tên)
`pending` → `confirmed` → `checked_in` → `in_progress` → `completed` | `cancelled` | `no_show`

## Nguyên tắc bất biến
- Migration chính: `database/migrations/001_create_all_tables.sql`
- Tên bảng/cột Việt hóa không dấu — không được đổi
- FE ↔ BE chỉ qua REST `/api/v1/`
- Access token trong JS memory — KHÔNG localStorage
- Chỉ `quan_tri` tạo tài khoản bác sĩ/dược sĩ và quản lý lịch khám tổng thể
