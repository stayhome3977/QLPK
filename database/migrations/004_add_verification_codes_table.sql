-- ============================================================
-- Migration: Add verification_codes table for email verification
-- Reason: Support email verification and password reset functionality
-- Database: MySQL
-- ============================================================

USE phong_kham_da_lieu;

-- Create verification_codes table
CREATE TABLE IF NOT EXISTS verification_codes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(150) NOT NULL,
    code VARCHAR(10) NOT NULL,
    code_type ENUM('verification', 'password_reset') NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_verification_codes_email (email),
    INDEX idx_verification_codes_code_type (code_type),
    INDEX idx_verification_codes_expires_at (expires_at),
    CONSTRAINT chk_verification_codes_code_type CHECK (code_type IN ('verification', 'password_reset'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add reset_code and reset_code_expires_at columns to tai_khoan table
-- Check if columns exist before adding them
SET @column_exists = (SELECT COUNT(*) 
                      FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'phong_kham_da_lieu' 
                      AND TABLE_NAME = 'tai_khoan' 
                      AND COLUMN_NAME = 'reset_code');

SET @sql = IF(@column_exists = 0, 
              'ALTER TABLE tai_khoan ADD COLUMN reset_code VARCHAR(10) NULL, ADD COLUMN reset_code_expires_at DATETIME NULL',
              'SELECT "Column reset_code already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add email_verified_at column to tai_khoan table
SET @column_exists = (SELECT COUNT(*) 
                      FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'phong_kham_da_lieu' 
                      AND TABLE_NAME = 'tai_khoan' 
                      AND COLUMN_NAME = 'email_verified_at');

SET @sql = IF(@column_exists = 0, 
              'ALTER TABLE tai_khoan ADD COLUMN email_verified_at DATETIME NULL',
              'SELECT "Column email_verified_at already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- For SQLite: Run migration_fix_sqlite.py instead
-- For PostgreSQL: 
-- CREATE TABLE verification_codes (
--     id SERIAL PRIMARY KEY,
--     email VARCHAR(150) NOT NULL,
--     code VARCHAR(10) NOT NULL,
--     code_type TEXT NOT NULL CHECK (code_type IN ('verification', 'password_reset')),
--     expires_at TIMESTAMP NOT NULL,
--     used_at TIMESTAMP NULL,
--     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE INDEX idx_verification_codes_email ON verification_codes(email);
-- CREATE INDEX idx_verification_codes_code_type ON verification_codes(code_type);
-- CREATE INDEX idx_verification_codes_expires_at ON verification_codes(expires_at);
