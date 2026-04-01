import sys
from app.core.database import SessionLocal
from app.models.entities import User
from app.core.security import verify_password

def check():
    db = SessionLocal()
    user = db.query(User).filter(User.email == "pharmacist@qlpk.vn").first()
    if not user:
        print("Pharmacist user not found in DB!")
    else:
        print(f"Pharmacist found: {user.email}, Role: {user.role}, Active: {user.is_active}")
        print(f"Password 'Pharmacist@123' match: {verify_password('Pharmacist@123', user.password)}")

if __name__ == "__main__":
    check()
