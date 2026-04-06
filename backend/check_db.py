import sqlite3

conn = sqlite3.connect('qlpk.db')
cursor = conn.cursor()

# Get all tables
cursor.execute('SELECT name FROM sqlite_master WHERE type="table";')
tables = cursor.fetchall()
print('Tables:')
for table in tables:
    print(table[0])

# Check if users table exists
if any('user' in table[0].lower() for table in tables):
    # Get table schema
    cursor.execute('PRAGMA table_info(users);')
    columns = cursor.fetchall()
    print('\nUsers table schema:')
    for col in columns:
        print(col)
    
    # Get all users
    cursor.execute('SELECT email, role, is_active, email_verified_at FROM users;')
    users = cursor.fetchall()
    print('\nUsers in database:')
    for user in users:
        print(f'Email: {user[0]}, Role: {user[1]}, Active: {user[2]}, Email_verified: {user[3]}')
else:
    print('\nNo users table found')

conn.close()
