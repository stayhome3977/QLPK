-- ============================================================
-- Migration: Add 'import' action to nhat_ky_kho.hanh_dong ENUM
-- Reason: Fix batch import error - hanh_dong column needs 'import' value
-- Database: MySQL
-- ============================================================

USE phong_kham_da_lieu;

-- Modify the hanh_dong column to include 'import' value
ALTER TABLE nhat_ky_kho 
MODIFY COLUMN hanh_dong ENUM('nhap','xuat','dieu_chinh','het_han','tra_hang_nhap','import') NOT NULL;

-- For SQLite: Run migration_fix_sqlite.py instead
-- For PostgreSQL: ALTER TABLE nhat_ky_kho ALTER COLUMN hanh_dong TYPE TEXT;
--                ALTER TABLE nhat_ky_kho ADD CONSTRAINT chk_hanh_dong 
--                CHECK (hanh_dong IN ('nhap','xuat','dieu_chinh','het_han','tra_hang_nhap','import'));
