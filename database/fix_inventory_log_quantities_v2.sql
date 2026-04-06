-- ============================================================
-- Fix inventory log quantity consistency - Simplified Version
-- This script corrects inventory logs by recalculating quantities
-- based on the chronological order of operations
-- ============================================================

USE phong_kham_da_lieu;

-- First, let's see what we're working with
SELECT 
    'Current inventory logs with potential issues:' as info;
    
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
        ELSE 'INCORRECT - NEEDS FIX' 
    END as status
FROM nhat_ky_kho nk
JOIN thuoc t ON nk.ma_thuoc = t.ma_thuoc
ORDER BY nk.ma_nhat_ky_kho DESC
LIMIT 10;

-- Create a more straightforward fix using variables and cursor approach
DELIMITER //

CREATE PROCEDURE FixInventoryLogs()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE log_id INT;
    DECLARE med_id INT;
    DECLARE qty_change INT;
    DECLARE current_stock INT DEFAULT 0;
    DECLARE last_med_id INT DEFAULT -1;
    
    DECLARE log_cursor CURSOR FOR 
        SELECT ma_nhat_ky_kho, ma_thuoc, so_luong_thay_doi 
        FROM nhat_ky_kho 
        ORDER BY ma_thuoc, ma_nhat_ky_kho;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Create temporary table to store fixes
    CREATE TEMPORARY TABLE IF NOT EXISTS log_fixes (
        ma_nhat_ky_kho INT PRIMARY KEY,
        so_luong_truoc INT,
        so_luong_sau INT
    );
    
    TRUNCATE TABLE log_fixes;
    
    OPEN log_cursor;
    
    read_loop: LOOP
        FETCH log_cursor INTO log_id, med_id, qty_change;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Reset stock when we move to a new medicine
        IF med_id != last_med_id THEN
            SET current_stock = 0;
            SET last_med_id = med_id;
        END IF;
        
        -- Store the fix
        INSERT INTO log_fixes (ma_nhat_ky_kho, so_luong_truoc, so_luong_sau)
        VALUES (log_id, current_stock, current_stock + qty_change);
        
        -- Update current stock
        SET current_stock = current_stock + qty_change;
        
    END LOOP;
    
    CLOSE log_cursor;
    
    -- Apply the fixes
    UPDATE nhat_ky_kho nk
    JOIN log_fixes lf ON nk.ma_nhat_ky_kho = lf.ma_nhat_ky_kho
    SET 
        nk.so_luong_truoc = lf.so_luong_truoc,
        nk.so_luong_sau = lf.so_luong_sau;
    
    -- Clean up
    DROP TEMPORARY TABLE log_fixes;
    
END //

DELIMITER ;

-- Run the fix
CALL FixInventoryLogs();

-- Drop the procedure
DROP PROCEDURE FixInventoryLogs;

-- Verify the fix
SELECT 
    'Fixed inventory logs - verification:' as info;

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
        ELSE 'STILL INCORRECT' 
    END as status
FROM nhat_ky_kho nk
JOIN thuoc t ON nk.ma_thuoc = t.ma_thuoc
ORDER BY nk.ma_nhat_ky_kho DESC
LIMIT 10;
