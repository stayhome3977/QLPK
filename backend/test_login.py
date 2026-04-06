import sqlite3
from app.core.security import verify_password

conn = sqlite3.connect('qlpk.db')
cursor = conn.cursor()

# Test patient login
cursor.execute('SELECT email, mat_khau, vai_tro, dang_hoat_dong FROM tai_khoan WHERE email = "patient@qlpk.vn";')
user = cursor.fetchone()

if user:
    email, stored_password, role, is_active = user
    print(f'Found user: {email}, role: {role}, active: {is_active}')
    
    # Test password verification
    test_password = 'Patient@123'
    is_valid = verify_password(test_password, stored_password)
    print(f'Password verification for "{test_password}": {is_valid}')
else:
    print('User not found')

conn.close()
