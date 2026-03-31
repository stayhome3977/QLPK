from datetime import date, datetime, timedelta
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from reportlab.pdfgen import canvas
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.security import get_password_hash
from app.models.entities import (
    Appointment,
    AppointmentService,
    AppointmentStatus,
    BookingSource,
    ClinicHoliday,
    Doctor,
    DoctorLeave,
    DoctorSchedule,
    GenderEnum,
    InventoryAction,
    InventoryLog,
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    MedicalRecord,
    Medicine,
    MedicineBatch,
    Notification,
    NotificationType,
    Patient,
    PatientSource,
    PaymentMethod,
    PaymentStatus,
    PaymentTransaction,
    Prescription,
    PrescriptionItem,
    PrescriptionItemAllocation,
    PrescriptionStatus,
    RoleEnum,
    Service,
    TransactionStatus,
    TransactionType,
    User,
    VisitType,
)
from app.schemas.api import (
    AppointmentCreate,
    AppointmentServicePayload,
    AppointmentView,
    ApproveCreditPayload,
    DoctorCreate,
    DoctorLeavePayload,
    DoctorSchedulePayload,
    FollowUpPayload,
    HolidayPayload,
    InvoiceGeneratePayload,
    InvoicePayPayload,
    LinkUserPayload,
    MedicalRecordCreate,
    MedicalRecordUpdate,
    MedicineBatchImport,
    MedicineCreate,
    NotificationView,
    PatientUpdate,
    PrescriptionCreate,
    QuickPatientCreate,
    RefundPayload,
    ReschedulePayload,
    ServiceCreate,
    WalkInCreate,
)
from app.seed import next_patient_code
from app.websocket.manager import manager

router = APIRouter(tags=["clinic"])


def utcnow() -> datetime:
    return datetime.utcnow()


def serialize_user(user: User | None) -> dict | None:
    if not user:
        return None
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role.value,
    }


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notif_type: NotificationType = NotificationType.system,
    action_url: str | None = None,
) -> None:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notif_type,
        action_url=action_url,
    )
    db.add(notification)
    db.flush()
    try:
        import anyio

        anyio.from_thread.run(manager.send_personal_message, user_id, {"title": title, "message": message})
    except Exception:  # noqa: BLE001
        pass


def get_patient_or_404(db: Session, patient_id: int) -> Patient:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


def get_doctor_or_404(db: Session, doctor_id: int) -> Doctor:
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


def get_service_or_404(db: Session, service_id: int) -> Service:
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


def get_appointment_or_404(db: Session, appointment_id: int) -> Appointment:
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


def get_invoice_or_404(db: Session, invoice_id: int) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


def serialize_patient(db: Session, patient: Patient) -> dict:
    user = db.query(User).filter(User.id == patient.user_id).first() if patient.user_id else None
    return {
        "id": patient.id,
        "patient_code": patient.patient_code,
        "created_source": patient.created_source.value,
        "full_name": user.full_name if user else None,
        "phone": user.phone if user else None,
        "date_of_birth": patient.date_of_birth,
        "gender": patient.gender.value if patient.gender else None,
        "address": patient.address,
        "insurance_number": patient.insurance_number,
        "allergy_notes": patient.allergy_notes,
        "occupation": patient.occupation,
        "user": serialize_user(user),
    }


def serialize_doctor(db: Session, doctor: Doctor) -> dict:
    user = db.query(User).filter(User.id == doctor.user_id).first()
    return {
        "id": doctor.id,
        "specialty": doctor.specialty,
        "license_number": doctor.license_number,
        "degree": doctor.degree,
        "experience_years": doctor.experience_years,
        "consultation_fee": float(doctor.consultation_fee),
        "bio": doctor.bio,
        "is_available": doctor.is_available,
        "user": serialize_user(user),
    }


def serialize_appointment(db: Session, appointment: Appointment) -> dict:
    patient = get_patient_or_404(db, appointment.patient_id)
    doctor = get_doctor_or_404(db, appointment.doctor_id)
    doctor_user = db.query(User).filter(User.id == doctor.user_id).first()
    patient_user = db.query(User).filter(User.id == patient.user_id).first() if patient.user_id else None
    return {
        "id": appointment.id,
        "patient_id": appointment.patient_id,
        "patient_name": patient_user.full_name if patient_user else f"BN {patient.patient_code}",
        "doctor_id": appointment.doctor_id,
        "doctor_name": doctor_user.full_name if doctor_user else None,
        "appointment_date": appointment.appointment_date,
        "appointment_time": appointment.appointment_time,
        "duration_minutes": appointment.duration_minutes,
        "status": appointment.status.value,
        "visit_type": appointment.visit_type.value,
        "booking_source": appointment.booking_source.value,
        "queue_number": appointment.queue_number,
        "chief_complaint": appointment.chief_complaint,
        "notes": appointment.notes,
        "created_at": appointment.created_at,
    }


def map_booking_source(value: str) -> BookingSource:
    return BookingSource(value) if value in BookingSource._value2member_map_ else BookingSource.patient_app


def map_gender(value: str | None):
    if not value:
        return None
    return GenderEnum(value) if value in GenderEnum._value2member_map_ else None


def get_available_slots_logic(db: Session, doctor_id: int, selected_date: date) -> list[str]:
    holiday = db.query(ClinicHoliday).filter(ClinicHoliday.holiday_date == selected_date, ClinicHoliday.is_active.is_(True)).first()
    leave = db.query(DoctorLeave).filter(DoctorLeave.doctor_id == doctor_id, DoctorLeave.leave_date == selected_date).first()
    if holiday or leave:
        return []

    weekday = (selected_date.weekday() + 1) % 7
    schedules = (
        db.query(DoctorSchedule)
        .filter(DoctorSchedule.doctor_id == doctor_id, DoctorSchedule.day_of_week == weekday, DoctorSchedule.is_active.is_(True))
        .all()
    )
    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == selected_date,
            Appointment.status.notin_([AppointmentStatus.cancelled, AppointmentStatus.no_show]),
        )
        .all()
    )
    counts: dict[str, int] = {}
    for item in appointments:
        key = item.appointment_time.strftime("%H:%M")
        counts[key] = counts.get(key, 0) + 1

    slots: list[str] = []
    for schedule in schedules:
        current = datetime.combine(selected_date, schedule.start_time)
        end_dt = datetime.combine(selected_date, schedule.end_time)
        while current < end_dt:
            key = current.strftime("%H:%M")
            if counts.get(key, 0) < schedule.max_patients:
                slots.append(key)
            current += timedelta(minutes=schedule.slot_duration)
    return slots


