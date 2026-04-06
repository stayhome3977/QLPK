-- ============================================================
-- Fix inventory log quantity consistency
-- This script corrects inventory logs that were storing batch quantities
-- instead of total medicine quantities
-- ============================================================

USE phong_kham_da_lieu;

-- Create a temporary table to store corrected inventory logs
CREATE TEMPORARY TABLE temp_corrected_logs AS
SELECT 
    nk.ma_nhat_ky_kho,
    nk.ma_thuoc,
    nk.ma_lo_thuoc,
    nk.ma_tai_khoan,
    nk.hanh_dong,
    nk.so_luong_thay_doi,
    -- Calculate the correct quantity_before (total stock before this log)
    (
        SELECT COALESCE(SUM(so_luong_con_lai), 0) 
        FROM lo_thuoc lt 
        WHERE lt.ma_thuoc = nk.ma_thuoc 
        AND lt.dang_ap_dung = 1
        AND lt.ma_lo_thuoc < nk.ma_lo_thuoc
    ) + (
        SELECT COALESCE(SUM(so_luong_thay_doi), 0)
        FROM nhat_ky_kho nk2
        WHERE nk2.ma_thuoc = nk.ma_thuoc
        AND nk2.ma_nhat_ky_kho < nk.ma_nhat_ky_kho
    ) as so_luong_truoc,
    -- Calculate the correct quantity_after (total stock after this log)
    (
        SELECT COALESCE(SUM(so_luong_con_lai), 0) 
        FROM lo_thuoc lt 
        WHERE lt.ma_thuoc = nk.ma_thuoc 
        AND lt.dang_ap_dung = 1
        AND lt.ma_lo_thuoc < nk.ma_lo_thuoc
    ) + (
        SELECT COALESCE(SUM(so_luong_thay_doi), 0)
        FROM nhat_ky_kho nk2
        WHERE nk2.ma_thuoc = nk.ma_thuoc
        AND nk2.ma_nhat_ky_kho <= nk.ma_nhat_ky_kho
    ) as so_luong_sau,
    nk.ma_tham_chieu,
    nk.loai_tham_chieu,
    nk.ghi_chu,
    nk.tao_luc
FROM nhat_ky_kho nk
ORDER BY nk.ma_nhat_ky_kho;

-- Update the inventory logs with corrected quantities
UPDATE nhat_ky_kho nk
SET 
    so_luong_truoc = (
        SELECT so_luong_truoc 
        FROM temp_corrected_logs tcl 
        WHERE tcl.ma_nhat_ky_kho = nk.ma_nhat_ky_kho
    ),
    so_luong_sau = (
        SELECT so_luong_sau 
        FROM temp_corrected_logs tcl 
        WHERE tcl.ma_nhat_ky_kho = nk.ma_nhat_ky_kho
    )
WHERE EXISTS (
    SELECT 1 FROM temp_corrected_logs tcl 
    WHERE tcl.ma_nhat_ky_kho = nk.ma_nhat_ky_kho
);

-- Drop the temporary table
DROP TEMPORARY TABLE temp_corrected_logs;

-- Verify the fix
SELECT 
    nk.ma_nhat_ky_kho,
    t.ten_thuoc,
    nk.hanh_dong,
    nk.so_luong_thay_doi,
    nk.so_luong_truoc,
    nk.so_luong_sau,
    (nk.so_luong_truoc + nk.so_luong_thay_doi) as calculated_after,
    CASE 
        WHEN nk.so_luong_sau = (nk.so_luong_truoc + nk.so_luong_thay_doi) 
        THEN 'CORRECT' 
        ELSE 'INCORRECT' 
    END as consistency_check
FROM nhat_ky_kho nk
JOIN thuoc t ON nk.ma_thuoc = t.ma_thuoc
ORDER BY nk.ma_nhat_ky_kho DESC
LIMIT 20;
