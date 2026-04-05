#!/usr/bin/env python3
"""
Migration script for SQLite: Add registration_data column to verification_codes table
"""

import sqlite3
import sys
import os

def add_registration_data_column():
    """Add registration_data column to verification_codes table"""
    
    # Database path
    db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'qlpk.db')
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(verification_codes)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'registration_data' not in columns:
            print("Adding registration_data column to verification_codes table...")
            
            # Add the column
            cursor.execute("ALTER TABLE verification_codes ADD COLUMN registration_data TEXT")
            
            conn.commit()
            print("✅ registration_data column added successfully!")
        else:
            print("✅ registration_data column already exists!")
            
    except sqlite3.Error as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_registration_data_column()