def recompute_medicine_stock(db: Session, medicine_id: int) -> None:
    total = (
        db.query(func.coalesce(func.sum(MedicineBatch.remaining_quantity - MedicineBatch.reserved_quantity), 0))
        .filter(MedicineBatch.medicine_id == medicine_id, MedicineBatch.is_active.is_(True))
        .scalar()
    )
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if medicine:
        medicine.current_stock = int(total or 0)


def generate_invoice_number(db: Session) -> str:
    year = datetime.utcnow().year
    total = db.query(Invoice).count() + 1
    return f"PKD-{year}-{total:04d}"


def invoice_items_payload(db: Session, invoice_id: int) -> list[dict]:
    items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).all()
    return [
        {
            "id": item.id,
            "item_type": item.item_type,
            "reference_id": item.reference_id,
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": float(item.unit_price),
            "line_total": float(item.line_total),
        }
        for item in items
    ]


def transactions_payload(db: Session, invoice_id: int) -> list[dict]:
    txs = db.query(PaymentTransaction).filter(PaymentTransaction.invoice_id == invoice_id).all()
    return [
        {
            "id": tx.id,
            "transaction_type": tx.transaction_type.value,
            "payment_method": tx.payment_method.value,
            "amount": float(tx.amount),
            "status": tx.status.value,
            "transaction_ref": tx.transaction_ref,
            "paid_at": tx.paid_at,
        }
        for tx in txs
    ]


def serialize_invoice(db: Session, invoice: Invoice) -> dict:
    return {
        "id": invoice.id,
        "appointment_id": invoice.appointment_id,
        "patient_id": invoice.patient_id,
        "invoice_number": invoice.invoice_number,
        "invoice_status": invoice.invoice_status.value,
        "payment_status": invoice.payment_status.value,
        "subtotal_amount": float(invoice.subtotal_amount),
        "discount_amount": float(invoice.discount_amount),
        "insurance_support_amount": float(invoice.insurance_support_amount),
        "total_amount": float(invoice.total_amount),
        "paid_amount": float(invoice.paid_amount),
        "notes": invoice.notes,
        "locked_at": invoice.locked_at,
        "items": invoice_items_payload(db, invoice.id),
        "transactions": transactions_payload(db, invoice.id),
    }


def ensure_invoice_editable(db: Session, appointment_id: int) -> None:
    invoice = db.query(Invoice).filter(Invoice.appointment_id == appointment_id).first()
    if invoice and invoice.invoice_status in {InvoiceStatus.issued, InvoiceStatus.paid, InvoiceStatus.partially_paid}:
        raise HTTPException(status_code=400, detail="Invoice is locked for this appointment")


def release_prescription_reservations(db: Session, prescription: Prescription) -> None:
    items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
    for item in items:
        allocations = db.query(PrescriptionItemAllocation).filter(PrescriptionItemAllocation.prescription_item_id == item.id).all()
        released_total = 0
        for allocation in allocations:
            batch = db.query(MedicineBatch).filter(MedicineBatch.id == allocation.batch_id).first()
            if batch:
                batch.reserved_quantity = max(0, batch.reserved_quantity - allocation.reserved_quantity)
                released_total += allocation.reserved_quantity
                recompute_medicine_stock(db, batch.medicine_id)
            db.delete(allocation)
        item.reserved_quantity = max(0, item.reserved_quantity - released_total)
    prescription.status = PrescriptionStatus.pending if all(item.dispensed_quantity == 0 for item in items) else PrescriptionStatus.partially_dispensed
    db.flush()


def prepare_prescription_logic(db: Session, prescription: Prescription, user_id: int) -> Prescription:
    items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
    release_prescription_reservations(db, prescription)

    any_reserved = False
    all_fully_reserved = True
    for item in items:
        needed = item.quantity
        allocated = 0
        batches = (
            db.query(MedicineBatch)
            .filter(
                MedicineBatch.medicine_id == item.medicine_id,
                MedicineBatch.is_active.is_(True),
                MedicineBatch.expiry_date >= date.today(),
            )
            .order_by(MedicineBatch.expiry_date.asc(), MedicineBatch.imported_at.asc())
            .all()
        )
        for batch in batches:
            available = batch.remaining_quantity - batch.reserved_quantity
            reserve_now = min(needed - allocated, max(0, available))
            if reserve_now <= 0:
                continue
            batch.reserved_quantity += reserve_now
            db.add(
                PrescriptionItemAllocation(
                    prescription_item_id=item.id,
                    batch_id=batch.id,
                    reserved_quantity=reserve_now,
                    dispensed_quantity=0,
                )
            )
            allocated += reserve_now
            any_reserved = True
            recompute_medicine_stock(db, batch.medicine_id)
            if allocated >= needed:
                break
        item.reserved_quantity = allocated
        if allocated < needed:
            all_fully_reserved = False

    prescription.prepared_by = user_id
    prescription.prepared_at = utcnow()
    if any_reserved and all_fully_reserved:
        prescription.status = PrescriptionStatus.awaiting_payment
    elif any_reserved:
        prescription.status = PrescriptionStatus.prepared
    else:
        prescription.status = PrescriptionStatus.pending
    db.flush()
    return prescription


