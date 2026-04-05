#!/usr/bin/env python3
"""
Migration script for SQLite: Create verification_codes table and add columns to tai_khoan
"""

import sqlite3
import sys
import os

def create_verification_codes_table():
    """Create verification_codes table and add columns to tai_khoan"""
    
    # Database path
    db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'qlpk.db')
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create verification_codes table
        print("Creating verification_codes table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS verification_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                code TEXT NOT NULL,
                code_type TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                used_at DATETIME NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                registration_data TEXT NULL
            )
        """)
        
        # Add indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_verification_codes_code_type ON verification_codes(code_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at)")
        
        # Add columns to tai_khoan table
        print("Adding columns to tai_khoan table...")
        
        # Check existing columns
        cursor.execute("PRAGMA table_info(tai_khoan)")
        existing_columns = [column[1] for column in cursor.fetchall()]
        
        if 'reset_code' not in existing_columns:
            cursor.execute("ALTER TABLE tai_khoan ADD COLUMN reset_code TEXT NULL")
        
        if 'reset_code_expires_at' not in existing_columns:
            cursor.execute("ALTER TABLE tai_khoan ADD COLUMN reset_code_expires_at DATETIME NULL")
        
        if 'email_verified_at' not in existing_columns:
            cursor.execute("ALTER TABLE tai_khoan ADD COLUMN email_verified_at DATETIME NULL")
        
        conn.commit()
        print("✅ Migration completed successfully!")
        
    except sqlite3.Error as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    create_verification_codes_table()
