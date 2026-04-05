-- ============================================================
-- Migration: Add registration_data column to verification_codes
-- Reason: Store registration data for email verification workflow
-- Database: MySQL
-- ============================================================

USE phong_kham_da_lieu;

-- Add registration_data column to verification_codes table
SET @column_exists = (SELECT COUNT(*) 
                      FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'phong_kham_da_lieu' 
                      AND TABLE_NAME = 'verification_codes' 
                      AND COLUMN_NAME = 'registration_data');

SET @sql = IF(@column_exists = 0, 
              'ALTER TABLE verification_codes ADD COLUMN registration_data TEXT NULL',
              'SELECT "Column registration_data already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- For SQLite: Run migration_fix_sqlite.py instead
-- For PostgreSQL: ALTER TABLE verification_codes ADD COLUMN registration_data TEXT;