@router.post("/api/v1/patients/quick-create")
def quick_create_patient(
    payload: QuickPatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "receptionist"])),
):
    user = User(
        email=f"walkin.{payload.phone}@qlpk.vn",
        password=get_password_hash("Temp@1234"),
        role=RoleEnum.patient,
        full_name=payload.full_name,
        phone=payload.phone,
        is_active=True,
        email_verified_at=utcnow(),
    )
    db.add(user)
    db.flush()
    patient = Patient(
        user_id=user.id,
        patient_code=next_patient_code(db),
        created_source=PatientSource.frontdesk,
        date_of_birth=payload.date_of_birth,
        gender=map_gender(payload.gender),
        address=payload.address,
    )
    db.add(patient)
    db.commit()
    return serialize_patient(db, patient)


@router.patch("/api/v1/patients/{patient_id}/link-user")
def link_patient_user(
    patient_id: int,
    payload: LinkUserPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "receptionist"])),
):
    patient = get_patient_or_404(db, patient_id)
    if patient.user_id:
        raise HTTPException(status_code=400, detail="Patient already linked to a user")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    user = User(
        email=payload.email,
        password=get_password_hash(payload.password),
        role=RoleEnum.patient,
        full_name=f"Patient {patient.patient_code}",
        is_active=True,
        email_verified_at=utcnow(),
    )
    db.add(user)
    db.flush()
    patient.user_id = user.id
    db.commit()
    return serialize_patient(db, patient)


@router.get("/api/v1/patients")
def list_patients(db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "receptionist"]))):
    return [serialize_patient(db, item) for item in db.query(Patient).order_by(Patient.id.desc()).all()]


@router.get("/api/v1/patients/{patient_id}")
def get_patient(patient_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return serialize_patient(db, get_patient_or_404(db, patient_id))


@router.put("/api/v1/patients/{patient_id}")
def update_patient(patient_id: int, payload: PatientUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    patient = get_patient_or_404(db, patient_id)
    user = db.query(User).filter(User.id == patient.user_id).first() if patient.user_id else None
    if payload.full_name and user:
        user.full_name = payload.full_name
    if payload.phone and user:
        user.phone = payload.phone
    if payload.date_of_birth:
        patient.date_of_birth = payload.date_of_birth
    if payload.gender:
        patient.gender = map_gender(payload.gender)
    if payload.address is not None:
        patient.address = payload.address
    if payload.insurance_number is not None:
        patient.insurance_number = payload.insurance_number
    if payload.allergy_notes is not None:
        patient.allergy_notes = payload.allergy_notes
    if payload.occupation is not None:
        patient.occupation = payload.occupation
    db.commit()
    return serialize_patient(db, patient)


@router.get("/api/v1/patients/{patient_id}/history")
def patient_history(patient_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    patient = get_patient_or_404(db, patient_id)
    appointments = db.query(Appointment).filter(Appointment.patient_id == patient.id).order_by(Appointment.appointment_date.desc()).all()
    records = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient.id).order_by(MedicalRecord.created_at.desc()).all()
    return {
        "patient": serialize_patient(db, patient),
        "appointments": [serialize_appointment(db, item) for item in appointments],
        "medical_records": [
            {
                "id": record.id,
                "appointment_id": record.appointment_id,
                "diagnosis": record.diagnosis,
                "icd10_code": record.icd10_code,
                "follow_up_date": record.follow_up_date,
                "created_at": record.created_at,
            }
            for record in records
        ],
    }


@router.post("/api/v1/doctors")
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    user = User(
        email=payload.email,
        password=get_password_hash(payload.password),
        role=RoleEnum.doctor,
        full_name=payload.full_name,
        phone=payload.phone,
        is_active=True,
        email_verified_at=utcnow(),
    )
    db.add(user)
    db.flush()
    doctor = Doctor(
        user_id=user.id,
        specialty=payload.specialty,
        license_number=payload.license_number,
        degree=payload.degree,
        experience_years=payload.experience_years,
        consultation_fee=payload.consultation_fee,
        bio=payload.bio,
    )
    db.add(doctor)
    db.commit()
    return serialize_doctor(db, doctor)


@router.get("/api/v1/doctors")
def list_doctors(db: Session = Depends(get_db)):
    return [serialize_doctor(db, doctor) for doctor in db.query(Doctor).order_by(Doctor.id.desc()).all()]


@router.get("/api/v1/doctors/{doctor_id}")
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    return serialize_doctor(db, get_doctor_or_404(db, doctor_id))


@router.get("/api/v1/doctors/{doctor_id}/schedule")
def get_doctor_schedule(doctor_id: int, db: Session = Depends(get_db)):
    get_doctor_or_404(db, doctor_id)
    schedules = db.query(DoctorSchedule).filter(DoctorSchedule.doctor_id == doctor_id).all()
    return [
        {
            "id": item.id,
            "day_of_week": item.day_of_week,
            "start_time": item.start_time,
            "end_time": item.end_time,
            "slot_duration": item.slot_duration,
            "max_patients": item.max_patients,
            "is_active": item.is_active,
        }
        for item in schedules
    ]


@router.post("/api/v1/doctors/{doctor_id}/schedule")
def create_doctor_schedule(
    doctor_id: int,
    payload: DoctorSchedulePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    get_doctor_or_404(db, doctor_id)
    schedule = DoctorSchedule(doctor_id=doctor_id, **payload.model_dump())
    db.add(schedule)
    db.commit()
    return {"message": "Lịch làm việc đã được cập nhật", "id": schedule.id}


@router.post("/api/v1/doctors/{doctor_id}/leave")
def create_doctor_leave(
    doctor_id: int,
    payload: DoctorLeavePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "receptionist"])),
):
    get_doctor_or_404(db, doctor_id)
    leave = DoctorLeave(doctor_id=doctor_id, leave_date=payload.leave_date, reason=payload.reason, created_by=current_user.id)
    db.add(leave)
    db.commit()
    return {"message": "Đã ghi nhận ngày nghỉ", "id": leave.id}


@router.delete("/api/v1/doctors/{doctor_id}/leave/{leave_date}")
def delete_doctor_leave(
    doctor_id: int,
    leave_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "receptionist"])),
):
    leave = db.query(DoctorLeave).filter(DoctorLeave.doctor_id == doctor_id, DoctorLeave.leave_date == leave_date).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    db.delete(leave)
    db.commit()
    return {"message": "Đã hủy ngày nghỉ"}


