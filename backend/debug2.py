import sys
import os

sys.path.append('f:/QLPK/backend')

from app.core.database import SessionLocal
from app.models.entities import Appointment, User
from app.schemas.api import ReschedulePayload
from app.routers.clinic import reschedule_appointment
from fastapi import HTTPException

db = SessionLocal()
user = db.query(User).filter(User.id == 1).first() # Assuming admin or patient
payload = ReschedulePayload(
    appointment_date='2026-04-06',
    appointment_time='10:00:00',
    reason='Bệnh nhân đã chốt lịch mới từ đề nghị dời lịch của bác sĩ.'
)

try:
    res = reschedule_appointment(2, payload, db, user)
    print("Success!")
except HTTPException as e:
    print(f"HTTPException: {e.status_code} - {e.detail}")
except Exception as e:
    print(f"Exception: {e}")
