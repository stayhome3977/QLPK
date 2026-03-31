from datetime import datetime, time

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
    User,
)


def next_patient_code(db: Session) -> str:
    total = db.query(Patient).count() + 1
    return f"BN{total:06d}"


def seed_defaults(db: Session, admin_email: str, admin_password: str) -> None:
    # Admin
    if not db.query(User).filter(User.email == admin_email).first():
        db.add(
            User(
                email=admin_email,
                password=get_password_hash(admin_password),
                role=RoleEnum.admin,
                full_name="Quản Trị Viên",
                is_active=True,
                email_verified_at=datetime.utcnow(),
            )
        )

    # Bác sĩ 1
    if not db.query(User).filter(User.email == "doctor@qlpk.vn").first():
        doctor_user = User(
            email="doctor@qlpk.vn",
            password=get_password_hash("Doctor@123"),
            role=RoleEnum.doctor,
            full_name="BS. Nguyễn Thị Lan",
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
            degree="Thạc sĩ Y khoa",
            experience_years=8,
            consultation_fee=250000,
            bio="Chuyên điều trị mụn, viêm da và chăm sóc da thẩm mỹ. 8 năm kinh nghiệm tại bệnh viện Da Liễu TP.HCM.",
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

    # Bác sĩ 2
    if not db.query(User).filter(User.email == "doctor2@qlpk.vn").first():
        doctor2_user = User(
            email="doctor2@qlpk.vn",
            password=get_password_hash("Doctor@123"),
            role=RoleEnum.doctor,
            full_name="BS. Trần Minh Khoa",
            phone="0900000006",
            is_active=True,
            email_verified_at=datetime.utcnow(),
        )
        db.add(doctor2_user)
        db.flush()

        doctor2 = Doctor(
            user_id=doctor2_user.id,
            specialty="Thẩm mỹ da",
            license_number="DL-002",
            degree="Tiến sĩ Y khoa",
            experience_years=12,
            consultation_fee=350000,
            bio="Chuyên gia thẩm mỹ da, laser điều trị nám, tàn nhang và trẻ hóa da. 12 năm kinh nghiệm quốc tế.",
        )
        db.add(doctor2)
        db.flush()

        for day in [1, 3, 5]:  # T2, T4, T6
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

    # Dịch vụ
    if not db.query(Service).count():
        db.add_all(
            [
                Service(name="Khám da liễu tổng quát", category="Khám", price=250000, duration=30,
                        description="Khám và tư vấn các vấn đề da liễu tổng quát."),
                Service(name="Điều trị mụn chuyên sâu", category="Điều trị", price=400000, duration=45,
                        description="Điều trị mụn bằng các phương pháp chuyên sâu, phù hợp mọi loại da."),
                Service(name="Laser xóa thâm & nám", category="Laser", price=650000, duration=60,
                        description="Công nghệ laser hiện đại xóa thâm, nám, tàn nhang hiệu quả."),
                Service(name="Chăm sóc da cơ bản", category="Chăm sóc", price=300000, duration=60,
                        description="Làm sạch sâu, dưỡng ẩm và phục hồi da bị tổn thương."),
                Service(name="Peel da hóa học", category="Điều trị", price=500000, duration=45,
                        description="Loại bỏ tế bào chết, tái tạo da, cải thiện tông màu da."),
                Service(name="Điều trị viêm da cơ địa", category="Điều trị", price=350000, duration=30,
                        description="Điều trị viêm da dị ứng, á sừng, chàm theo phác đồ chuyên biệt."),
            ]
        )

    # Bệnh nhân demo
    if not db.query(User).filter(User.email == "patient@qlpk.vn").first():
        patient_user = User(
            email="patient@qlpk.vn",
            password=get_password_hash("Patient@123"),
            role=RoleEnum.patient,
            full_name="Nguyễn Văn An",
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

    # Staff demo
    demo_users = [
        ("reception@qlpk.vn", "Lê Thị Hoa", RoleEnum.receptionist, "0900000003"),
        ("cashier@qlpk.vn", "Phạm Thu Ngân", RoleEnum.cashier, "0900000004"),
        ("pharmacist@qlpk.vn", "Võ Dược Sĩ", RoleEnum.pharmacist, "0900000005"),
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

    # Thuốc mẫu da liễu
    if not db.query(Medicine).count():
        medicines_data = [
            ("Tretinoin 0.025%", "Tretinoin", "Retinoid", "Tuýp", 85000, 100, 20,
             "Dùng điều trị mụn trứng cá và lão hóa da."),
            ("Clindamycin Phosphate 1%", "Clindamycin", "Kháng sinh", "Tuýp", 65000, 80, 20,
             "Kháng sinh bôi ngoài điều trị mụn viêm."),
            ("Benzoyl Peroxide 5%", "Benzoyl Peroxide", "Trị mụn", "Tuýp", 55000, 120, 25,
             "Diệt khuẩn, giảm mụn đầu đen và đầu trắng."),
            ("Hydrocortisone 1%", "Hydrocortisone", "Corticosteroid", "Tuýp", 45000, 90, 20,
             "Chống viêm, giảm ngứa da nhẹ."),
            ("Cetirizine 10mg", "Cetirizine", "Kháng histamin", "Viên", 5000, 500, 100,
             "Điều trị dị ứng da, mề đay."),
            ("Doxycycline 100mg", "Doxycycline", "Kháng sinh", "Viên", 8000, 300, 60,
             "Kháng sinh uống điều trị mụn trứng cá nặng."),
            ("Miconazole Nitrate 2%", "Miconazole", "Kháng nấm", "Tuýp", 40000, 60, 15,
             "Điều trị nhiễm nấm da, hắc lào, lang ben."),
            ("Niacinamide Serum 10%", "Niacinamide", "Dưỡng da", "Lọ", 150000, 50, 10,
             "Giảm thâm, mờ nám và cải thiện tông màu da."),
            ("Azelaic Acid 20%", "Azelaic Acid", "Trị mụn & nám", "Tuýp", 120000, 40, 10,
             "Điều trị trứng cá đỏ, giảm thâm sau mụn."),
            ("Salicylic Acid 2%", "Salicylic Acid", "Keratolytic", "Gel", 75000, 100, 20,
             "Thông thoáng lỗ chân lông, giảm mụn cám."),
        ]
        for name, generic, category, unit, price, stock, reorder, desc in medicines_data:
            medicine = Medicine(
                name=name,
                generic_name=generic,
                category=category,
                unit=unit,
                price_per_unit=price,
                current_stock=stock,
                reorder_level=reorder,
                manufacturer="Dược phẩm Việt Nam",
                description=desc,
            )
            db.add(medicine)
            db.flush()
            db.add(
                MedicineBatch(
                    medicine_id=medicine.id,
                    batch_number=f"BATCH-{medicine.id:03d}-2026",
                    expiry_date="2027-12-31",
                    import_quantity=stock,
                    remaining_quantity=stock,
                    import_unit_cost=int(price * 0.7),
                    supplier_name="Công ty Dược phẩm ABC",
                )
            )

    db.commit()