@router.get("/api/v1/holidays")
def list_holidays(db: Session = Depends(get_db)):
    return [
        {"id": item.id, "holiday_date": item.holiday_date, "name": item.name, "is_active": item.is_active}
        for item in db.query(ClinicHoliday).order_by(ClinicHoliday.holiday_date.asc()).all()
    ]


@router.post("/api/v1/holidays")
def create_holiday(
    payload: HolidayPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    holiday = ClinicHoliday(**payload.model_dump())
    db.add(holiday)
    db.commit()
    return {"message": "Đã thêm ngày nghỉ", "id": holiday.id}


@router.delete("/api/v1/holidays/{holiday_id}")
def delete_holiday(holiday_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    holiday = db.query(ClinicHoliday).filter(ClinicHoliday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    db.delete(holiday)
    db.commit()
    return {"message": "Đã xóa ngày nghỉ"}


@router.post("/api/v1/services")
def create_service(payload: ServiceCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    service = Service(**payload.model_dump())
    db.add(service)
    db.commit()
    return {"message": "Đã thêm dịch vụ", "id": service.id}


@router.get("/api/v1/services")
def list_services(db: Session = Depends(get_db)):
    return [
        {
            "id": item.id,
            "name": item.name,
            "category": item.category,
            "description": item.description,
            "price": float(item.price),
            "duration": item.duration,
        }
        for item in db.query(Service).filter(Service.is_active.is_(True)).order_by(Service.id.desc()).all()
    ]


@router.get("/api/v1/appointments/available-slots")
def get_available_slots(doctor_id: int = Query(...), date_value: date = Query(..., alias="date"), db: Session = Depends(get_db)):
    return {"doctor_id": doctor_id, "date": date_value, "slots": get_available_slots_logic(db, doctor_id, date_value)}


def build_appointment(
    db: Session,
    patient_id: int,
    payload: AppointmentCreate,
    current_user: User,
    visit_type: VisitType = VisitType.scheduled,
    booking_source: BookingSource | None = None,
) -> Appointment:
    get_patient_or_404(db, patient_id)
    doctor = get_doctor_or_404(db, payload.doctor_id)
    slots = get_available_slots_logic(db, doctor.id, payload.appointment_date)
    if payload.appointment_time.strftime("%H:%M") not in slots:
        raise HTTPException(status_code=400, detail="Selected slot is not available")

    overlapping = (
        db.query(Appointment)
        .filter(
            Appointment.patient_id == patient_id,
            Appointment.appointment_date == payload.appointment_date,
            Appointment.appointment_time == payload.appointment_time,
            Appointment.status.notin_([AppointmentStatus.cancelled, AppointmentStatus.no_show]),
        )
        .first()
    )
    if overlapping:
        raise HTTPException(status_code=400, detail="Patient already has an appointment at this time")

    appointment = Appointment(
        patient_id=patient_id,
        doctor_id=doctor.id,
        primary_service_id=payload.primary_service_id,
        visit_type=visit_type,
        booking_source=booking_source or map_booking_source(payload.booking_source),
        appointment_date=payload.appointment_date,
        appointment_time=payload.appointment_time,
        duration_minutes=payload.duration_minutes,
        chief_complaint=payload.chief_complaint,
        notes=payload.notes,
        status=AppointmentStatus.pending if visit_type != VisitType.walk_in else AppointmentStatus.checked_in,
        checked_in_at=utcnow() if visit_type == VisitType.walk_in else None,
        queue_number=(
            (db.query(func.coalesce(func.max(Appointment.queue_number), 0)).filter(Appointment.appointment_date == payload.appointment_date).scalar() or 0) + 1
            if visit_type == VisitType.walk_in
            else None
        ),
    )
    db.add(appointment)
    db.flush()

    if payload.primary_service_id:
        service = get_service_or_404(db, payload.primary_service_id)
        db.add(
            AppointmentService(
                appointment_id=appointment.id,
                service_id=service.id,
                quantity=1,
                unit_price=service.price,
                added_by=current_user.id,
            )
        )
    return appointment


@router.get("/api/v1/appointments", response_model=list[AppointmentView])
def list_appointments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Appointment)
    if current_user.role == RoleEnum.doctor:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        query = query.filter(Appointment.doctor_id == getattr(doctor, "id", 0))
    elif current_user.role == RoleEnum.patient:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        query = query.filter(Appointment.patient_id == getattr(patient, "id", 0))
    return [serialize_appointment(db, item) for item in query.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc()).all()]


@router.post("/api/v1/appointments", response_model=AppointmentView)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    patient_id = payload.patient_id
    if current_user.role == RoleEnum.patient:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient profile not found")
        patient_id = patient.id
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")
    appointment = build_appointment(db, patient_id, payload, current_user)
    db.commit()
    return serialize_appointment(db, appointment)


@router.post("/api/v1/appointments/walk-in", response_model=AppointmentView)
def create_walk_in(payload: WalkInCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "receptionist"]))):
    patient_id = payload.patient_id
    if not patient_id:
        if not payload.patient_name or not payload.patient_phone:
            raise HTTPException(status_code=400, detail="patient_name and patient_phone are required for walk-in")
        user = User(
            email=f"walkin.{payload.patient_phone}.{int(datetime.utcnow().timestamp())}@qlpk.vn",
            password=get_password_hash("Temp@1234"),
            role=RoleEnum.patient,
            full_name=payload.patient_name,
            phone=payload.patient_phone,
            is_active=True,
            email_verified_at=utcnow(),
        )
        db.add(user)
        db.flush()
        patient = Patient(user_id=user.id, patient_code=next_patient_code(db), created_source=PatientSource.frontdesk)
        db.add(patient)
        db.flush()
        patient_id = patient.id
    appointment_data = AppointmentCreate(
        patient_id=patient_id,
        doctor_id=payload.doctor_id,
        primary_service_id=payload.primary_service_id,
        appointment_date=payload.appointment_date,
        appointment_time=payload.appointment_time,
        chief_complaint=payload.chief_complaint,
        booking_source="frontdesk",
    )
    appointment = build_appointment(db, patient_id, appointment_data, current_user, visit_type=VisitType.walk_in, booking_source=BookingSource.frontdesk)
    db.commit()
    return serialize_appointment(db, appointment)


