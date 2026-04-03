import sys
import os

sys.path.append('f:/QLPK/backend')

from app.core.database import SessionLocal
from app.models.entities import Appointment

db = SessionLocal()
appointments = db.query(Appointment).filter(Appointment.proposed_date != None).all()
for app in appointments:
    print(f"App ID: {app.id}")
    print(f"Status: {app.status}")
    print(f"Proposed: {app.proposed_date} {app.proposed_time}")
    print(f"Original: {app.appointment_date} {app.appointment_time}")
    print(f"Doctor: {app.doctor_id}")
    print("---")
