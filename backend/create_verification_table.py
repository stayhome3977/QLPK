import sqlite3

conn = sqlite3.connect('qlpk.db')
cursor = conn.cursor()

# Check if verification_codes table exists
cursor.execute('SELECT name FROM sqlite_master WHERE type="table" AND name = "verification_codes";')
table_exists = cursor.fetchone()

if table_exists:
    print('verification_codes table exists')
    cursor.execute('PRAGMA table_info(verification_codes);')
    columns = cursor.fetchall()
    print('Table schema:')
    for col in columns:
        print(col)
else:
    print('verification_codes table does not exist')
    print('Creating verification_codes table...')
    
    # Create verification_codes table for SQLite
    cursor.execute('''
    CREATE TABLE verification_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR(150) NOT NULL,
        code VARCHAR(10) NOT NULL,
        code_type VARCHAR(20) NOT NULL CHECK (code_type IN ('verification', 'password_reset')),
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        registration_data TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create indexes
    cursor.execute('CREATE INDEX idx_verification_codes_email ON verification_codes(email);')
    cursor.execute('CREATE INDEX idx_verification_codes_code_type ON verification_codes(code_type);')
    cursor.execute('CREATE INDEX idx_verification_codes_expires_at ON verification_codes(expires_at);')
    
    conn.commit()
    print('verification_codes table created successfully')

# Check if tai_khoan table has email_verified_at column
cursor.execute('PRAGMA table_info(tai_khoan);')
columns = cursor.fetchall()
email_verified_exists = any(col[1] == 'email_xac_thuc_luc' for col in columns)

if email_verified_exists:
    print('email_xac_thuc_luc column exists in tai_khoan table')
else:
    print('email_xac_thuc_luc column does not exist - adding it...')
    cursor.execute('ALTER TABLE tai_khoan ADD COLUMN email_xac_thuc_luc DATETIME NULL')
    conn.commit()
    print('email_xac_thuc_luc column added')

conn.close()