@router.get("/api/v1/appointments/{appointment_id}")
def get_appointment(appointment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return serialize_appointment(db, get_appointment_or_404(db, appointment_id))


def change_appointment_status(db: Session, appointment_id: int, status_value: AppointmentStatus, extra: dict | None = None) -> dict:
    appointment = get_appointment_or_404(db, appointment_id)
    for key, value in (extra or {}).items():
        setattr(appointment, key, value)
    appointment.status = status_value
    db.commit()
    return serialize_appointment(db, appointment)


@router.patch("/api/v1/appointments/{appointment_id}/confirm")
def confirm_appointment(appointment_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "receptionist"]))):
    return change_appointment_status(db, appointment_id, AppointmentStatus.confirmed, {"confirmed_at": utcnow()})


@router.patch("/api/v1/appointments/{appointment_id}/check-in")
def check_in_appointment(appointment_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "receptionist"]))):
    appointment = get_appointment_or_404(db, appointment_id)
    queue_no = (db.query(func.coalesce(func.max(Appointment.queue_number), 0)).filter(Appointment.appointment_date == appointment.appointment_date).scalar() or 0) + 1
    return change_appointment_status(db, appointment_id, AppointmentStatus.checked_in, {"checked_in_at": utcnow(), "queue_number": queue_no})


@router.patch("/api/v1/appointments/{appointment_id}/start")
def start_appointment(appointment_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["doctor", "admin"]))):
    return change_appointment_status(db, appointment_id, AppointmentStatus.in_progress, {"started_at": utcnow()})


@router.patch("/api/v1/appointments/{appointment_id}/complete")
def complete_appointment(appointment_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["doctor", "admin"]))):
    return change_appointment_status(db, appointment_id, AppointmentStatus.completed, {"completed_at": utcnow()})


@router.patch("/api/v1/appointments/{appointment_id}/reschedule")
def reschedule_appointment(
    appointment_id: int,
    payload: ReschedulePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appointment = get_appointment_or_404(db, appointment_id)
    if appointment.status not in {AppointmentStatus.pending, AppointmentStatus.confirmed}:
        raise HTTPException(status_code=400, detail="Appointment cannot be rescheduled")
    new_payload = AppointmentCreate(
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        primary_service_id=appointment.primary_service_id,
        appointment_date=payload.appointment_date,
        appointment_time=payload.appointment_time,
        duration_minutes=appointment.duration_minutes,
        chief_complaint=appointment.chief_complaint,
        notes=payload.reason or appointment.notes,
        booking_source=appointment.booking_source.value,
    )
    new_appointment = build_appointment(db, appointment.patient_id, new_payload, current_user, appointment.visit_type, appointment.booking_source)
    new_appointment.rescheduled_from_id = appointment.id
    appointment.status = AppointmentStatus.cancelled
    appointment.cancel_reason = payload.reason or "rescheduled"
    appointment.cancelled_by = current_user.id
    appointment.cancelled_at = utcnow()
    db.commit()
    return serialize_appointment(db, new_appointment)


@router.patch("/api/v1/appointments/{appointment_id}/no-show")
def mark_no_show(appointment_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "receptionist"]))):
    appointment = get_appointment_or_404(db, appointment_id)
    if appointment.status != AppointmentStatus.confirmed:
        raise HTTPException(status_code=400, detail="Only confirmed appointments can be marked no-show")
    appointment.status = AppointmentStatus.no_show
    appointment.no_show_marked_at = utcnow()
    db.commit()
    return serialize_appointment(db, appointment)


@router.post("/api/v1/appointments/{appointment_id}/follow-up")
def create_follow_up_appointment(
    appointment_id: int,
    payload: FollowUpPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["doctor", "admin", "receptionist"])),
):
    source = get_appointment_or_404(db, appointment_id)
    new_payload = AppointmentCreate(
        patient_id=source.patient_id,
        doctor_id=payload.doctor_id or source.doctor_id,
        primary_service_id=source.primary_service_id,
        appointment_date=payload.appointment_date,
        appointment_time=payload.appointment_time,
        duration_minutes=source.duration_minutes,
        chief_complaint=source.chief_complaint,
        notes=payload.notes,
        booking_source="frontdesk",
    )
    follow_up = build_appointment(db, source.patient_id, new_payload, current_user, VisitType.follow_up, BookingSource.frontdesk)
    follow_up.follow_up_from_appointment_id = source.id
    db.commit()
    return serialize_appointment(db, follow_up)


@router.delete("/api/v1/appointments/{appointment_id}")
def cancel_appointment(appointment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    appointment = get_appointment_or_404(db, appointment_id)
    appointment.status = AppointmentStatus.cancelled
    appointment.cancelled_by = current_user.id
    appointment.cancelled_at = utcnow()
    appointment.cancel_reason = "cancelled by user"
    db.commit()
    return {"message": "Đã hủy lịch hẹn"}


@router.post("/api/v1/appointments/{appointment_id}/services")
def add_appointment_service(
    appointment_id: int,
    payload: AppointmentServicePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["doctor", "receptionist", "admin"])),
):
    ensure_invoice_editable(db, appointment_id)
    service = get_service_or_404(db, payload.service_id)
    item = AppointmentService(
        appointment_id=appointment_id,
        service_id=service.id,
        quantity=payload.quantity,
        unit_price=service.price,
        added_by=current_user.id,
        notes=payload.notes,
    )
    db.add(item)
    db.commit()
    return {"message": "Đã thêm dịch vụ", "id": item.id}


