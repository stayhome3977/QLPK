---
description: Schema MySQL, tên bảng, cột chính và quan hệ. Load khi làm việc với models, migrations, SQL.
globs: ["**/models/**", "**/migrations/**", "**/*.sql", "**/schemas/**", "**/database*"]
alwaysApply: false
---

# Database Rules

## Cấu hình
- Engine: InnoDB | Charset: utf8mb4_unicode_ci
- File khởi tạo: `database/migrations/001_create_all_tables.sql`
- **Tên bảng/cột Việt hóa không dấu — cố định, không được rename**

## Bảng chính

### `tai_khoan`
`id` · `email` (unique) · `mat_khau` (bcrypt) · `vai_tro` ENUM(benh_nhan|bac_si|duoc_si|quan_tri) · `is_active` · `email_verified_at` · `last_login`

### `benh_nhan` ← 1-1 `tai_khoan`
`tai_khoan_id` · `ho_ten` · `ngay_sinh` · `gioi_tinh` · `sdt` · `dia_chi` · `di_ung_thuoc`

### `bac_si` ← 1-1 `tai_khoan`
`tai_khoan_id` · `ho_ten` · `chuyen_khoa` · `kinh_nghiem_nam` · `mo_ta` · `anh`

### `lich_hen`
`id` · `benh_nhan_id` · `bac_si_id` · `dich_vu_id` · `ngay_hen` · `gio_bat_dau` · `gio_ket_thuc` · `ly_do_kham` · `trang_thai` · `doctor_note` · `giam_gia`

### `don_thuoc`
`id` · `lich_hen_id` · `bac_si_id` · `benh_nhan_id` · `chan_doan` · `phac_do` · `trang_thai` ENUM(pending|awaiting_payment|dispensed)

### `chi_tiet_don_thuoc`
`don_thuoc_id` · `thuoc_id` · `lo_id` · `so_luong` · `don_vi` · `lieu_dung`

### `thuoc`
`id` · `ten_thuoc` · `hoat_chat` · `dang_bao_che` · `don_vi_tinh` · `gia_ban` · `so_luong_ton`

### `lo_thuoc`
`id` · `thuoc_id` · `nha_cung_cap_id` · `so_lo` · `han_dung` · `so_luong_nhap` · `so_luong_con` · `gia_nhap`

### `hoa_don` + `chi_tiet_hoa_don` + `giao_dich_thanh_toan`
Tách 3 bảng để đối soát — `hoa_don` → `lich_hen_id` + `don_thuoc_id` · `tong_tien` · `giam_tru_bhyt` · `thanh_tien`

## Quan hệ
```
tai_khoan 1──1 benh_nhan / bac_si
benh_nhan 1──N lich_hen ──1 don_thuoc ──N chi_tiet_don_thuoc
don_thuoc 1──1 hoa_don ──N chi_tiet_hoa_don
hoa_don   1──N giao_dich_thanh_toan
thuoc     1──N lo_thuoc
```

## Rules bắt buộc
- **Không bao giờ dùng string-format SQL** — chỉ SQLAlchemy ORM hoặc parameterized query
- Kho thuốc quản lý theo **lô** — trừ `lo_thuoc.so_luong_con` khi giao thuốc, không cộng dồn vào `thuoc.so_luong_ton` trực tiếp
- BHYT = chỉ lưu `giam_tru_bhyt` nội bộ, không tích hợp claim bảo hiểm thật
- App user chỉ có quyền `SELECT, INSERT, UPDATE, DELETE` — không `DROP, ALTER, CREATE`
