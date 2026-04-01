from app.core.database import SessionLocal
from app.models.entities import User
from app.core.security import verify_password

db = SessionLocal()
users = db.query(User).all()
for u in users:
    print(f"Email: {u.email} | Role: {u.role} | Active: {u.is_active}")
    print(f"  Password Match 'Patient@123': {verify_password('Patient@123', u.password) if u.password else 'No Password Set'}")