@router.delete("/api/v1/appointments/{appointment_id}/services/{service_row_id}")
def delete_appointment_service(
    appointment_id: int,
    service_row_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["doctor", "receptionist", "admin"])),
):
    ensure_invoice_editable(db, appointment_id)
    item = db.query(AppointmentService).filter(AppointmentService.id == service_row_id, AppointmentService.appointment_id == appointment_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Appointment service not found")
    db.delete(item)
    db.commit()
    return {"message": "Đã xóa dịch vụ"}


@router.post("/api/v1/medical-records")
def create_medical_record(payload: MedicalRecordCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["doctor", "admin"]))):
    record = MedicalRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    return {"id": record.id, "message": "Đã tạo hồ sơ bệnh án"}


@router.get("/api/v1/medical-records/{record_id}")
def get_medical_record(record_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    return {
        "id": record.id,
        "appointment_id": record.appointment_id,
        "patient_id": record.patient_id,
        "doctor_id": record.doctor_id,
        "symptoms": record.symptoms,
        "clinical_findings": record.clinical_findings,
        "diagnosis": record.diagnosis,
        "icd10_code": record.icd10_code,
        "treatment_plan": record.treatment_plan,
        "follow_up_date": record.follow_up_date,
        "follow_up_notes": record.follow_up_notes,
        "doctor_notes": record.doctor_notes,
    }


@router.put("/api/v1/medical-records/{record_id}")
def update_medical_record(record_id: int, payload: MedicalRecordUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["doctor", "admin"]))):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    db.commit()
    return {"message": "Đã cập nhật hồ sơ bệnh án"}


@router.post("/api/v1/prescriptions")
def create_prescription(payload: PrescriptionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["doctor", "admin"]))):
    prescription = Prescription(
        medical_record_id=payload.medical_record_id,
        doctor_id=payload.doctor_id,
        patient_id=payload.patient_id,
        notes=payload.notes,
    )
    db.add(prescription)
    db.flush()
    for item in payload.items:
        db.add(PrescriptionItem(prescription_id=prescription.id, **item.model_dump()))
    db.commit()
    return {"id": prescription.id, "message": "Đã tạo đơn thuốc"}


@router.get("/api/v1/prescriptions")
def list_prescriptions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(Prescription).order_by(Prescription.created_at.desc()).all()
    return [
        {
            "id": item.id,
            "medical_record_id": item.medical_record_id,
            "patient_id": item.patient_id,
            "doctor_id": item.doctor_id,
            "status": item.status.value,
            "prepared_at": item.prepared_at,
            "dispensed_at": item.dispensed_at,
        }
        for item in items
    ]


@router.get("/api/v1/prescriptions/{prescription_id}")
def get_prescription(prescription_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
    return {
        "id": prescription.id,
        "medical_record_id": prescription.medical_record_id,
        "patient_id": prescription.patient_id,
        "doctor_id": prescription.doctor_id,
        "status": prescription.status.value,
        "prepared_at": prescription.prepared_at,
        "dispensed_at": prescription.dispensed_at,
        "items": [
            {
                "id": item.id,
                "medicine_id": item.medicine_id,
                "quantity": item.quantity,
                "reserved_quantity": item.reserved_quantity,
                "dispensed_quantity": item.dispensed_quantity,
                "dosage": item.dosage,
                "frequency": item.frequency,
                "duration_days": item.duration_days,
                "instruction": item.instruction,
                "unit_price": float(item.unit_price),
            }
            for item in items
        ],
    }


@router.patch("/api/v1/prescriptions/{prescription_id}/prepare")
def prepare_prescription(prescription_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["pharmacist", "admin"]))):
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    prepare_prescription_logic(db, prescription, current_user.id)
    db.commit()
    return {"message": "Đã chuẩn bị thuốc", "status": prescription.status.value}


@router.patch("/api/v1/prescriptions/{prescription_id}/release")
def release_prescription(prescription_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["pharmacist", "admin"]))):
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    release_prescription_reservations(db, prescription)
    db.commit()
    return {"message": "Đã giải phóng thuốc giữ kho", "status": prescription.status.value}


@router.patch("/api/v1/prescriptions/{prescription_id}/dispense")
def dispense_prescription(prescription_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["pharmacist", "admin"]))):
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    invoice = (
        db.query(Invoice)
        .join(Appointment, Invoice.appointment_id == Appointment.id)
        .join(MedicalRecord, MedicalRecord.appointment_id == Appointment.id)
        .filter(MedicalRecord.id == prescription.medical_record_id)
        .first()
    )
    if not invoice or invoice.payment_status not in {PaymentStatus.paid, PaymentStatus.credit_approved}:
        raise HTTPException(status_code=400, detail="Invoice has not been settled or approved")
    items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
    for item in items:
        allocations = db.query(PrescriptionItemAllocation).filter(PrescriptionItemAllocation.prescription_item_id == item.id).all()
        dispensed = 0
        for allocation in allocations:
            batch = db.query(MedicineBatch).filter(MedicineBatch.id == allocation.batch_id).first()
            if not batch:
                continue
            before = batch.remaining_quantity
            qty = allocation.reserved_quantity
            batch.reserved_quantity = max(0, batch.reserved_quantity - qty)
            batch.remaining_quantity = max(0, batch.remaining_quantity - qty)
            allocation.dispensed_quantity = qty
            dispensed += qty
            recompute_medicine_stock(db, batch.medicine_id)
            db.add(
                InventoryLog(
                    medicine_id=batch.medicine_id,
                    batch_id=batch.id,
                    user_id=current_user.id,
                    action=InventoryAction.export,
                    quantity_change=-qty,
                    quantity_before=before,
                    quantity_after=batch.remaining_quantity,
                    reference_id=prescription.id,
                    reference_type="prescription",
                    notes="Dispensed to patient",
                )
            )
        item.dispensed_quantity = dispensed
    prescription.dispensed_by = current_user.id
    prescription.dispensed_at = utcnow()
    prescription.picked_up_at = utcnow()
    prescription.status = PrescriptionStatus.dispensed if all(item.dispensed_quantity >= item.quantity for item in items) else PrescriptionStatus.partially_dispensed
    db.commit()
    return {"message": "Đã cấp phát thuốc", "status": prescription.status.value}


