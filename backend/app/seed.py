from datetime import date, datetime, time

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.entities import (
    Doctor,
    DoctorSchedule,
    Medicine,
    MedicineBatch,
    Patient,
    PatientSource,
    RoleEnum,
    Service,
    Supplier,
    User,
)


def next_patient_code(db: Session) -> str:
    total = db.query(Patient).count() + 1
    return f"BN-{total:04d}"


def ensure_user(
    db: Session,
    *,
    email: str,
    password: str,
    role: RoleEnum,
    full_name: str,
    phone: str | None = None,
) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.role = role
        user.full_name = full_name
        user.phone = phone
        user.is_active = True
        user.email_verified_at = user.email_verified_at or datetime.utcnow()
        user.password = get_password_hash(password)  # always sync password on seed
        return user

    user = User(
        email=email,
        password=get_password_hash(password),
        role=role,
        full_name=full_name,
        phone=phone,
        is_active=True,
        email_verified_at=datetime.utcnow(),
    )
    db.add(user)
    db.flush()
    return user


def seed_defaults(db: Session, admin_email: str, admin_password: str) -> None:
    admin = ensure_user(
        db,
        email=admin_email,
        password=admin_password,
        role=RoleEnum.admin,
        full_name="Quản trị viên",
        phone="0900000000",
    )

    doctor_user = ensure_user(
        db,
        email="doctor@qlpk.vn",
        password="Doctor@123",
        role=RoleEnum.doctor,
        full_name="BS. Nguyễn Thị Lan",
        phone="0900000001",
    )
    doctor = db.query(Doctor).filter(Doctor.user_id == doctor_user.id).first()
    if not doctor:
        doctor = Doctor(
            user_id=doctor_user.id,
            specialty="Da liễu",
            license_number="DL-001",
            degree="Thạc sĩ Y khoa",
            experience_years=8,
            consultation_fee=250000,
            bio="Chuyên điều trị mụn, viêm da và theo dõi tái khám da liễu.",
        )
        db.add(doctor)
        db.flush()
    if not db.query(DoctorSchedule).filter(DoctorSchedule.doctor_id == doctor.id).count():
        for day in range(1, 6):
            db.add(
                DoctorSchedule(
                    doctor_id=doctor.id,
                    day_of_week=day,
                    start_time=time(8, 0),
                    end_time=time(16, 30),
                    slot_duration=30,
                    max_patients=1,
                )
            )

    doctor2_user = ensure_user(
        db,
        email="doctor2@qlpk.vn",
        password="Doctor@123",
        role=RoleEnum.doctor,
        full_name="BS. Trần Minh Khoa",
        phone="0900000006",
    )
    doctor2 = db.query(Doctor).filter(Doctor.user_id == doctor2_user.id).first()
    if not doctor2:
        doctor2 = Doctor(
            user_id=doctor2_user.id,
            specialty="Thẩm mỹ da",
            license_number="DL-002",
            degree="Tiến sĩ Y khoa",
            experience_years=12,
            consultation_fee=350000,
            bio="Chuyên gia laser trị nám, trẻ hóa da và phục hồi sau thủ thuật.",
        )
        db.add(doctor2)
        db.flush()
    if not db.query(DoctorSchedule).filter(DoctorSchedule.doctor_id == doctor2.id).count():
        for day in [1, 3, 5]:
            db.add(
                DoctorSchedule(
                    doctor_id=doctor2.id,
                    day_of_week=day,
                    start_time=time(9, 0),
                    end_time=time(17, 0),
                    slot_duration=45,
                    max_patients=1,
                )
            )

    patient_user = ensure_user(
        db,
        email="patient@qlpk.vn",
        password="Patient@123",
        role=RoleEnum.patient,
        full_name="Nguyễn Văn An",
        phone="0900000002",
    )
    if not db.query(Patient).filter(Patient.user_id == patient_user.id).first():
        db.add(
            Patient(
                user_id=patient_user.id,
                patient_code=next_patient_code(db),
                created_source=PatientSource.self_register,
            )
        )

    ensure_user(
        db,
        email="pharmacist@qlpk.vn",
        password="Pharmacist@123",
        role=RoleEnum.pharmacist,
        full_name="Võ Dược Sĩ",
        phone="0900000005",
    )

    obsolete_staff = [
        "reception@qlpk.vn",
        "cashier@qlpk.vn",
    ]
    for email in obsolete_staff:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.is_active = False

    if not db.query(Service).count():
        db.add_all(
            [
                Service(
                    name="Khám da liễu tổng quát",
                    category="Khám tổng quát",
                    price=200000,
                    duration=30,
                    description="Khám và tư vấn các vấn đề da liễu thông thường.",
                ),
                Service(
                    name="Điều trị mụn chuyên sâu",
                    category="Điều trị mụn",
                    price=350000,
                    duration=45,
                    description="Theo dõi và xử lý mụn viêm, mụn ẩn, chăm sóc sau mụn.",
                ),
                Service(
                    name="Laser trị nám tàn nhang",
                    category="Laser thẩm mỹ",
                    price=800000,
                    duration=60,
                    description="Điều trị nám, tàn nhang bằng công nghệ laser.",
                ),
                Service(
                    name="Soi da và tư vấn phác đồ",
                    category="Tư vấn",
                    price=250000,
                    duration=30,
                    description="Soi da, tư vấn chăm sóc và định hướng điều trị phù hợp.",
                ),
                Service(
                    name="Điều trị viêm da cơ địa",
                    category="Điều trị bệnh da",
                    price=300000,
                    duration=30,
                    description="Theo dõi và kiểm soát viêm da dị ứng, chàm, mề đay.",
                ),
            ]
        )

    if not db.query(Supplier).count():
        db.add(
            Supplier(
                name="Công ty Dược phẩm Mẫu",
                contact_name="Nguyễn Văn A",
                phone="0911222333",
                email="nhacungcap@example.com",
                address="TP.HCM",
                tax_code="0312345678",
            )
        )

    if not db.query(Medicine).count():
        stock_rows = [
            ("Tretinoin 0.025%", "Tretinoin", "Retinoid", "Tuýp", 85000, 100, 20),
            ("Clindamycin Phosphate 1%", "Clindamycin", "Kháng sinh", "Tuýp", 65000, 80, 20),
            ("Cetirizine 10mg", "Cetirizine", "Kháng histamin", "Viên", 5000, 500, 100),
            ("Hydrocortisone 1%", "Hydrocortisone", "Corticosteroid", "Tuýp", 45000, 90, 20),
        ]
        for name, generic, category, unit, price, stock, reorder in stock_rows:
            medicine = Medicine(
                name=name,
                generic_name=generic,
                category=category,
                unit=unit,
                price_per_unit=price,
                current_stock=stock,
                reorder_level=reorder,
                manufacturer="Dược phẩm Việt Nam",
                description=f"Thuốc mẫu cho nhóm {category.lower()}",
            )
            db.add(medicine)
            db.flush()
            db.add(
                MedicineBatch(
                    medicine_id=medicine.id,
                    batch_number=f"LO-{medicine.id:03d}-2026",
                    expiry_date=date(2027, 12, 31),
                    import_quantity=stock,
                    remaining_quantity=stock,
                    import_unit_cost=int(price * 0.7),
                    supplier_name="Công ty Dược phẩm Mẫu",
                )
            )
    db.commit()
