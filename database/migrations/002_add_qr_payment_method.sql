-- ============================================================
-- Migration: Add QR code payment method
-- Description: Add 'qr' option to payment_method enum in giao_dich_thanh_toan table
-- ============================================================

USE phong_kham_da_lieu;

-- Modify the phuong_thuc column to add 'qr' option
ALTER TABLE giao_dich_thanh_toan 
MODIFY COLUMN phuong_thuc ENUM('tien_mat','the','chuyen_khoan','qr','ho_tro_noi_bo','khac') NOT NULL;
