#!/usr/bin/env python3
"""
Debug login issue
"""

import bcrypt
from app.core.database import get_db
from app.models.entities import User

def debug_login():
    """Debug login process"""
    db = next(get_db())
    
    # Get the latest user
    user = db.query(User).filter(User.email.like("%gmail%")).order_by(User.id.desc()).first()
    
    if not user:
        print("No user found")
        return
    
    print(f"User: {user.email}")
    print(f"ID: {user.id}")
    print(f"Active: {user.is_active}")
    print(f"Email verified: {user.email_verified_at}")
    print(f"Password hash: {user.password}")
    
    # Test different passwords
    test_passwords = ["12345678", "Test@123", "Password123", "password"]
    
    for pwd in test_passwords:
        try:
            result = bcrypt.checkpw(pwd.encode('utf-8'), user.password.encode('utf-8'))
            print(f"Password '{pwd}': {result}")
        except Exception as e:
            print(f"Password '{pwd}': Error - {e}")

if __name__ == "__main__":
    debug_login()