@router.get("/api/v1/medicines")
def list_medicines(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [
        {
            "id": item.id,
            "name": item.name,
            "generic_name": item.generic_name,
            "category": item.category,
            "unit": item.unit,
            "price_per_unit": float(item.price_per_unit),
            "current_stock": item.current_stock,
            "reorder_level": item.reorder_level,
            "manufacturer": item.manufacturer,
            "storage_conditions": item.storage_conditions,
            "description": item.description,
            "is_active": item.is_active,
        }
        for item in db.query(Medicine).order_by(Medicine.id.desc()).all()
    ]


@router.post("/api/v1/medicines")
def create_medicine(payload: MedicineCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "pharmacist"]))):
    medicine = Medicine(**payload.model_dump())
    db.add(medicine)
    db.commit()
    return {"message": "Đã thêm thuốc mới", "id": medicine.id}


@router.put("/api/v1/medicines/{medicine_id}")
def update_medicine(medicine_id: int, payload: MedicineCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "pharmacist"]))):
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    for key, value in payload.model_dump().items():
        setattr(medicine, key, value)
    db.commit()
    return {"message": "Đã cập nhật thuốc"}


@router.post("/api/v1/medicines/{medicine_id}/batches/import")
def import_batch(
    medicine_id: int,
    payload: MedicineBatchImport,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pharmacist"])),
):
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    batch = MedicineBatch(medicine_id=medicine_id, remaining_quantity=payload.import_quantity, **payload.model_dump())
    db.add(batch)
    db.flush()
    before = medicine.current_stock
    medicine.current_stock += payload.import_quantity
    db.add(
        InventoryLog(
            medicine_id=medicine_id,
            batch_id=batch.id,
            user_id=current_user.id,
            action=InventoryAction.import_,
            quantity_change=payload.import_quantity,
            quantity_before=before,
            quantity_after=medicine.current_stock,
            reference_id=batch.id,
            reference_type="batch_import",
        )
    )
    db.commit()
    return {"message": "Đã nhập kho theo lô", "id": batch.id}


@router.get("/api/v1/medicines/low-stock")
def low_stock_medicines(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(Medicine).filter(Medicine.current_stock < Medicine.reorder_level).all()
    return [{"id": item.id, "name": item.name, "current_stock": item.current_stock, "reorder_level": item.reorder_level} for item in items]


def sync_invoice_payment_status(invoice: Invoice, db: Session) -> None:
    success_paid = (
        db.query(func.coalesce(func.sum(PaymentTransaction.amount), 0))
        .filter(
            PaymentTransaction.invoice_id == invoice.id,
            PaymentTransaction.status == TransactionStatus.success,
            PaymentTransaction.transaction_type == TransactionType.payment,
        )
        .scalar()
        or 0
    )
    refunds = (
        db.query(func.coalesce(func.sum(PaymentTransaction.amount), 0))
        .filter(
            PaymentTransaction.invoice_id == invoice.id,
            PaymentTransaction.status == TransactionStatus.success,
            PaymentTransaction.transaction_type == TransactionType.refund,
        )
        .scalar()
        or 0
    )
    net_paid = float(success_paid) - float(refunds)
    invoice.paid_amount = max(0, net_paid)
    if invoice.payment_status == PaymentStatus.credit_approved:
        invoice.invoice_status = InvoiceStatus.issued
        return
    if invoice.paid_amount <= 0:
        invoice.payment_status = PaymentStatus.unpaid
        invoice.invoice_status = InvoiceStatus.issued if invoice.locked_at else InvoiceStatus.draft
    elif invoice.paid_amount < float(invoice.total_amount):
        invoice.payment_status = PaymentStatus.partial
        invoice.invoice_status = InvoiceStatus.partially_paid
    else:
        invoice.payment_status = PaymentStatus.paid
        invoice.invoice_status = InvoiceStatus.paid
        invoice.paid_at = utcnow()


@router.post("/api/v1/invoices/generate/{appointment_id}")
def generate_invoice(
    appointment_id: int,
    payload: InvoiceGeneratePayload | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["cashier", "admin"])),
):
    payload = payload or InvoiceGeneratePayload()
    appointment = get_appointment_or_404(db, appointment_id)
    doctor = get_doctor_or_404(db, appointment.doctor_id)
    invoice = db.query(Invoice).filter(Invoice.appointment_id == appointment_id).first()
    if not invoice:
        invoice = Invoice(
            appointment_id=appointment_id,
            patient_id=appointment.patient_id,
            cashier_id=current_user.id,
            invoice_number=generate_invoice_number(db),
            invoice_status=InvoiceStatus.draft,
        )
        db.add(invoice)
        db.flush()

    db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).delete()
    subtotal = 0.0

    exam_total = float(doctor.consultation_fee)
    subtotal += exam_total
    db.add(InvoiceItem(invoice_id=invoice.id, item_type="exam", description="Phí khám", quantity=1, unit_price=exam_total, line_total=exam_total))

    services = db.query(AppointmentService).filter(AppointmentService.appointment_id == appointment_id).all()
    for item in services:
        line_total = float(item.unit_price) * item.quantity
        subtotal += line_total
        service = db.query(Service).filter(Service.id == item.service_id).first()
        db.add(
            InvoiceItem(
                invoice_id=invoice.id,
                item_type="service",
                reference_id=item.service_id,
                description=service.name if service else f"Service {item.service_id}",
                quantity=item.quantity,
                unit_price=float(item.unit_price),
                line_total=line_total,
            )
        )

    record = db.query(MedicalRecord).filter(MedicalRecord.appointment_id == appointment_id).first()
    if record:
        prescription = db.query(Prescription).filter(Prescription.medical_record_id == record.id).first()
        if prescription:
            items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
            for item in items:
                billed_qty = item.reserved_quantity or item.quantity
                line_total = float(item.unit_price) * billed_qty
                subtotal += line_total
                medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
                db.add(
                    InvoiceItem(
                        invoice_id=invoice.id,
                        item_type="medicine",
                        reference_id=item.id,
                        description=medicine.name if medicine else f"Medicine {item.medicine_id}",
                        quantity=billed_qty,
                        unit_price=float(item.unit_price),
                        line_total=line_total,
                    )
                )

    invoice.subtotal_amount = subtotal
    invoice.discount_amount = payload.discount_amount
    invoice.discount_reason = payload.discount_reason
    invoice.insurance_support_amount = payload.insurance_support_amount
    invoice.total_amount = max(0, subtotal - payload.discount_amount - payload.insurance_support_amount)
    invoice.notes = payload.notes
    db.commit()
    return serialize_invoice(db, invoice)


