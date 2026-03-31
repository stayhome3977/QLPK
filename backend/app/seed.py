from datetime import datetime, time

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.entities import (
    Doctor,
    DoctorSchedule,
    Patient,
    PatientSource,
    RoleEnum,
    Service,
    User,
)


def next_patient_code(db: Session) -> str:
    total = db.query(Patient).count() + 1
    return f"BN{total:06d}"


def seed_defaults(db: Session, admin_email: str, admin_password: str) -> None:
    if not db.query(User).filter(User.email == admin_email).first():
        db.add(
            User(
                email=admin_email,
                password=get_password_hash(admin_password),
                role=RoleEnum.admin,
                full_name="System Admin",
                is_active=True,
                email_verified_at=datetime.utcnow(),
            )
        )

    if not db.query(User).filter(User.email == "doctor@qlpk.vn").first():
        doctor_user = User(
            email="doctor@qlpk.vn",
            password=get_password_hash("Doctor@123"),
            role=RoleEnum.doctor,
            full_name="BS. Nguyen Thi Lan",
            phone="0900000001",
            is_active=True,
            email_verified_at=datetime.utcnow(),
        )
        db.add(doctor_user)
        db.flush()

        doctor = Doctor(
            user_id=doctor_user.id,
            specialty="Da liễu",
            license_number="DL-001",
            degree="Thạc sĩ",
            experience_years=8,
            consultation_fee=250000,
            bio="Chuyên điều trị mụn, viêm da và chăm sóc da thẩm mỹ.",
        )
        db.add(doctor)
        db.flush()

        for day in range(1, 6):
            db.add(
                DoctorSchedule(
                    doctor_id=doctor.id,
                    day_of_week=day,
                    start_time=time(8, 0),
                    end_time=time(17, 0),
                    slot_duration=30,
                    max_patients=2,
                )
            )

    if not db.query(Service).count():
        db.add_all(
            [
                Service(name="Khám da liễu tổng quát", category="Khám", price=250000, duration=30),
                Service(name="Điều trị mụn", category="Điều trị", price=400000, duration=45),
                Service(name="Laser xóa thâm", category="Laser", price=650000, duration=60),
            ]
        )

    if not db.query(User).filter(User.email == "patient@qlpk.vn").first():
        patient_user = User(
            email="patient@qlpk.vn",
            password=get_password_hash("Patient@123"),
            role=RoleEnum.patient,
            full_name="Nguyen Van A",
            phone="0900000002",
            is_active=True,
            email_verified_at=datetime.utcnow(),
        )
        db.add(patient_user)
        db.flush()
        db.add(
            Patient(
                user_id=patient_user.id,
                patient_code=next_patient_code(db),
                created_source=PatientSource.self_register,
            )
        )

    demo_users = [
        ("reception@qlpk.vn", "Le Tan", RoleEnum.receptionist, "0900000003"),
        ("cashier@qlpk.vn", "Thu Ngan", RoleEnum.cashier, "0900000004"),
        ("pharmacist@qlpk.vn", "Duoc Si", RoleEnum.pharmacist, "0900000005"),
    ]
    for email, full_name, role, phone in demo_users:
        if not db.query(User).filter(User.email == email).first():
            db.add(
                User(
                    email=email,
                    password=get_password_hash("Demo@123"),
                    role=role,
                    full_name=full_name,
                    phone=phone,
                    is_active=True,
                    email_verified_at=datetime.utcnow(),
                )
            )

    db.commit()
