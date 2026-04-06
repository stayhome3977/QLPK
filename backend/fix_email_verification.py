import sqlite3
from datetime import datetime

conn = sqlite3.connect('qlpk.db')
cursor = conn.cursor()

# Check email verification for patient account
cursor.execute('SELECT email, email_xac_thuc_luc FROM tai_khoan WHERE email = "patient@qlpk.vn";')
user = cursor.fetchone()

if user:
    email, email_verified = user
    print(f'Email: {email}')
    print(f'Email verified at: {email_verified}')
    
    if email_verified is None:
        print('Email not verified - this is the problem!')
        # Update email verification
        cursor.execute('UPDATE tai_khoan SET email_xac_thuc_luc = ? WHERE email = ?', (datetime.utcnow(), 'patient@qlpk.vn'))
        conn.commit()
        print('Email verification updated')
        
        # Verify update
        cursor.execute('SELECT email, email_xac_thuc_luc FROM tai_khoan WHERE email = "patient@qlpk.vn";')
        updated_user = cursor.fetchone()
        print(f'Updated email verification: {updated_user[1]}')
    else:
        print('Email already verified')
else:
    print('User not found')

conn.close()
