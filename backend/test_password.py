#!/usr/bin/env python3
"""
Test password with current hash
"""

import bcrypt

# Current hash from database
current_hash = "$2b$12$GuZjhsId2DJLG4m.Qy8INexNKoswkjP8zLLxQoX6GOAdFD2611Osq"

print("Testing password verification...")
print(f"Current hash: {current_hash}")

# Test with common passwords
test_passwords = [
    "12345678",  # User might have entered this
    "Test@123",
    "Password123", 
    "password",
    "123456",
    "admin",
    "test",
    "Test123",
    "Password@123",
    "123456789",
    "Tronghoang1",
    "Hoang123",
    "Tronghoang123"
]

for pwd in test_passwords:
    try:
        result = bcrypt.checkpw(pwd.encode('utf-8'), current_hash.encode('utf-8'))
        if result:
            print(f"✅ FOUND MATCH: '{pwd}'")
            break
        else:
            print(f"❌ '{pwd}': False")
    except Exception as e:
        print(f"❌ '{pwd}': Error - {e}")

# Also test creating new hash with same password to compare
print("\nCreating new hash with '12345678':")
new_hash = bcrypt.hashpw("12345678".encode('utf-8'), bcrypt.gensalt(rounds=12))
print(f"New hash: {new_hash.decode()}")

print(f"Original hash matches new hash: {bcrypt.checkpw('12345678'.encode('utf-8'), new_hash)}")
