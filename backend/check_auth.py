import os
import sys

from app.core.database import SessionLocal
from app.models.entities import User
from app.core.security import verify_password

def check_login():
    db = SessionLocal()
    user = db.query(User).filter(User.email == "admin@qlpk.vn").first()
    if not user:
        print("User not found!")
        return

    print(f"Found user: {user.email}")
    is_valid = verify_password("Admin@123", user.password)
    print(f"Password 'Admin@123' valid? {is_valid}")
    
    # check others
    for u in db.query(User).all():
        print(f"{u.email} - role: {u.role.value}")

if __name__ == "__main__":
    check_login()
