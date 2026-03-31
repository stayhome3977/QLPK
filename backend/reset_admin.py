import sys

from app.core.database import SessionLocal
from app.models.entities import User
from app.core.security import get_password_hash

def reset_admin():
    db = SessionLocal()
    user = db.query(User).filter(User.email == "admin@qlpk.vn").first()
    if not user:
        print("Admin user not found!")
        return

    # Reset password to Admin@123
    user.password = get_password_hash("Admin@123")
    db.commit()
    print("Admin password has been reset to Admin@123 successfully.")

if __name__ == "__main__":
    reset_admin()
