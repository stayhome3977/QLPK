from app.core.database import SessionLocal
from app.models.entities import Appointment, DoctorSchedule, DoctorBusySlot
from app.routers.clinic import get_available_slots_logic
from datetime import date

db = SessionLocal()

appointments = db.query(Appointment).filter(Appointment.proposed_date.isnot(None)).all()
print(f"Found {len(appointments)} proposals")

for apt in appointments:
    print(f"Apt ID: {apt.id}, Doctor: {apt.doctor_id}, Proposed Date: {apt.proposed_date}, Proposed Time: {apt.proposed_time}")
    slots = get_available_slots_logic(db, apt.doctor_id, apt.proposed_date)
    print("Available slots:")
    for slot in slots:
        if slot["available"]:
            print(f"  {slot['time']} - {slot['end_time']}")
    
    proposed_str = apt.proposed_time.strftime("%H:%M") if apt.proposed_time else None
    available_keys = [item["time"] for item in slots if item["available"]]
    is_valid = proposed_str in available_keys
    print(f"Is proposed time {proposed_str} among available valid slots? {is_valid}")
    if not is_valid:
        print(f"Proposed time {proposed_str} is NOT in available_keys: {available_keys}")

db.close()