@router.get("/api/v1/invoices")
def list_invoices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(Invoice).order_by(Invoice.created_at.desc()).all()
    return [serialize_invoice(db, item) for item in items]


@router.get("/api/v1/invoices/{invoice_id}")
def get_invoice(invoice_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return serialize_invoice(db, get_invoice_or_404(db, invoice_id))


@router.patch("/api/v1/invoices/{invoice_id}/pay")
def pay_invoice(
    invoice_id: int,
    payload: InvoicePayPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["cashier", "admin"])),
):
    invoice = get_invoice_or_404(db, invoice_id)
    method = PaymentMethod(payload.payment_method)
    tx_status = TransactionStatus.pending if method == PaymentMethod.transfer else TransactionStatus.success
    tx = PaymentTransaction(
        invoice_id=invoice.id,
        transaction_type=TransactionType.payment,
        payment_method=method,
        amount=payload.amount,
        transaction_ref=payload.transaction_ref,
        status=tx_status,
        created_by=current_user.id,
        paid_at=utcnow() if tx_status == TransactionStatus.success else None,
    )
    db.add(tx)
    invoice.locked_at = invoice.locked_at or utcnow()
    invoice.invoice_status = InvoiceStatus.issued
    if tx_status == TransactionStatus.pending:
        invoice.payment_status = PaymentStatus.awaiting_confirmation
    else:
        sync_invoice_payment_status(invoice, db)
    db.commit()
    return serialize_invoice(db, invoice)


@router.patch("/api/v1/invoices/{invoice_id}/confirm-transfer")
def confirm_transfer(invoice_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["cashier", "admin"]))):
    invoice = get_invoice_or_404(db, invoice_id)
    tx = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.invoice_id == invoice.id, PaymentTransaction.status == TransactionStatus.pending)
        .order_by(PaymentTransaction.created_at.desc())
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Pending transfer not found")
    tx.status = TransactionStatus.success
    tx.paid_at = utcnow()
    sync_invoice_payment_status(invoice, db)
    db.commit()
    return serialize_invoice(db, invoice)


@router.patch("/api/v1/invoices/{invoice_id}/approve-credit")
def approve_credit(
    invoice_id: int,
    payload: ApproveCreditPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "cashier"])),
):
    invoice = get_invoice_or_404(db, invoice_id)
    invoice.locked_at = invoice.locked_at or utcnow()
    invoice.invoice_status = InvoiceStatus.issued
    invoice.payment_status = PaymentStatus.credit_approved
    invoice.credit_approved_by = current_user.id
    invoice.credit_approved_at = utcnow()
    invoice.notes = payload.notes or invoice.notes
    db.commit()
    return serialize_invoice(db, invoice)


@router.post("/api/v1/invoices/{invoice_id}/refund")
def refund_invoice(
    invoice_id: int,
    payload: RefundPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["cashier", "admin"])),
):
    invoice = get_invoice_or_404(db, invoice_id)
    db.add(
        PaymentTransaction(
            invoice_id=invoice.id,
            transaction_type=TransactionType.refund,
            payment_method=PaymentMethod.other,
            amount=payload.amount,
            transaction_ref=payload.reason,
            status=TransactionStatus.success,
            created_by=current_user.id,
            approved_by=current_user.id,
            paid_at=utcnow(),
        )
    )
    record = db.query(MedicalRecord).filter(MedicalRecord.appointment_id == invoice.appointment_id).first()
    if record:
        prescription = db.query(Prescription).filter(Prescription.medical_record_id == record.id).first()
        if prescription and prescription.status in {PrescriptionStatus.pending, PrescriptionStatus.prepared, PrescriptionStatus.awaiting_payment}:
            release_prescription_reservations(db, prescription)
    sync_invoice_payment_status(invoice, db)
    if invoice.paid_amount == 0:
        invoice.payment_status = PaymentStatus.refunded
        invoice.invoice_status = InvoiceStatus.refunded
    db.commit()
    return serialize_invoice(db, invoice)


@router.get("/api/v1/invoices/{invoice_id}/pdf")
def invoice_pdf(invoice_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice = get_invoice_or_404(db, invoice_id)
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.setTitle(invoice.invoice_number)
    pdf.drawString(50, 800, f"Invoice: {invoice.invoice_number}")
    pdf.drawString(50, 780, f"Status: {invoice.invoice_status.value}")
    pdf.drawString(50, 760, f"Total: {float(invoice.total_amount):,.0f} VND")
    y = 730
    for item in invoice_items_payload(db, invoice.id):
        pdf.drawString(50, y, f"- {item['description']} x{item['quantity']} = {item['line_total']:,.0f}")
        y -= 18
    pdf.save()
    buffer.seek(0)
    return Response(buffer.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f"inline; filename={invoice.invoice_number}.pdf"})


@router.get("/api/v1/notifications", response_model=list[NotificationView])
def list_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()


@router.patch("/api/v1/notifications/{notification_id}/read")
def read_notification(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notification = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    return {"message": "Đã đánh dấu đã đọc"}


@router.patch("/api/v1/notifications/read-all")
def read_all_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read.is_(False)).update({"is_read": True})
    db.commit()
    return {"message": "Đã đánh dấu tất cả là đã đọc"}
