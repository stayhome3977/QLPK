from datetime import date, datetime, timedelta
from io import BytesIO
from pathlib import Path

import qrcode
from PIL import Image as PILImage
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, Image
from sqlalchemy import case, func, or_, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.security import get_password_hash
from app.models.entities import (
    Appointment,
    AppointmentStatus,
    BookingSource,
    ClinicHoliday,
    Doctor,
    DoctorLeave,
    DoctorProfile,
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
    PharmacyRequest,
    PharmacyRequestStatus,
    Prescription,
    PrescriptionItem,
    PrescriptionItemAllocation,
    PrescriptionStatus,
    RoleEnum,
    Service,
    Supplier,
    TransactionStatus,
    TransactionType,
    User,
    VisitType,
)
from app.schemas.api import (
    AdminAccountCreate,
    AppointmentCreate,
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
    PrescriptionCheckoutPayload,
    QuickPatientCreate,
    DoctorProfilePayload,
    RefundPayload,
    ReschedulePayload,
    RescheduleProposalPayload,
    ServiceCreate,
    SupplierCreate,
    WalkInCreate,
)
from app.seed import next_patient_code
from app.websocket.manager import manager

router = APIRouter(tags=["clinic"])

PDF_FONT_NAME = "Helvetica"
PDF_FONT_BOLD_NAME = "Helvetica-Bold"
PDF_FONTS_READY = False


def utcnow() -> datetime:
    return datetime.utcnow()


def ensure_pdf_fonts() -> tuple[str, str]:
    global PDF_FONTS_READY, PDF_FONT_NAME, PDF_FONT_BOLD_NAME

    if PDF_FONTS_READY:
        return PDF_FONT_NAME, PDF_FONT_BOLD_NAME

    regular_path = Path("C:/Windows/Fonts/arial.ttf")
    bold_path = Path("C:/Windows/Fonts/arialbd.ttf")

    try:
        if regular_path.exists() and bold_path.exists():
            pdfmetrics.registerFont(TTFont("ArialVN", str(regular_path)))
            pdfmetrics.registerFont(TTFont("ArialVN-Bold", str(bold_path)))
            PDF_FONT_NAME = "ArialVN"
            PDF_FONT_BOLD_NAME = "ArialVN-Bold"
    except Exception:
        PDF_FONT_NAME = "Helvetica"
        PDF_FONT_BOLD_NAME = "Helvetica-Bold"

    PDF_FONTS_READY = True
    return PDF_FONT_NAME, PDF_FONT_BOLD_NAME


def serialize_user(user: User | None) -> dict | None:
    if not user:
        return None
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role.value,
        "is_active": user.is_active,
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


def get_pharmacy_request_or_404(db: Session, request_id: int) -> PharmacyRequest:
    request = db.query(PharmacyRequest).filter(PharmacyRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Pharmacy request not found")
    return request


def get_invoice_by_appointment(db: Session, appointment_id: int) -> Invoice | None:
    return db.query(Invoice).filter(Invoice.appointment_id == appointment_id).first()


def get_medical_record_by_appointment(db: Session, appointment_id: int) -> MedicalRecord | None:
    return db.query(MedicalRecord).filter(MedicalRecord.appointment_id == appointment_id).first()


def get_prescription_by_appointment(db: Session, appointment_id: int) -> Prescription | None:
    medical_record = get_medical_record_by_appointment(db, appointment_id)
    if not medical_record:
        return None
    return db.query(Prescription).filter(Prescription.medical_record_id == medical_record.id).first()


# ============================================================
# DEPRECATED - AppointmentService functionality removed
# ============================================================

# def serialize_appointment_services(db: Session, appointment_id: int) -> list[dict]:
#     appointment_services = (
#         db.query(AppointmentService)
#         .filter(AppointmentService.appointment_id == appointment_id)
#         .order_by(AppointmentService.id.asc())
#         .all()
#     )
#     services_list = []
#     for apt_srv in appointment_services:
#         svc = db.query(Service).filter(Service.id == apt_srv.service_id).first()
#         if svc:
#             services_list.append(
#                 {
#                     "id": apt_srv.id,
#                     "service_id": svc.id,
#                     "name": svc.name,
#                     "quantity": apt_srv.quantity,
#                     "unit_price": float(apt_srv.unit_price),
#                     "line_total": float(apt_srv.unit_price) * apt_srv.quantity,
#                     "notes": apt_srv.notes,
#                 }
#             )
#     return services_list


def serialize_appointment_services(db: Session, appointment_id: int) -> list[dict]:
    """Return services for an appointment. Since AppointmentService was deprecated, 
    this returns the primary service if available, or empty list."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment or not appointment.primary_service_id:
        return []
    
    service = db.query(Service).filter(Service.id == appointment.primary_service_id).first()
    if not service:
        return []
    
    return [{
        "id": service.id,
        "service_id": service.id,
        "name": service.name,
        "quantity": 1,
        "unit_price": float(service.price or 0),
        "line_total": float(service.price or 0),
        "notes": None,
    }]


def serialize_prescription_items(db: Session, prescription_id: int) -> list[dict]:
    items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription_id).all()
    payload: list[dict] = []
    for item in items:
        medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
        billed_quantity = item.dispensed_quantity or item.reserved_quantity or item.quantity
        payload.append(
            {
                "id": item.id,
                "medicine_id": item.medicine_id,
                "medicine_name": medicine.name if medicine else f"Thuốc #{item.medicine_id}",
                "quantity": item.quantity,
                "reserved_quantity": item.reserved_quantity,
                "dispensed_quantity": item.dispensed_quantity,
                "billed_quantity": billed_quantity,
                "dosage": item.dosage,
                "frequency": item.frequency,
                "duration_days": item.duration_days,
                "instruction": item.instruction,
                "unit_price": float(item.unit_price),
                "line_total": float(item.unit_price) * billed_quantity,
            }
        )
    return payload


def upsert_pharmacy_request(
    db: Session,
    appointment_id: int,
    requested_by: int | None = None,
    notes: str | None = None,
) -> PharmacyRequest:
    appointment = get_appointment_or_404(db, appointment_id)
    medical_record = get_medical_record_by_appointment(db, appointment_id)
    prescription = get_prescription_by_appointment(db, appointment_id)
    request = db.query(PharmacyRequest).filter(PharmacyRequest.appointment_id == appointment_id).first()
    if not request:
        request = PharmacyRequest(
            appointment_id=appointment.id,
            patient_id=appointment.patient_id,
            doctor_id=appointment.doctor_id,
            requested_by=requested_by,
        )
        db.add(request)
        db.flush()

    request.patient_id = appointment.patient_id
    request.doctor_id = appointment.doctor_id
    request.medical_record_id = medical_record.id if medical_record else None
    request.prescription_id = prescription.id if prescription else None
    if requested_by is not None:
        request.requested_by = requested_by
    if notes is not None:
        request.notes = notes
    sync_pharmacy_request_status(db, request)
    db.flush()
    return request


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
        "emergency_contact_name": patient.emergency_contact_name,
        "emergency_contact_phone": patient.emergency_contact_phone,
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


def serialize_medical_record(record: MedicalRecord | None) -> dict | None:
    if not record:
        return None
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
        "created_at": record.created_at,
        "updated_at": record.updated_at,
    }


def serialize_prescription(db: Session, prescription: Prescription | None) -> dict | None:
    if not prescription:
        return None
    return {
        "id": prescription.id,
        "medical_record_id": prescription.medical_record_id,
        "patient_id": prescription.patient_id,
        "doctor_id": prescription.doctor_id,
        "status": prescription.status.value,
        "prepared_at": prescription.prepared_at,
        "dispensed_at": prescription.dispensed_at,
        "items": serialize_prescription_items(db, prescription.id),
    }


def serialize_appointment(db: Session, appointment: Appointment) -> dict:
    patient = get_patient_or_404(db, appointment.patient_id)
    doctor = get_doctor_or_404(db, appointment.doctor_id)
    doctor_user = db.query(User).filter(User.id == doctor.user_id).first()
    patient_user = db.query(User).filter(User.id == patient.user_id).first() if patient.user_id else None
    medical_record = db.query(MedicalRecord).filter(MedicalRecord.appointment_id == appointment.id).first()
    prescription = None
    if medical_record:
        prescription = db.query(Prescription).filter(Prescription.medical_record_id == medical_record.id).first()
    
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
        "proposal": (
            {
                "proposed_date": appointment.proposed_date,
                "proposed_time": appointment.proposed_time,
                "note": appointment.notes,
                "discount_percent": float(appointment.discount_percent or 0),
                "discount_note": appointment.discount_note,
            }
            if appointment.proposed_date and appointment.proposed_time
            else None
        ),
        "services": serialize_appointment_services(db, appointment.id),
        "medical_record": serialize_medical_record(medical_record),
        "prescription": serialize_prescription(db, prescription),
        "created_at": appointment.created_at,
    }


def map_booking_source(value: str) -> BookingSource:
    return BookingSource(value) if value in BookingSource._value2member_map_ else BookingSource.patient_app


def map_gender(value: str | None):
    if not value:
        return None
    return GenderEnum(value) if value in GenderEnum._value2member_map_ else None


def ensure_clinic_holiday_table(db: Session) -> None:
    """
    Keep holidays endpoints resilient when DB was initialized from a partial SQL script.
    """
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS ngay_nghi_phong_kham (
                ma_ngay_nghi_phong INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                ngay_nghi DATE NOT NULL UNIQUE,
                ten_ngay_nghi VARCHAR(100) NOT NULL,
                dang_ap_dung TINYINT(1) NOT NULL DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
        )
    )
    db.commit()


def get_available_slots_logic(db: Session, doctor_id: int, selected_date: date) -> list[dict]:
    ensure_clinic_holiday_table(db)
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

    # Use DoctorLeave table to check for busy time slots (can be used for temporary unavailability)
    leave_rows = (
        db.query(DoctorLeave)
        .filter(DoctorLeave.doctor_id == doctor_id, DoctorLeave.leave_date == selected_date)
        .all()
    )
    
    # If there's any leave record for this date, doctor is unavailable for the whole day
    if leave_rows:
        # Return empty slots list since doctor is on leave all day
        return []

    now_dt = datetime.now()
    slots: list[dict] = []
    for schedule in schedules:
        current = datetime.combine(selected_date, schedule.start_time)
        end_dt = datetime.combine(selected_date, schedule.end_time)
        while current < end_dt:
            key = current.strftime("%H:%M")
            slot_end = current + timedelta(minutes=schedule.slot_duration)
            if selected_date == now_dt.date() and slot_end <= now_dt:
                current += timedelta(minutes=schedule.slot_duration)
                continue
            status_name = "available"
            label = "Còn trống"
            # Note: DoctorLeave handles full-day unavailability, so no need to check time slots
            if status_name == "available" and counts.get(key, 0) >= schedule.max_patients:
                status_name = "booked"
                label = "Đã đặt"
            slots.append(
                {
                    "time": key,
                    "end_time": slot_end.strftime("%H:%M"),
                    "status": status_name,
                    "label": label,
                    "available": status_name == "available",
                }
            )
            current += timedelta(minutes=schedule.slot_duration)
    return slots


def recompute_medicine_stock(db: Session, medicine_id: int) -> None:
    total = (
        db.query(func.coalesce(func.sum(MedicineBatch.remaining_quantity), 0))
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


INVOICE_ITEM_TYPE_EXAM = "phi_kham"
INVOICE_ITEM_TYPE_SERVICE = "dich_vu"
INVOICE_ITEM_TYPE_MEDICINE = "thuoc"


def invoice_items_payload(db: Session, invoice_id: int) -> list[dict]:
    items = (
        db.query(InvoiceItem)
        .filter(InvoiceItem.invoice_id == invoice_id)
        .order_by(InvoiceItem.id.asc())
        .all()
    )
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
    txs = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.invoice_id == invoice_id)
        .order_by(PaymentTransaction.created_at.asc(), PaymentTransaction.id.asc())
        .all()
    )
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


def _patient_display_name(db: Session, patient_id: int) -> str:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return f"BN #{patient_id}"
    patient_user = db.query(User).filter(User.id == patient.user_id).first() if patient.user_id else None
    return patient_user.full_name if patient_user else (f"BN {patient.patient_code}" if patient.patient_code else f"BN #{patient_id}")


def _serialize_datetime(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _format_vnd(value: float | int | None) -> str:
    return f"{float(value or 0):,.0f}".replace(",", ".") + " đ"


def _format_pdf_datetime(value: datetime | str | None) -> str:
    if not value:
        return "—"
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    return str(value)


def _invoice_context(db: Session, invoice: Invoice) -> dict:
    patient = db.query(Patient).filter(Patient.id == invoice.patient_id).first()
    patient_user = db.query(User).filter(User.id == patient.user_id).first() if patient and patient.user_id else None
    appointment = db.query(Appointment).filter(Appointment.id == invoice.appointment_id).first()
    cashier = db.query(User).filter(User.id == invoice.cashier_id).first() if invoice.cashier_id else None
    doctor = db.query(Doctor).filter(Doctor.id == appointment.doctor_id).first() if appointment else None
    doctor_user = db.query(User).filter(User.id == doctor.user_id).first() if doctor else None
    return {
        "patient_name": patient_user.full_name if patient_user else _patient_display_name(db, invoice.patient_id),
        "patient_code": patient.patient_code if patient else None,
        "patient_phone": patient_user.phone if patient_user else None,
        "patient_address": patient.address if patient else None,
        "appointment_date": appointment.appointment_date.isoformat() if appointment and appointment.appointment_date else None,
        "appointment_time": str(appointment.appointment_time) if appointment and appointment.appointment_time else None,
        "doctor_name": doctor_user.full_name if doctor_user else None,
        "cashier_name": cashier.full_name if cashier else None,
    }


def serialize_invoice(db: Session, invoice: Invoice) -> dict:
    context = _invoice_context(db, invoice)
    return {
        "id": invoice.id,
        "appointment_id": invoice.appointment_id,
        "patient_id": invoice.patient_id,
        "patient_name": context["patient_name"],
        "patient_code": context["patient_code"],
        "patient_phone": context["patient_phone"],
        "patient_address": context["patient_address"],
        "appointment_date": context["appointment_date"],
        "appointment_time": context["appointment_time"],
        "doctor_name": context["doctor_name"],
        "cashier_name": context["cashier_name"],
        "invoice_number": invoice.invoice_number,
        "invoice_status": invoice.invoice_status.value,
        "payment_status": invoice.payment_status.value,
        "subtotal_amount": float(invoice.subtotal_amount),
        "discount_amount": float(invoice.discount_amount),
        "insurance_support_amount": float(invoice.insurance_support_amount),
        "total_amount": float(invoice.total_amount),
        "paid_amount": float(invoice.paid_amount),
        "notes": invoice.notes,
        "items": invoice_items_payload(db, invoice.id),
        "transactions": transactions_payload(db, invoice.id),
        "created_at": _serialize_datetime(invoice.created_at),
        "paid_at": _serialize_datetime(invoice.paid_at),
    }


def sync_pharmacy_request_status(db: Session, request: PharmacyRequest) -> None:
    invoice = get_invoice_by_appointment(db, request.appointment_id)
    appointment = db.query(Appointment).filter(Appointment.id == request.appointment_id).first()
    if appointment and appointment.status == AppointmentStatus.cancelled:
        request.status = PharmacyRequestStatus.cancelled
        return
    if invoice and invoice.payment_status in {PaymentStatus.paid, PaymentStatus.credit_approved}:
        request.status = PharmacyRequestStatus.paid
        return
    if invoice:
        request.status = PharmacyRequestStatus.invoiced
        return
    request.status = PharmacyRequestStatus.pending


def serialize_pharmacy_request(db: Session, request: PharmacyRequest) -> dict:
    appointment = get_appointment_or_404(db, request.appointment_id)
    patient = get_patient_or_404(db, request.patient_id)
    doctor = get_doctor_or_404(db, request.doctor_id)
    patient_user = db.query(User).filter(User.id == patient.user_id).first() if patient.user_id else None
    doctor_user = db.query(User).filter(User.id == doctor.user_id).first()
    invoice = get_invoice_by_appointment(db, request.appointment_id)
    services = serialize_appointment_services(db, request.appointment_id)
    prescription = get_prescription_by_appointment(db, request.appointment_id)
    medicines = serialize_prescription_items(db, prescription.id) if prescription else []
    exam_fee = float(doctor.consultation_fee or 0)
    services_total = sum(float(item["line_total"]) for item in services)
    medicines_total = sum(float(item["line_total"]) for item in medicines)
    total_amount = exam_fee + services_total + medicines_total
    return {
        "id": request.id,
        "request_number": f"PGDS-{request.id:04d}",
        "appointment_id": request.appointment_id,
        "medical_record_id": request.medical_record_id,
        "prescription_id": request.prescription_id,
        "patient_id": request.patient_id,
        "patient_name": patient_user.full_name if patient_user else f"BN {patient.patient_code}",
        "patient_code": patient.patient_code,
        "patient_phone": patient_user.phone if patient_user else None,
        "doctor_id": request.doctor_id,
        "doctor_name": doctor_user.full_name if doctor_user else None,
        "appointment_date": appointment.appointment_date,
        "appointment_time": appointment.appointment_time,
        "status": request.status.value,
        "notes": request.notes,
        "exam_fee": exam_fee,
        "services": services,
        "services_total": services_total,
        "medicines": medicines,
        "medicines_total": medicines_total,
        "total_amount": total_amount,
        "invoice_id": invoice.id if invoice else None,
        "invoice_number": invoice.invoice_number if invoice else None,
        "invoice_payment_status": invoice.payment_status.value if invoice else None,
        "created_at": _serialize_datetime(request.created_at),
        "updated_at": _serialize_datetime(request.updated_at),
    }


def serialize_doctor_paid_invoice_summary(db: Session, invoice: Invoice) -> dict:
    patient = db.query(Patient).filter(Patient.id == invoice.patient_id).first()
    patient_user = db.query(User).filter(User.id == patient.user_id).first() if patient and patient.user_id else None
    patient_name = patient_user.full_name if patient_user else (f"BN {patient.patient_code}" if patient else "—")
    appointment = db.query(Appointment).filter(Appointment.id == invoice.appointment_id).first()
    cashier = db.query(User).filter(User.id == invoice.cashier_id).first() if invoice.cashier_id else None
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "appointment_id": invoice.appointment_id,
        "patient_id": invoice.patient_id,
        "patient_name": patient_name,
        "patient_code": patient.patient_code if patient else None,
        "patient_phone": patient_user.phone if patient_user else None,
        "appointment_date": appointment.appointment_date.isoformat() if appointment and appointment.appointment_date else None,
        "appointment_time": str(appointment.appointment_time) if appointment and appointment.appointment_time else None,
        "total_amount": float(invoice.total_amount),
        "paid_amount": float(invoice.paid_amount),
        "payment_status": invoice.payment_status.value,
        "paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
        "pharmacist_name": cashier.full_name if cashier else None,
        "notes": invoice.notes,
    }


def _gender_from_payload(value: str | None) -> GenderEnum | None:
    if not value:
        return None
    try:
        return GenderEnum(value)
    except ValueError:
        return None


def serialize_doctor_profile(profile: DoctorProfile) -> dict:
    return {
        "id": profile.id,
        "doctor_id": profile.doctor_id,
        "ho_ten": profile.full_name,
        "ngay_sinh": profile.birth_date.isoformat() if profile.birth_date else None,
        "gioi_tinh": profile.gender.value if profile.gender else None,
        "dia_chi": profile.address,
        "so_cccd": profile.citizen_id,
        "so_dien_thoai": profile.phone,
        "email_lien_he": profile.contact_email,
        "ngay_vao_lam": profile.start_work_date.isoformat() if profile.start_work_date else None,
        "ngay_het_han_hop_dong": profile.contract_end_date.isoformat() if profile.contract_end_date else None,
        "nguoi_ky_hop_dong": profile.contract_signatory,
        "ngay_het_han_chung_chi": profile.license_expiry_date.isoformat() if profile.license_expiry_date else None,
        "vi_tri_cong_tac": profile.position,
        "ghi_chu": profile.notes,
    }


def _apply_doctor_profile_payload(profile: DoctorProfile, payload: DoctorProfilePayload) -> None:
    profile.full_name = payload.ho_ten
    profile.birth_date = payload.ngay_sinh
    profile.gender = _gender_from_payload(payload.gioi_tinh)
    profile.address = payload.dia_chi
    profile.citizen_id = payload.so_cccd
    profile.phone = payload.so_dien_thoai
    profile.contact_email = payload.email_lien_he
    profile.start_work_date = payload.ngay_vao_lam
    profile.contract_end_date = payload.ngay_het_han_hop_dong
    profile.contract_signatory = payload.nguoi_ky_hop_dong
    profile.license_expiry_date = payload.ngay_het_han_chung_chi
    profile.position = payload.vi_tri_cong_tac
    profile.notes = payload.ghi_chu


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


def apply_medical_record_payload(record: MedicalRecord, payload: MedicalRecordCreate | MedicalRecordUpdate) -> MedicalRecord:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    return record


def ensure_prescription_mutable(db: Session, prescription: Prescription) -> None:
    medical_record = db.query(MedicalRecord).filter(MedicalRecord.id == prescription.medical_record_id).first()
    if not medical_record:
        raise HTTPException(status_code=404, detail="Medical record not found")

    ensure_invoice_editable(db, medical_record.appointment_id)

    items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
    if prescription.status in {PrescriptionStatus.partially_dispensed, PrescriptionStatus.dispensed} or any(item.dispensed_quantity > 0 for item in items):
        raise HTTPException(status_code=400, detail="Đơn thuốc đã được cấp phát, không thể chỉnh sửa.")


def _normalize_prescription_item(
    medicine_id: int,
    quantity: int,
    dosage: str | None,
    frequency: str | None,
    duration_days: int | None,
    instruction: str | None,
    unit_price: float | int,
) -> tuple:
    return (
        int(medicine_id),
        int(quantity),
        (dosage or "").strip(),
        (frequency or "").strip(),
        duration_days if duration_days is not None else None,
        (instruction or "").strip(),
        round(float(unit_price or 0), 2),
    )


def prescription_matches_payload(db: Session, prescription: Prescription, payload: PrescriptionCreate) -> bool:
    if prescription.doctor_id != payload.doctor_id or prescription.patient_id != payload.patient_id:
        return False
    if (prescription.notes or "").strip() != (payload.notes or "").strip():
        return False

    current_items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
    current_normalized = sorted(
        _normalize_prescription_item(
            item.medicine_id,
            item.quantity,
            item.dosage,
            item.frequency,
            item.duration_days,
            item.instruction,
            item.unit_price,
        )
        for item in current_items
    )
    payload_normalized = sorted(
        _normalize_prescription_item(
            item.medicine_id,
            item.quantity,
            item.dosage,
            item.frequency,
            item.duration_days,
            item.instruction,
            item.unit_price,
        )
        for item in payload.items
    )
    return current_normalized == payload_normalized


def replace_prescription_items(db: Session, prescription: Prescription, payload: PrescriptionCreate) -> Prescription:
    ensure_prescription_mutable(db, prescription)

    if prescription.status in {PrescriptionStatus.prepared, PrescriptionStatus.awaiting_payment, PrescriptionStatus.cancelled}:
        release_prescription_reservations(db, prescription)

    db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).delete()
    prescription.doctor_id = payload.doctor_id
    prescription.patient_id = payload.patient_id
    prescription.notes = payload.notes
    prescription.status = PrescriptionStatus.pending
    prescription.prepared_by = None
    prescription.prepared_at = None
    prescription.dispensed_by = None
    prescription.dispensed_at = None
    prescription.picked_up_at = None
    db.flush()

    for item in payload.items:
        db.add(PrescriptionItem(prescription_id=prescription.id, **item.model_dump()))

    return prescription


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
    current_user: User = Depends(require_role(["admin"])),
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
    current_user: User = Depends(require_role(["admin"])),
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
def list_patients(db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "doctor"]))):
    return [serialize_patient(db, item) for item in db.query(Patient).order_by(Patient.id.desc()).all()]


@router.get("/api/v1/patients/me")
def get_my_patient_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["patient"])),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return serialize_patient(db, patient)


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
    if payload.emergency_contact_name is not None:
        patient.emergency_contact_name = payload.emergency_contact_name
    if payload.emergency_contact_phone is not None:
        patient.emergency_contact_phone = payload.emergency_contact_phone
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


@router.get("/api/v1/doctors/me/paid-invoices")
def list_doctor_pharmacist_paid_invoices(
    q: str | None = Query(None, description="Tìm theo tên BN, SĐT, mã BN, số hóa đơn"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["doctor"])),
):
    """Phiếu/hóa đơn đã thanh toán đủ qua tài khoản dược sĩ (lịch hẹn của bác sĩ hiện tại)."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    cashier_user = aliased(User)
    query = (
        db.query(Invoice)
        .join(Appointment, Invoice.appointment_id == Appointment.id)
        .join(cashier_user, Invoice.cashier_id == cashier_user.id)
        .filter(Appointment.doctor_id == doctor.id)
        .filter(Invoice.payment_status.in_([PaymentStatus.paid, PaymentStatus.credit_approved]))
        .filter(cashier_user.role == RoleEnum.pharmacist)
    )

    if q and q.strip():
        term = f"%{q.strip()}%"
        patient_user = aliased(User)
        query = (
            query.join(Patient, Invoice.patient_id == Patient.id)
            .outerjoin(patient_user, Patient.user_id == patient_user.id)
            .filter(
                or_(
                    Patient.patient_code.ilike(term),
                    Invoice.invoice_number.ilike(term),
                    patient_user.full_name.ilike(term),
                    patient_user.phone.ilike(term),
                )
            )
        )

    # MySQL does not support NULLS LAST; put NULL paid_at last explicitly.
    rows = query.order_by(
        case((Invoice.paid_at.is_(None), 1), else_=0),
        Invoice.paid_at.desc(),
        Invoice.id.desc(),
    ).all()
    return [serialize_doctor_paid_invoice_summary(db, inv) for inv in rows]


@router.post("/api/v1/admin/doctors/{doctor_id}/schedule")
@router.post("/api/v1/doctors/{doctor_id}/schedule")
def create_doctor_schedule(
    doctor_id: int,
    payload: DoctorSchedulePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    get_doctor_or_404(db, doctor_id)
    schedule = DoctorSchedule(doctor_id=doctor_id, managed_by=current_user.id, **payload.model_dump())
    db.add(schedule)
    db.commit()
    return {"message": "Lịch làm việc đã được cập nhật", "id": schedule.id}


@router.put("/api/v1/admin/doctors/{doctor_id}/schedule/{schedule_id}")
@router.put("/api/v1/doctors/{doctor_id}/schedule/{schedule_id}")
def update_doctor_schedule(
    doctor_id: int,
    schedule_id: int,
    payload: DoctorSchedulePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    get_doctor_or_404(db, doctor_id)
    schedule = db.query(DoctorSchedule).filter(DoctorSchedule.id == schedule_id, DoctorSchedule.doctor_id == doctor_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    for key, value in payload.model_dump().items():
        setattr(schedule, key, value)
    db.commit()
    return {"message": "Đã cập nhật lịch làm việc"}


@router.delete("/api/v1/admin/doctors/{doctor_id}/schedule/{schedule_id}")
@router.delete("/api/v1/doctors/{doctor_id}/schedule/{schedule_id}")
def delete_doctor_schedule(
    doctor_id: int,
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    schedule = db.query(DoctorSchedule).filter(DoctorSchedule.id == schedule_id, DoctorSchedule.doctor_id == doctor_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(schedule)
    db.commit()
    return {"message": "Đã xóa lịch làm việc"}


@router.get("/api/v1/admin/doctors/{doctor_id}/leaves")
@router.get("/api/v1/doctors/{doctor_id}/leaves")
def get_doctor_leaves(doctor_id: int, db: Session = Depends(get_db)):
    get_doctor_or_404(db, doctor_id)
    leaves = db.query(DoctorLeave).filter(DoctorLeave.doctor_id == doctor_id).order_by(DoctorLeave.leave_date.desc()).all()
    return [
        {
            "id": leaf.id,
            "leave_date": leaf.leave_date,
            "reason": leaf.reason,
        }
        for leaf in leaves
    ]


@router.post("/api/v1/admin/doctors/{doctor_id}/leave")
@router.post("/api/v1/doctors/{doctor_id}/leave")
def create_doctor_leave(
    doctor_id: int,
    payload: DoctorLeavePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    get_doctor_or_404(db, doctor_id)
    leave = DoctorLeave(doctor_id=doctor_id, leave_date=payload.leave_date, reason=payload.reason, created_by=current_user.id)
    db.add(leave)
    db.commit()
    return {"message": "Đã ghi nhận ngày nghỉ", "id": leave.id}


@router.put("/api/v1/admin/doctors/{doctor_id}/leave/{leave_id}")
@router.put("/api/v1/doctors/{doctor_id}/leave/{leave_id}")
def update_doctor_leave(
    doctor_id: int,
    leave_id: int,
    payload: DoctorLeavePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    get_doctor_or_404(db, doctor_id)
    leave = db.query(DoctorLeave).filter(DoctorLeave.id == leave_id, DoctorLeave.doctor_id == doctor_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    leave.leave_date = payload.leave_date
    leave.reason = payload.reason
    db.commit()
    return {"message": "Đã cập nhật ngày nghỉ"}


@router.delete("/api/v1/admin/doctors/{doctor_id}/leave/{leave_date}")
@router.delete("/api/v1/doctors/{doctor_id}/leave/{leave_date}")
def delete_doctor_leave(
    doctor_id: int,
    leave_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    leave = db.query(DoctorLeave).filter(DoctorLeave.doctor_id == doctor_id, DoctorLeave.leave_date == leave_date).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    db.delete(leave)
    db.commit()
    return {"message": "Đã hủy ngày nghỉ"}


@router.get("/api/v1/holidays")
def list_holidays(db: Session = Depends(get_db)):
    ensure_clinic_holiday_table(db)
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
    ensure_clinic_holiday_table(db)
    holiday = ClinicHoliday(**payload.model_dump())
    db.add(holiday)
    db.commit()
    return {"message": "Đã thêm ngày nghỉ", "id": holiday.id}


@router.put("/api/v1/holidays/{holiday_id}")
def update_holiday(
    holiday_id: int,
    payload: HolidayPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    ensure_clinic_holiday_table(db)
    holiday = db.query(ClinicHoliday).filter(ClinicHoliday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    holiday.holiday_date = payload.holiday_date
    holiday.name = payload.name
    holiday.is_active = payload.is_active
    db.commit()
    return {"message": "Đã cập nhật ngày nghỉ"}


@router.delete("/api/v1/holidays/{holiday_id}")
def delete_holiday(holiday_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    ensure_clinic_holiday_table(db)
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
    slots = get_available_slots_logic(db, doctor_id, date_value)
    return {
        "doctor_id": doctor_id,
        "date": date_value,
        "slots": slots,
        "summary": {
            "available": len([item for item in slots if item["status"] == "available"]),
            "booked": len([item for item in slots if item["status"] == "booked"]),
            "busy": len([item for item in slots if item["status"] == "busy"]),
        },
    }


@router.get("/api/v1/appointments/calendar-availability")
def get_calendar_availability(
    doctor_id: int = Query(...), 
    year: int = Query(...), 
    month: int = Query(...), 
    db: Session = Depends(get_db)
):
    """
    Lấy lịch làm việc của bác sĩ trong một tháng cụ thể
    """
    from calendar import monthrange
    
    # Get number of days in the month
    days_in_month = monthrange(year, month)[1]
    availability = []
    
    for day in range(1, days_in_month + 1):
        current_date = date(year, month, day)
        slots = get_available_slots_logic(db, doctor_id, current_date)
        
        if not slots:
            # No schedule for this day
            availability.append({
                "day": day,
                "color": "grey",
                "available_slots": 0,
                "total_slots": 0,
                "clickable": False,
                "status": "unavailable"
            })
        else:
            total_slots = len(slots)
            available_slots = len([slot for slot in slots if slot["status"] == "available"])
            
            # Determine color and status based on availability
            if available_slots == 0:
                color = "red"
                status = "full"
                clickable = False
            elif available_slots <= total_slots * 0.2:  # Less than 20% available
                color = "yellow"
                status = "almost-full"
                clickable = True
            else:
                color = "green"
                status = "available"
                clickable = True
            
            availability.append({
                "day": day,
                "color": color,
                "available_slots": available_slots,
                "total_slots": total_slots,
                "clickable": clickable,
                "status": status
            })
    
    # Calculate summary
    available_days = len([item for item in availability if item["color"] == "green"])
    almost_full_days = len([item for item in availability if item["color"] == "yellow"])
    full_days = len([item for item in availability if item["color"] == "red"])
    unavailable_days = len([item for item in availability if item["color"] == "grey"])
    
    return {
        "doctor_id": doctor_id,
        "year": year,
        "month": month,
        "availability": availability,
        "summary": {
            "available_days": available_days,
            "almost_full_days": almost_full_days,
            "full_days": full_days,
            "unavailable_days": unavailable_days,
            "total_days": days_in_month
        }
    }


def resolve_appointment_service_ids(payload: AppointmentCreate) -> list[int]:
    service_ids: list[int] = []
    if payload.primary_service_id:
        service_ids.append(int(payload.primary_service_id))
    for service_id in payload.service_ids:
        service_id = int(service_id)
        if service_id not in service_ids:
            service_ids.append(service_id)
    return service_ids


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
    service_ids = resolve_appointment_service_ids(payload)
    slots = get_available_slots_logic(db, doctor.id, payload.appointment_date)
    available_slot_keys = [item["time"] for item in slots if item["available"]]
    if payload.appointment_time.strftime("%H:%M") not in available_slot_keys:
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

    # AppointmentCreate no longer contains booking_source; default to patient_app
    # for public patient bookings unless an explicit source is passed in.
    appointment = Appointment(
        patient_id=patient_id,
        doctor_id=doctor.id,
        primary_service_id=payload.primary_service_id or (service_ids[0] if service_ids else None),
        visit_type=visit_type,
        booking_source=booking_source or BookingSource.patient_app,
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

    # DEPRECATED: AppointmentService functionality removed
    # for service_id in service_ids:
    #     service = get_service_or_404(db, service_id)
    #     db.add(
    #         AppointmentService(
    #             appointment_id=appointment.id,
    #             service_id=service.id,
    #             quantity=1,
    #             unit_price=service.price,
    #             added_by=current_user.id,
    #         )
    #     )
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
def create_walk_in(payload: WalkInCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
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


@router.get("/api/v1/appointments/completed-no-invoice")
def completed_appointments_no_invoice(db: Session = Depends(get_db), current_user: User = Depends(require_role(["pharmacist", "admin"]))):
    """Danh sách lịch khám đã hoàn thành và chưa có hóa đơn đầy đủ (để tạo HĐ thủ công)"""
    completed = db.query(Appointment).filter(Appointment.status == AppointmentStatus.completed).all()
    result = []
    for appt in completed:
        patient = db.query(User).filter(User.id == appt.patient_id).first()
        doctor = db.query(Doctor).filter(Doctor.id == appt.doctor_id).first()
        doctor_user = db.query(User).filter(User.id == doctor.user_id).first() if doctor else None
        result.append({
            "id": appt.id,
            "appointment_date": str(appt.appointment_date),
            "appointment_time": str(appt.appointment_time),
            "patient_name": patient.full_name if patient else "",
            "doctor_name": doctor_user.full_name if doctor_user else "",
        })
    return result


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


@router.patch("/api/v1/appointments/{appointment_id}/approve")
@router.patch("/api/v1/appointments/{appointment_id}/confirm")
def confirm_appointment(appointment_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["doctor", "admin"]))):
    return change_appointment_status(db, appointment_id, AppointmentStatus.confirmed, {"confirmed_at": utcnow()})


@router.patch("/api/v1/appointments/{appointment_id}/check-in")
def check_in_appointment(appointment_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["doctor", "admin"]))):
    appointment = get_appointment_or_404(db, appointment_id)
    queue_no = (db.query(func.coalesce(func.max(Appointment.queue_number), 0)).filter(Appointment.appointment_date == appointment.appointment_date).scalar() or 0) + 1
    return change_appointment_status(db, appointment_id, AppointmentStatus.checked_in, {"checked_in_at": utcnow(), "queue_number": queue_no})


@router.patch("/api/v1/appointments/{appointment_id}/start")
def start_appointment(appointment_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["doctor", "admin"]))):
    return change_appointment_status(db, appointment_id, AppointmentStatus.in_progress, {"started_at": utcnow()})


@router.patch("/api/v1/appointments/{appointment_id}/complete")
def complete_appointment(appointment_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["doctor", "admin"]))):
    change_appointment_status(db, appointment_id, AppointmentStatus.completed, {"completed_at": utcnow()})
    upsert_pharmacy_request(db, appointment_id, requested_by=current_user.id)
    db.commit()
    return serialize_appointment(db, get_appointment_or_404(db, appointment_id))


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

    # Handle patient accepting doctor's proposal
    proposed_time_str = None
    if appointment.proposed_time is not None:
        try:
            proposed_time_str = appointment.proposed_time.strftime("%H:%M")
        except AttributeError:
            secs = int(appointment.proposed_time.total_seconds())
            proposed_time_str = f"{secs // 3600:02d}:{(secs % 3600) // 60:02d}"

    if (
        appointment.proposed_date
        and appointment.proposed_date == payload.appointment_date
        and proposed_time_str
        and proposed_time_str == payload.appointment_time.strftime("%H:%M")
    ):
        # Doctor explicitly proposed and approved this time, skip strict available slots logic
        appointment.appointment_date = payload.appointment_date
        appointment.appointment_time = payload.appointment_time
        appointment.status = AppointmentStatus.confirmed
        appointment.proposed_date = None
        appointment.proposed_time = None
        if payload.reason:
            appointment.notes = f"{appointment.notes or ''}\n[BN chốt: {payload.reason}]".strip()
        db.commit()
        return serialize_appointment(db, appointment)

    appointment.status = AppointmentStatus.cancelled
    appointment.cancel_reason = payload.reason or "rescheduled"
    appointment.cancelled_by = current_user.id
    appointment.cancelled_at = utcnow()
    db.flush()

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
    # Copy discount mapping from old appointment to retain the discount proposed
    new_appointment.discount_percent = appointment.discount_percent
    new_appointment.discount_note = appointment.discount_note
    db.commit()
    return serialize_appointment(db, new_appointment)


@router.patch("/api/v1/appointments/{appointment_id}/no-show")
def mark_no_show(appointment_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "doctor"]))):
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
    current_user: User = Depends(require_role(["doctor", "admin"])),
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
    
    # Delete related pharmacy requests first
    request = db.query(PharmacyRequest).filter(PharmacyRequest.appointment_id == appointment_id).first()
    if request:
        db.delete(request)
    
    # Delete the appointment completely
    db.delete(appointment)
    db.commit()
    return {"message": "Đã xóa lịch hẹn"}


# ============================================================
# DEPRECATED - AppointmentService functionality removed
# ============================================================

# @router.post("/api/v1/appointments/{appointment_id}/services")
# def add_appointment_service(
#     appointment_id: int,
#     payload: AppointmentServicePayload,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_role(["doctor", "admin"])),
# ):
#     ensure_invoice_editable(db, appointment_id)
#     service = get_service_or_404(db, payload.service_id)
#     item = AppointmentService(
#         appointment_id=appointment_id,
#         service_id=service.id,
#         quantity=payload.quantity,
#         unit_price=service.price,
#         added_by=current_user.id,
#         notes=payload.notes,
#     )
#     db.add(item)
#     upsert_pharmacy_request(db, appointment_id, requested_by=current_user.id)
#     db.commit()
#     return {"message": "Đã thêm dịch vụ", "id": item.id}


# @router.delete("/api/v1/appointments/{appointment_id}/services/{service_row_id}")
# def delete_appointment_service(
#     appointment_id: int,
#     service_row_id: int,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_role(["doctor", "admin"])),
# ):
#     ensure_invoice_editable(db, appointment_id)
#     item = db.query(AppointmentService).filter(AppointmentService.id == service_row_id, AppointmentService.appointment_id == appointment_id).first()
#     if not item:
#         raise HTTPException(status_code=404, detail="Appointment service not found")
#     db.delete(item)
#     upsert_pharmacy_request(db, appointment_id, requested_by=current_user.id)
#     db.commit()
#     return {"message": "Đã xóa dịch vụ"}


@router.post("/api/v1/medical-records")
def create_medical_record(payload: MedicalRecordCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["doctor", "admin"]))):
    get_appointment_or_404(db, payload.appointment_id)

    record = db.query(MedicalRecord).filter(MedicalRecord.appointment_id == payload.appointment_id).first()
    if record:
        apply_medical_record_payload(record, payload)
        upsert_pharmacy_request(db, payload.appointment_id, requested_by=current_user.id)
        db.commit()
        return {"id": record.id, "message": "Đã cập nhật hồ sơ bệnh án"}

    record = MedicalRecord(**payload.model_dump())
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        record = db.query(MedicalRecord).filter(MedicalRecord.appointment_id == payload.appointment_id).first()
        if not record:
            raise
        apply_medical_record_payload(record, payload)
        upsert_pharmacy_request(db, payload.appointment_id, requested_by=current_user.id)
        db.commit()
        return {"id": record.id, "message": "Đã cập nhật hồ sơ bệnh án"}

    upsert_pharmacy_request(db, payload.appointment_id, requested_by=current_user.id)
    db.commit()
    return {"id": record.id, "message": "Đã tạo hồ sơ bệnh án"}


@router.get("/api/v1/medical-records/{record_id}")
def get_medical_record(record_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    return serialize_medical_record(record)


@router.put("/api/v1/medical-records/{record_id}")
def update_medical_record(record_id: int, payload: MedicalRecordUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["doctor", "admin"]))):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    apply_medical_record_payload(record, payload)
    upsert_pharmacy_request(db, record.appointment_id, requested_by=current_user.id)
    db.commit()
    return {"message": "Đã cập nhật hồ sơ bệnh án"}


@router.post("/api/v1/prescriptions")
def create_prescription(payload: PrescriptionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["doctor", "admin"]))):
    medical_record = db.query(MedicalRecord).filter(MedicalRecord.id == payload.medical_record_id).first()
    if not medical_record:
        raise HTTPException(status_code=404, detail="Medical record not found")

    prescription = db.query(Prescription).filter(Prescription.medical_record_id == payload.medical_record_id).first()
    if prescription:
        if prescription_matches_payload(db, prescription, payload):
            return {"id": prescription.id, "message": "Đơn thuốc không thay đổi"}
        replace_prescription_items(db, prescription, payload)
        upsert_pharmacy_request(db, medical_record.appointment_id, requested_by=current_user.id)
        db.commit()
        return {"id": prescription.id, "message": "Đã cập nhật đơn thuốc"}

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
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        prescription = db.query(Prescription).filter(Prescription.medical_record_id == payload.medical_record_id).first()
        if not prescription:
            raise
        replace_prescription_items(db, prescription, payload)
        upsert_pharmacy_request(db, medical_record.appointment_id, requested_by=current_user.id)
        db.commit()
        return {"id": prescription.id, "message": "Đã cập nhật đơn thuốc"}

    upsert_pharmacy_request(db, medical_record.appointment_id, requested_by=current_user.id)
    db.commit()
    return {"id": prescription.id, "message": "Đã tạo đơn thuốc"}


@router.get("/api/v1/prescriptions")
def list_prescriptions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(Prescription).order_by(Prescription.created_at.desc()).all()
    result: list[dict] = []
    for item in items:
        patient = db.query(Patient).filter(Patient.id == item.patient_id).first()
        patient_user = db.query(User).filter(User.id == patient.user_id).first() if patient and patient.user_id else None
        doctor = db.query(Doctor).filter(Doctor.id == item.doctor_id).first()
        doctor_user = db.query(User).filter(User.id == doctor.user_id).first() if doctor else None

        mr = db.query(MedicalRecord).filter(MedicalRecord.id == item.medical_record_id).first()
        invoice_id = None
        invoice_payment_status = None
        if mr:
            inv = db.query(Invoice).filter(Invoice.appointment_id == mr.appointment_id).first()
            if inv:
                invoice_id = inv.id
                invoice_payment_status = inv.payment_status.value

        result.append(
            {
                "id": item.id,
                "medical_record_id": item.medical_record_id,
                "patient_id": item.patient_id,
                "doctor_id": item.doctor_id,
                "patient_name": patient_user.full_name if patient_user else f"BN #{item.patient_id}",
                "doctor_name": doctor_user.full_name if doctor_user else None,
                "status": item.status.value,
                "prepared_at": item.prepared_at,
                "dispensed_at": item.dispensed_at,
                "invoice_id": invoice_id,
                "invoice_payment_status": invoice_payment_status,
            }
        )

    return result


@router.get("/api/v1/pharmacy-requests")
def list_pharmacy_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["pharmacist", "admin"])),
):
    requests = db.query(PharmacyRequest).order_by(PharmacyRequest.updated_at.desc(), PharmacyRequest.id.desc()).all()
    payload: list[dict] = []
    for request in requests:
        sync_pharmacy_request_status(db, request)
        if request.status == PharmacyRequestStatus.cancelled:
            continue
        payload.append(serialize_pharmacy_request(db, request))
    db.commit()
    return payload


@router.get("/api/v1/prescriptions/{prescription_id}")
def get_prescription(prescription_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return serialize_prescription(db, prescription)


@router.post("/api/v1/prescriptions/{prescription_id}/checkout")
def checkout_prescription(
    prescription_id: int,
    payload: PrescriptionCheckoutPayload | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["pharmacist", "admin"])),
):
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    invoice = ensure_prescription_invoice(db, prescription, current_user.id)
    db.commit()
    return {
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "payment_status": invoice.payment_status.value,
        "message": "Đã tạo hóa đơn",
    }


@router.patch("/api/v1/prescriptions/{prescription_id}/confirm-paid")
def confirm_prescription_paid(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["pharmacist", "admin"])),
):
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    invoice = ensure_prescription_invoice(db, prescription, current_user.id)
    if invoice.payment_status in {PaymentStatus.paid, PaymentStatus.credit_approved}:
        db.commit()
        return serialize_invoice(db, invoice)

    pending_tx = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.invoice_id == invoice.id, PaymentTransaction.status == TransactionStatus.pending)
        .order_by(PaymentTransaction.created_at.desc())
        .first()
    )

    if pending_tx:
        pending_tx.status = TransactionStatus.success
        pending_tx.paid_at = utcnow()
    else:
        remaining = max(0, float(invoice.total_amount) - float(invoice.paid_amount or 0))
        if remaining > 0:
            db.add(
                PaymentTransaction(
                    invoice_id=invoice.id,
                    transaction_type=TransactionType.payment,
                    payment_method=PaymentMethod.cash,
                    amount=remaining,
                    status=TransactionStatus.success,
                    created_by=current_user.id,
                    paid_at=utcnow(),
                )
            )

    invoice.invoice_status = InvoiceStatus.issued
    sync_invoice_payment_status(invoice, db)
    if invoice.payment_status in {PaymentStatus.paid, PaymentStatus.credit_approved}:
        settle_prescription_inventory(db, prescription, current_user.id, reference_type="invoice_payment")
    medical_record = db.query(MedicalRecord).filter(MedicalRecord.id == prescription.medical_record_id).first()
    request = upsert_pharmacy_request(
        db,
        medical_record.appointment_id if medical_record else invoice.appointment_id,
        requested_by=current_user.id,
    )
    sync_pharmacy_request_status(db, request)
    db.commit()
    return serialize_invoice(db, invoice)


@router.post("/api/v1/pharmacy-requests/{request_id}/checkout")
def checkout_pharmacy_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["pharmacist", "admin"])),
):
    request = get_pharmacy_request_or_404(db, request_id)
    appointment = get_appointment_or_404(db, request.appointment_id)
    
    # Calculate discount amount from appointment's discount_percent
    discount_amount = None
    if appointment.discount_percent and appointment.discount_percent > 0:
        # Calculate discount based on subtotal amount
        doctor = get_doctor_or_404(db, appointment.doctor_id)
        subtotal = float(doctor.consultation_fee or 0)
        
        # Add prescription items if available
        prescription = get_prescription_by_appointment(db, appointment.id)
        if prescription:
            items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
            for item in items:
                billed_qty = item.dispensed_quantity or item.reserved_quantity or item.quantity
                subtotal += float(item.unit_price) * billed_qty
        
        discount_amount = subtotal * (float(appointment.discount_percent) / 100)
    
    invoice = refresh_appointment_invoice(
        db, 
        appointment, 
        current_user.id, 
        discount_amount=discount_amount,
        discount_reason=appointment.discount_note,
        strict_prescription=True
    )
    sync_pharmacy_request_status(db, request)
    db.commit()
    return serialize_invoice(db, invoice)


@router.patch("/api/v1/pharmacy-requests/{request_id}/confirm-paid")
def confirm_pharmacy_request_paid(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["pharmacist", "admin"])),
):
    request = get_pharmacy_request_or_404(db, request_id)
    appointment = get_appointment_or_404(db, request.appointment_id)
    
    # Calculate discount amount from appointment's discount_percent
    discount_amount = None
    if appointment.discount_percent and appointment.discount_percent > 0:
        # Calculate discount based on subtotal amount
        doctor = get_doctor_or_404(db, appointment.doctor_id)
        subtotal = float(doctor.consultation_fee or 0)
        
        # Add prescription items if available
        prescription = get_prescription_by_appointment(db, appointment.id)
        if prescription:
            items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
            for item in items:
                billed_qty = item.dispensed_quantity or item.reserved_quantity or item.quantity
                subtotal += float(item.unit_price) * billed_qty
        
        discount_amount = subtotal * (float(appointment.discount_percent) / 100)
    
    invoice = refresh_appointment_invoice(
        db, 
        appointment, 
        current_user.id, 
        discount_amount=discount_amount,
        discount_reason=appointment.discount_note,
        strict_prescription=True
    )

    if invoice.payment_status in {PaymentStatus.paid, PaymentStatus.credit_approved}:
        sync_pharmacy_request_status(db, request)
        return serialize_invoice(db, invoice)

    pending_tx = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.invoice_id == invoice.id, PaymentTransaction.status == TransactionStatus.pending)
        .order_by(PaymentTransaction.created_at.desc())
        .first()
    )
    if pending_tx:
        pending_tx.status = TransactionStatus.success
        pending_tx.paid_at = utcnow()
    else:
        remaining = max(0, float(invoice.total_amount) - float(invoice.paid_amount or 0))
        if remaining > 0:
            db.add(
                PaymentTransaction(
                    invoice_id=invoice.id,
                    transaction_type=TransactionType.payment,
                    payment_method=PaymentMethod.cash,
                    amount=remaining,
                    status=TransactionStatus.success,
                    created_by=current_user.id,
                    paid_at=utcnow(),
                )
            )
    invoice.invoice_status = InvoiceStatus.issued
    sync_invoice_payment_status(invoice, db)
    prescription = get_prescription_by_appointment(db, appointment.id)
    if prescription and invoice.payment_status in {PaymentStatus.paid, PaymentStatus.credit_approved}:
        settle_prescription_inventory(db, prescription, current_user.id, reference_type="invoice_payment")
    sync_pharmacy_request_status(db, request)
    db.commit()
    return serialize_invoice(db, invoice)


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
    settle_prescription_inventory(db, prescription, current_user.id, reference_type="invoice_payment")
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


@router.delete("/api/v1/medicines/{medicine_id}")
def deactivate_medicine(medicine_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "pharmacist"]))):
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    medicine.is_active = False
    db.commit()
    return {"message": "Đã vô hiệu hóa thuốc"}


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
    before = medicine.current_stock
    batch = MedicineBatch(
        medicine_id=medicine_id,
        batch_number=f"NHAP-{medicine_id}-{int(datetime.utcnow().timestamp())}",
        expiry_date=None,
        import_quantity=payload.import_quantity,
        remaining_quantity=payload.import_quantity,
        reserved_quantity=0,
        import_unit_cost=0,
        supplier_id=payload.supplier_id,
    )
    db.add(batch)
    db.flush()
    recompute_medicine_stock(db, medicine_id)
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
            notes=payload.notes,
        )
    )
    db.commit()
    return {"message": "Đã nhập kho theo lô", "id": batch.id}


@router.get("/api/v1/medicines/low-stock")
def low_stock_medicines(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(Medicine).filter(Medicine.current_stock < Medicine.reorder_level).all()
    return [{"id": item.id, "name": item.name, "current_stock": item.current_stock, "reorder_level": item.reorder_level} for item in items]


def ensure_prescription_ready_for_checkout(db: Session, prescription: Prescription, user_id: int) -> None:
    items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
    if not items:
        return
    if any(item.reserved_quantity < item.quantity for item in items):
        prepare_prescription_logic(db, prescription, user_id)
        items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
    insufficient = [item for item in items if item.reserved_quantity < item.quantity]
    if insufficient:
        names = []
        for item in insufficient:
            medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
            names.append(medicine.name if medicine else f"Thuốc #{item.medicine_id}")
        raise HTTPException(status_code=400, detail=f"Không đủ tồn kho cho đơn thuốc: {', '.join(names)}")


def append_invoice_items_for_appointment(db: Session, invoice: Invoice, appointment: Appointment, strict_prescription: bool = False) -> Prescription | None:
    doctor = get_doctor_or_404(db, appointment.doctor_id)
    subtotal = 0.0

    exam_total = float(doctor.consultation_fee or 0)
    subtotal += exam_total
    db.add(
        InvoiceItem(
            invoice_id=invoice.id,
            item_type=INVOICE_ITEM_TYPE_EXAM,
            description="Phí khám bác sĩ",
            quantity=1,
            unit_price=exam_total,
            line_total=exam_total,
        )
    )

    # DEPRECATED: AppointmentService functionality removed
    # services = (
    #     db.query(AppointmentService)
    #     .filter(AppointmentService.appointment_id == appointment.id)
    #     .order_by(AppointmentService.id.asc())
    #     .all()
    # )
    # for item in services:
    #     line_total = float(item.unit_price) * item.quantity
    #     subtotal += line_total
    #     service = db.query(Service).filter(Service.id == item.service_id).first()
    #     db.add(
    #         InvoiceItem(
    #             invoice_id=invoice.id,
    #             item_type=INVOICE_ITEM_TYPE_SERVICE,
    #             reference_id=item.service_id,
    #             description=service.name if service else f"Dịch vụ #{item.service_id}",
    #             quantity=item.quantity,
    #             unit_price=float(item.unit_price),
    #             line_total=line_total,
    #         )
    #     )

    prescription = get_prescription_by_appointment(db, appointment.id)
    if prescription and strict_prescription:
        ensure_prescription_ready_for_checkout(db, prescription, invoice.cashier_id or 0)
    if prescription:
        items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
        for item in items:
            billed_qty = item.dispensed_quantity or item.reserved_quantity or item.quantity
            line_total = float(item.unit_price) * billed_qty
            subtotal += line_total
            medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
            db.add(
                InvoiceItem(
                    invoice_id=invoice.id,
                    item_type=INVOICE_ITEM_TYPE_MEDICINE,
                    reference_id=item.id,
                    description=medicine.name if medicine else f"Thuốc #{item.medicine_id}",
                    quantity=billed_qty,
                    unit_price=float(item.unit_price),
                    line_total=line_total,
                )
            )
    invoice.subtotal_amount = subtotal
    return prescription


def refresh_appointment_invoice(
    db: Session,
    appointment: Appointment,
    cashier_id: int,
    discount_amount: float | None = None,
    discount_reason: str | None = None,
    insurance_support_amount: float | None = None,
    notes: str | None = None,
    strict_prescription: bool = False,
) -> Invoice:
    invoice = get_invoice_by_appointment(db, appointment.id)
    if not invoice:
        invoice = Invoice(
            appointment_id=appointment.id,
            patient_id=appointment.patient_id,
            cashier_id=cashier_id,
            invoice_number=generate_invoice_number(db),
            invoice_status=InvoiceStatus.draft,
            payment_status=PaymentStatus.unpaid,
        )
        db.add(invoice)
        db.flush()

    invoice.cashier_id = cashier_id
    item_count = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).count()
    can_refresh_items = invoice.payment_status in {PaymentStatus.unpaid, PaymentStatus.awaiting_confirmation} and float(invoice.paid_amount or 0) <= 0
    if item_count == 0 or can_refresh_items:
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).delete()
        prescription = append_invoice_items_for_appointment(db, invoice, appointment, strict_prescription=strict_prescription)
        if discount_amount is not None:
            invoice.discount_amount = discount_amount
        else:
            invoice.discount_amount = float(invoice.discount_amount or 0)
        if insurance_support_amount is not None:
            invoice.insurance_support_amount = insurance_support_amount
        else:
            invoice.insurance_support_amount = float(invoice.insurance_support_amount or 0)
        if discount_reason is not None:
            invoice.discount_reason = discount_reason
        if notes is not None:
            invoice.notes = notes
        elif prescription:
            invoice.notes = f"Phiếu bác sĩ gửi dược sĩ: #{prescription.id}"
        invoice.total_amount = max(0, float(invoice.subtotal_amount) - float(invoice.discount_amount or 0) - float(invoice.insurance_support_amount or 0))

    if invoice.invoice_status == InvoiceStatus.draft and invoice.payment_status == PaymentStatus.unpaid:
        invoice.invoice_status = InvoiceStatus.issued
    db.flush()
    request = upsert_pharmacy_request(db, appointment.id, requested_by=cashier_id)
    sync_pharmacy_request_status(db, request)
    return invoice


def settle_prescription_inventory(
    db: Session,
    prescription: Prescription,
    user_id: int,
    reference_type: str = "prescription",
) -> None:
    items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
    if not items:
        return
    for item in items:
        allocations = (
            db.query(PrescriptionItemAllocation)
            .filter(PrescriptionItemAllocation.prescription_item_id == item.id)
            .all()
        )
        if not allocations:
            raise HTTPException(status_code=400, detail="Đơn thuốc chưa được chuẩn bị lô để xuất kho")
        dispensed = item.dispensed_quantity
        for allocation in allocations:
            qty = max(0, allocation.reserved_quantity - allocation.dispensed_quantity)
            if qty <= 0:
                continue
            batch = db.query(MedicineBatch).filter(MedicineBatch.id == allocation.batch_id).first()
            if not batch or batch.remaining_quantity < qty:
                raise HTTPException(status_code=400, detail="Tồn kho lô thuốc không đủ để xác nhận thanh toán")
            before = batch.remaining_quantity
            batch.reserved_quantity = max(0, batch.reserved_quantity - qty)
            batch.remaining_quantity = max(0, batch.remaining_quantity - qty)
            allocation.dispensed_quantity += qty
            dispensed += qty
            recompute_medicine_stock(db, batch.medicine_id)
            db.add(
                InventoryLog(
                    medicine_id=batch.medicine_id,
                    batch_id=batch.id,
                    user_id=user_id,
                    action=InventoryAction.export,
                    quantity_change=-qty,
                    quantity_before=before,
                    quantity_after=batch.remaining_quantity,
                    reference_id=prescription.id,
                    reference_type=reference_type,
                    notes="Xuất kho khi hóa đơn đã thanh toán",
                )
            )
        item.reserved_quantity = max(0, item.reserved_quantity - max(0, dispensed - item.dispensed_quantity))
        item.dispensed_quantity = dispensed
    prescription.dispensed_by = user_id
    prescription.dispensed_at = utcnow()
    prescription.picked_up_at = utcnow()
    prescription.status = PrescriptionStatus.dispensed if all(item.dispensed_quantity >= item.quantity for item in items) else PrescriptionStatus.partially_dispensed
    db.flush()


def settle_invoice_medicine_inventory(db: Session, invoice: Invoice, user_id: int) -> None:
    """Deduct medicine stock directly from invoice items (for medicines not in prescription)"""
    medicine_items = (
        db.query(InvoiceItem)
        .filter(InvoiceItem.invoice_id == invoice.id, InvoiceItem.item_type == INVOICE_ITEM_TYPE_MEDICINE)
        .all()
    )
    if not medicine_items:
        return
    
    for item in medicine_items:
        medicine = db.query(Medicine).filter(Medicine.id == item.reference_id).first()
        if not medicine:
            continue
        
        # Find available batches for this medicine (FIFO: first expiry first)
        available_batches = (
            db.query(MedicineBatch)
            .filter(
                MedicineBatch.medicine_id == item.reference_id,
                MedicineBatch.remaining_quantity > 0,
                MedicineBatch.is_active.is_(True)
            )
            .order_by(MedicineBatch.expiry_date.asc().nulls_last(), MedicineBatch.created_at.asc())
            .all()
        )
        
        if not available_batches:
            raise HTTPException(status_code=400, detail=f"Tồn kho không đủ cho thuốc: {medicine.name}")
        
        remaining_qty = item.quantity
        for batch in available_batches:
            if remaining_qty <= 0:
                break
            
            qty_to_deduct = min(remaining_qty, batch.remaining_quantity)
            before = batch.remaining_quantity
            batch.remaining_quantity -= qty_to_deduct
            remaining_qty -= qty_to_deduct
            
            # Update medicine stock
            recompute_medicine_stock(db, medicine.id)
            
            # Create inventory log
            db.add(
                InventoryLog(
                    medicine_id=medicine.id,
                    batch_id=batch.id,
                    user_id=user_id,
                    action=InventoryAction.export,
                    quantity_change=-qty_to_deduct,
                    quantity_before=before,
                    quantity_after=batch.remaining_quantity,
                    reference_id=invoice.id,
                    reference_type="invoice_payment",
                    notes=f"Xuất kho khi thanh toán hóa đơn: {medicine.name}",
                )
            )
        
        if remaining_qty > 0:
            raise HTTPException(status_code=400, detail=f"Tồn kho không đủ cho thuốc: {medicine.name}")
    
    db.flush()


def restore_prescription_inventory(db: Session, prescription: Prescription, user_id: int, reference_id: int) -> None:
    items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
    for item in items:
        allocations = (
            db.query(PrescriptionItemAllocation)
            .filter(PrescriptionItemAllocation.prescription_item_id == item.id)
            .all()
        )
        for allocation in allocations:
            batch = db.query(MedicineBatch).filter(MedicineBatch.id == allocation.batch_id).first()
            restored = allocation.dispensed_quantity
            if batch and restored > 0:
                before = batch.remaining_quantity
                batch.remaining_quantity += restored
                recompute_medicine_stock(db, batch.medicine_id)
                db.add(
                    InventoryLog(
                        medicine_id=batch.medicine_id,
                        batch_id=batch.id,
                        user_id=user_id,
                        action=InventoryAction.import_return,
                        quantity_change=restored,
                        quantity_before=before,
                        quantity_after=batch.remaining_quantity,
                        reference_id=reference_id,
                        reference_type="invoice_delete",
                        notes="Hoàn kho khi xóa hóa đơn đã thanh toán",
                    )
                )
            db.delete(allocation)
        item.reserved_quantity = 0
        item.dispensed_quantity = 0
    prescription.prepared_by = None
    prescription.prepared_at = None
    prescription.dispensed_by = None
    prescription.dispensed_at = None
    prescription.picked_up_at = None
    prescription.status = PrescriptionStatus.pending
    db.flush()


def restore_invoice_medicine_inventory(db: Session, invoice: Invoice, user_id: int) -> None:
    """Restore medicine stock from invoice items when invoice is deleted"""
    medicine_items = (
        db.query(InvoiceItem)
        .filter(InvoiceItem.invoice_id == invoice.id, InvoiceItem.item_type == INVOICE_ITEM_TYPE_MEDICINE)
        .all()
    )
    if not medicine_items:
        return
    
    for item in medicine_items:
        medicine = db.query(Medicine).filter(Medicine.id == item.reference_id).first()
        if not medicine:
            continue
        
        # Find inventory logs for this invoice item to determine what was deducted
        inventory_logs = (
            db.query(InventoryLog)
            .filter(
                InventoryLog.reference_id == invoice.id,
                InventoryLog.reference_type == "invoice_payment",
                InventoryLog.medicine_id == item.reference_id
            )
            .all()
        )
        
        for log in inventory_logs:
            batch = db.query(MedicineBatch).filter(MedicineBatch.id == log.batch_id).first()
            if batch and log.quantity_change < 0:  # Only restore exported items
                before = batch.remaining_quantity
                batch.remaining_quantity += abs(log.quantity_change)
                recompute_medicine_stock(db, medicine.id)
                
                # Create inventory log for restoration
                db.add(
                    InventoryLog(
                        medicine_id=medicine.id,
                        batch_id=batch.id,
                        user_id=user_id,
                        action=InventoryAction.import_return,
                        quantity_change=abs(log.quantity_change),
                        quantity_before=before,
                        quantity_after=batch.remaining_quantity,
                        reference_id=invoice.id,
                        reference_type="invoice_delete",
                        notes=f"Hoàn kho khi xóa hóa đơn: {medicine.name}",
                    )
                )
    
    db.flush()


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
        invoice.invoice_status = InvoiceStatus.draft
    elif invoice.paid_amount < float(invoice.total_amount):
        invoice.payment_status = PaymentStatus.partial
        invoice.invoice_status = InvoiceStatus.partially_paid
    else:
        invoice.payment_status = PaymentStatus.paid
        invoice.invoice_status = InvoiceStatus.paid
        invoice.paid_at = utcnow()


def ensure_prescription_invoice(db: Session, prescription: Prescription, cashier_id: int) -> Invoice:
    medical_record = db.query(MedicalRecord).filter(MedicalRecord.id == prescription.medical_record_id).first()
    if not medical_record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    appointment = get_appointment_or_404(db, medical_record.appointment_id)
    ensure_prescription_ready_for_checkout(db, prescription, cashier_id)
    
    # Calculate discount amount from appointment's discount_percent
    discount_amount = None
    if appointment.discount_percent and appointment.discount_percent > 0:
        # Calculate discount based on subtotal amount
        doctor = get_doctor_or_404(db, appointment.doctor_id)
        subtotal = float(doctor.consultation_fee or 0)
        
        # Add prescription items if available
        items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
        for item in items:
            billed_qty = item.dispensed_quantity or item.reserved_quantity or item.quantity
            subtotal += float(item.unit_price) * billed_qty
        
        discount_amount = subtotal * (float(appointment.discount_percent) / 100)
    
    return refresh_appointment_invoice(
        db, 
        appointment, 
        cashier_id, 
        discount_amount=discount_amount,
        discount_reason=appointment.discount_note,
        strict_prescription=True
    )


@router.post("/api/v1/invoices/generate/{appointment_id}")
def generate_invoice(
    appointment_id: int,
    payload: InvoiceGeneratePayload | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["pharmacist", "admin"])),
):
    payload = payload or InvoiceGeneratePayload()
    appointment = get_appointment_or_404(db, appointment_id)
    
    # Calculate discount amount from appointment's discount_percent if not provided in payload
    discount_amount = payload.discount_amount
    if discount_amount is None and appointment.discount_percent and appointment.discount_percent > 0:
        # Calculate discount based on subtotal amount
        doctor = get_doctor_or_404(db, appointment.doctor_id)
        subtotal = float(doctor.consultation_fee or 0)
        
        # Add prescription items if available
        prescription = get_prescription_by_appointment(db, appointment.id)
        if prescription:
            items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == prescription.id).all()
            for item in items:
                billed_qty = item.dispensed_quantity or item.reserved_quantity or item.quantity
                subtotal += float(item.unit_price) * billed_qty
        
        discount_amount = subtotal * (float(appointment.discount_percent) / 100)
    
    invoice = refresh_appointment_invoice(
        db,
        appointment,
        current_user.id,
        discount_amount=discount_amount,
        discount_reason=payload.discount_reason or appointment.discount_note,
        insurance_support_amount=payload.insurance_support_amount,
        notes=payload.notes,
    )
    db.commit()
    return serialize_invoice(db, invoice)


@router.get("/api/v1/invoices")
def list_invoices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Invoice)
    if current_user.role == RoleEnum.patient:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if patient:
            query = query.filter(Invoice.patient_id == patient.id)
        else:
            query = query.filter(Invoice.patient_id == 0)
    items = query.order_by(Invoice.created_at.desc()).all()
    return [serialize_invoice(db, item) for item in items]


@router.get("/api/v1/invoices/{invoice_id}")
def get_invoice(invoice_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return serialize_invoice(db, get_invoice_or_404(db, invoice_id))


@router.delete("/api/v1/invoices/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["pharmacist", "admin"])),
):
    """Xóa hóa đơn đã thanh toán (cascade chi tiết hóa đơn, giao dịch thanh toán)."""
    invoice = get_invoice_or_404(db, invoice_id)
    if invoice.payment_status not in {PaymentStatus.paid, PaymentStatus.credit_approved}:
        raise HTTPException(status_code=400, detail="Chỉ xóa được hóa đơn đã thanh toán trong lịch sử")
    prescription = get_prescription_by_appointment(db, invoice.appointment_id)
    if prescription and prescription.status in {PrescriptionStatus.dispensed, PrescriptionStatus.partially_dispensed}:
        restore_prescription_inventory(db, prescription, current_user.id, invoice.id)
    # Also restore direct invoice medicine items (not in prescription)
    restore_invoice_medicine_inventory(db, invoice, current_user.id)
    request = db.query(PharmacyRequest).filter(PharmacyRequest.appointment_id == invoice.appointment_id).first()
    db.delete(invoice)
    if request:
        sync_pharmacy_request_status(db, request)
    db.commit()
    return {"message": "Đã xóa hóa đơn và hoàn lại kho"}


@router.patch("/api/v1/invoices/{invoice_id}/pay")
def pay_invoice(
    invoice_id: int,
    payload: InvoicePayPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["pharmacist", "admin"])),
):
    print(f"PAYMENT DEBUG: Processing payment for invoice {invoice_id}")
    print(f"PAYMENT DEBUG: Payment method: {payload.payment_method}")
    print(f"PAYMENT DEBUG: Amount: {payload.amount}")
    
    invoice = get_invoice_or_404(db, invoice_id)
    method = PaymentMethod(payload.payment_method)
    tx_status = TransactionStatus.pending if method in [PaymentMethod.transfer, PaymentMethod.qr] else TransactionStatus.success
    
    print(f"PAYMENT DEBUG: Transaction status: {tx_status}")
    
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
    invoice.invoice_status = InvoiceStatus.issued
    if tx_status == TransactionStatus.pending:
        invoice.payment_status = PaymentStatus.awaiting_confirmation
    else:
        sync_invoice_payment_status(invoice, db)
        prescription = get_prescription_by_appointment(db, invoice.appointment_id)
        if prescription and invoice.payment_status in {PaymentStatus.paid, PaymentStatus.credit_approved}:
            settle_prescription_inventory(db, prescription, current_user.id, reference_type="invoice_payment")
        # Also handle direct invoice medicine items (not in prescription)
        if invoice.payment_status in {PaymentStatus.paid, PaymentStatus.credit_approved}:
            settle_invoice_medicine_inventory(db, invoice, current_user.id)
    request = db.query(PharmacyRequest).filter(PharmacyRequest.appointment_id == invoice.appointment_id).first()
    if request:
        sync_pharmacy_request_status(db, request)
    db.commit()
    
    print(f"PAYMENT DEBUG: Transaction committed to database")
    print(f"PAYMENT DEBUG: Transaction ID: {tx.id}")
    print(f"PAYMENT DEBUG: Payment method: {tx.payment_method.value}")
    
    return serialize_invoice(db, invoice)


@router.patch("/api/v1/invoices/{invoice_id}/confirm-transfer")
def confirm_transfer(invoice_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["pharmacist", "admin"]))):
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
    prescription = get_prescription_by_appointment(db, invoice.appointment_id)
    if prescription and invoice.payment_status in {PaymentStatus.paid, PaymentStatus.credit_approved}:
        settle_prescription_inventory(db, prescription, current_user.id, reference_type="invoice_payment")
    # Also handle direct invoice medicine items (not in prescription)
    if invoice.payment_status in {PaymentStatus.paid, PaymentStatus.credit_approved}:
        settle_invoice_medicine_inventory(db, invoice, current_user.id)
    request = db.query(PharmacyRequest).filter(PharmacyRequest.appointment_id == invoice.appointment_id).first()
    if request:
        sync_pharmacy_request_status(db, request)
    db.commit()
    return serialize_invoice(db, invoice)


@router.patch("/api/v1/invoices/{invoice_id}/approve-credit")
def approve_credit(
    invoice_id: int,
    payload: ApproveCreditPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pharmacist"])),
):
    invoice = get_invoice_or_404(db, invoice_id)
    invoice.invoice_status = InvoiceStatus.issued
    invoice.payment_status = PaymentStatus.credit_approved
    invoice.notes = payload.notes or invoice.notes
    prescription = get_prescription_by_appointment(db, invoice.appointment_id)
    if prescription:
        ensure_prescription_ready_for_checkout(db, prescription, current_user.id)
        settle_prescription_inventory(db, prescription, current_user.id, reference_type="invoice_payment")
    # Also handle direct invoice medicine items (not in prescription)
    settle_invoice_medicine_inventory(db, invoice, current_user.id)
    request = db.query(PharmacyRequest).filter(PharmacyRequest.appointment_id == invoice.appointment_id).first()
    if request:
        sync_pharmacy_request_status(db, request)
    db.commit()
    return serialize_invoice(db, invoice)


@router.post("/api/v1/invoices/{invoice_id}/refund")
def refund_invoice(
    invoice_id: int,
    payload: RefundPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["pharmacist", "admin"])),
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


def generate_qr_code_for_transfer(invoice_data: dict) -> bytes:
    """Generate a QR code for bank transfer with fake bank info"""
    try:
        # Fake bank information for QR code
        bank_info = (
            f"Ngân hàng: Vietcombank\n"
            f"Số tài khoản: 1234567890\n"
            f"Chủ tài khoản: PHONG KHAM DA LIEU\n"
            f"Số tiền: {_format_vnd(invoice_data.get('total_amount', 0))}\n"
            f"Nội dung: {invoice_data.get('invoice_number', '')}"
        )
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=4,
            border=2,
        )
        qr.add_data(bank_info)
        qr.make(fit=True)
        
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to bytes for ReportLab
        qr_buffer = BytesIO()
        qr_img.save(qr_buffer, format="PNG")
        qr_buffer.seek(0)
        
        return qr_buffer.getvalue()
    except Exception as e:
        # If QR generation fails, return a blank image
        print(f"Error generating QR code: {e}")
        blank_img = PILImage.new('RGB', (200, 200), color='white')
        blank_buffer = BytesIO()
        blank_img.save(blank_buffer, format='PNG')
        blank_buffer.seek(0)
        return blank_buffer.getvalue()


def build_invoice_pdf(invoice_data: dict, include_qr_for_payment_method: str | None = None) -> bytes:
    font_name, font_bold_name = ensure_pdf_fonts()
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Title"],
        fontName=font_bold_name,
        fontSize=19,
        leading=24,
        textColor=colors.HexColor("#163768"),
        alignment=TA_LEFT,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "InvoiceSubtitle",
        parent=styles["Normal"],
        fontName=font_name,
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#53657d"),
    )
    label_style = ParagraphStyle(
        "InvoiceLabel",
        parent=styles["Normal"],
        fontName=font_bold_name,
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#163768"),
    )
    value_style = ParagraphStyle(
        "InvoiceValue",
        parent=styles["Normal"],
        fontName=font_name,
        fontSize=9.5,
        leading=13,
        textColor=colors.black,
    )
    value_right_style = ParagraphStyle(
        "InvoiceValueRight",
        parent=value_style,
        alignment=TA_RIGHT,
    )

    elements: list = [
        Paragraph("PHÒNG KHÁM DA LIỄU", title_style),
        Paragraph("Phiếu thanh toán thuốc", subtitle_style),
        Spacer(1, 6),
    ]

    info_table = Table(
        [
            [
                Paragraph("Số hóa đơn", label_style),
                Paragraph(invoice_data["invoice_number"], value_style),
                Paragraph("Ngày lập", label_style),
                Paragraph(_format_pdf_datetime(invoice_data.get("created_at")), value_style),
            ],
            [
                Paragraph("Bệnh nhân", label_style),
                Paragraph(invoice_data.get("patient_name") or "—", value_style),
                Paragraph("Mã bệnh nhân", label_style),
                Paragraph(invoice_data.get("patient_code") or "—", value_style),
            ],
            [
                Paragraph("Số điện thoại", label_style),
                Paragraph(invoice_data.get("patient_phone") or "—", value_style),
                Paragraph("Bác sĩ", label_style),
                Paragraph(invoice_data.get("doctor_name") or "—", value_style),
            ],
            [
                Paragraph("Địa chỉ", label_style),
                Paragraph(invoice_data.get("patient_address") or "—", value_style),
                Paragraph("Dược sĩ", label_style),
                Paragraph(invoice_data.get("cashier_name") or "—", value_style),
            ],
            [
                Paragraph("Lịch khám", label_style),
                Paragraph(
                    f"{invoice_data.get('appointment_date') or '—'} {invoice_data.get('appointment_time') or ''}".strip(),
                    value_style,
                ),
                Paragraph("Thanh toán lúc", label_style),
                Paragraph(_format_pdf_datetime(invoice_data.get("paid_at")), value_style),
            ],
        ],
        colWidths=[24 * mm, 68 * mm, 24 * mm, 58 * mm],
    )
    info_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.whitesmoke),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#c7d7f2")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d7e2f1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    elements.extend([info_table, Spacer(1, 10)])

    item_rows = [
        [
            Paragraph("STT", label_style),
            Paragraph("Nội dung", label_style),
            Paragraph("SL", label_style),
            Paragraph("Đơn giá", label_style),
            Paragraph("Thành tiền", label_style),
        ]
    ]
    for index, item in enumerate(invoice_data.get("items", []), start=1):
        item_rows.append(
            [
                Paragraph(str(index), value_style),
                Paragraph(item.get("description") or "—", value_style),
                Paragraph(str(item.get("quantity") or 0), value_right_style),
                Paragraph(_format_vnd(item.get("unit_price")), value_right_style),
                Paragraph(_format_vnd(item.get("line_total")), value_right_style),
            ]
        )

    item_table = Table(item_rows, colWidths=[14 * mm, 88 * mm, 14 * mm, 30 * mm, 34 * mm])
    item_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e9f0fb")),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#c7d7f2")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d7e2f1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    elements.extend([item_table, Spacer(1, 10)])

    # Check if there's a transfer or QR payment method in existing transactions
    # OR if we're generating PDF for a new QR payment
    has_transfer_or_qr = any(
        tx.get("payment_method") in ["transfer", "qr"] 
        for tx in invoice_data.get("transactions", [])
    ) or include_qr_for_payment_method in ["transfer", "qr"]
    
    # Debug logging
    print(f"PDF Generation - has_transfer_or_qr: {has_transfer_or_qr}")
    print(f"PDF Generation - transactions: {[tx.get('payment_method') for tx in invoice_data.get('transactions', [])]}")
    print(f"PDF Generation - include_qr_for_payment_method: {include_qr_for_payment_method}")
    
    if has_transfer_or_qr:
        print("Generating QR code for PDF...")
        # Create QR code
        qr_bytes = generate_qr_code_for_transfer(invoice_data)
        print(f"QR code generated, size: {len(qr_bytes)} bytes")
        qr_buffer = BytesIO(qr_bytes)
        qr_image = Image(qr_buffer, width=40 * mm, height=40 * mm)
        
        # Create a table with QR code on the left and summary on the right
        combined_table = Table(
            [
                [
                    qr_image,
                    Table(
                        [
                            [Paragraph("Tạm tính", label_style), Paragraph(_format_vnd(invoice_data.get("subtotal_amount")), value_right_style)],
                            [Paragraph("Giảm giá", label_style), Paragraph(_format_vnd(invoice_data.get("discount_amount")), value_right_style)],
                            [Paragraph("Hỗ trợ bảo hiểm", label_style), Paragraph(_format_vnd(invoice_data.get("insurance_support_amount")), value_right_style)],
                            [Paragraph("Đã thu", label_style), Paragraph(_format_vnd(invoice_data.get("paid_amount")), value_right_style)],
                            [Paragraph("Tổng thanh toán", label_style), Paragraph(_format_vnd(invoice_data.get("total_amount")), value_right_style)],
                        ],
                        colWidths=[45 * mm, 42 * mm],
                    )
                ]
            ],
            colWidths=[45 * mm, 95 * mm],
        )
        combined_table.setStyle(
            TableStyle([
                ("BACKGROUND", (1, 0), (1, -1), colors.whitesmoke),
                ("BOX", (1, 0), (1, -1), 0.75, colors.HexColor("#c7d7f2")),
                ("INNERGRID", (1, 0), (1, -1), 0.5, colors.HexColor("#d7e2f1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (1, 0), (1, -1), 8),
                ("RIGHTPADDING", (1, 0), (1, -1), 8),
                ("TOPPADDING", (1, 0), (1, -1), 7),
                ("BOTTOMPADDING", (1, 0), (1, -1), 7),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("VALIGN", (0, 0), (0, -1), "MIDDLE"),
            ])
        )
        
        # Add QR code info text
        qr_info_style = ParagraphStyle(
            "QRInfo",
            parent=styles["Normal"],
            fontName=font_name,
            fontSize=8,
            leading=10,
            textColor=colors.black,
            alignment=TA_CENTER,
        )
        
        qr_elements = [
            combined_table,
            Spacer(1, 3),
            Paragraph("Quét mã QR để chuyển khoản", qr_info_style),
            Paragraph("Vietcombank - 1234567890", qr_info_style),
            Spacer(1, 10),
        ]
        elements.extend(qr_elements)
    else:
        # Original summary table without QR code
        summary_table = Table(
            [
                [Paragraph("Tạm tính", label_style), Paragraph(_format_vnd(invoice_data.get("subtotal_amount")), value_right_style)],
                [Paragraph("Giảm giá", label_style), Paragraph(_format_vnd(invoice_data.get("discount_amount")), value_right_style)],
                [Paragraph("Hỗ trợ bảo hiểm", label_style), Paragraph(_format_vnd(invoice_data.get("insurance_support_amount")), value_right_style)],
                [Paragraph("Đã thu", label_style), Paragraph(_format_vnd(invoice_data.get("paid_amount")), value_right_style)],
                [Paragraph("Tổng thanh toán", label_style), Paragraph(_format_vnd(invoice_data.get("total_amount")), value_right_style)],
            ],
            colWidths=[45 * mm, 42 * mm],
            hAlign="RIGHT",
        )
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.whitesmoke),
                    ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#c7d7f2")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d7e2f1")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )
        elements.extend([summary_table, Spacer(1, 10)])

    if invoice_data.get("notes"):
        notes_table = Table(
            [[Paragraph("Ghi chú", label_style)], [Paragraph(invoice_data["notes"], value_style)]],
            colWidths=[180 * mm],
        )
        notes_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f7f9fc")),
                    ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#d7e2f1")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )
        elements.extend([notes_table, Spacer(1, 16)])

    sign_table = Table(
        [
            [
                Paragraph("Người lập phiếu", label_style),
                Paragraph("Người nhận thuốc", label_style),
            ],
            [
                Paragraph("(Ký, ghi rõ họ tên)", subtitle_style),
                Paragraph("(Ký, ghi rõ họ tên)", subtitle_style),
            ],
        ],
        colWidths=[90 * mm, 90 * mm],
    )
    sign_table.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"), ("TOPPADDING", (0, 0), (-1, -1), 8)]))
    elements.append(sign_table)

    doc.build(elements)
    return buffer.getvalue()


@router.get("/api/v1/invoices/{invoice_id}/pdf")
def invoice_pdf(invoice_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice = get_invoice_or_404(db, invoice_id)
    pdf_bytes = build_invoice_pdf(serialize_invoice(db, invoice))
    return Response(
        pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={invoice.invoice_number}.pdf"},
    )


# ============================================================
# Alternative to DoctorBusySlot - Using DoctorLeave for temporary unavailability
# ============================================================

@router.post("/api/v1/admin/doctors/{doctor_id}/temporary-unavailability")
def create_temporary_unavailability(
    doctor_id: int,
    payload: DoctorLeavePayload,  # Reuse DoctorLeavePayload for simplicity
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    """Create temporary unavailability for a doctor (replaces DoctorBusySlot functionality)"""
    get_doctor_or_404(db, doctor_id)
    
    # Check if leave already exists for this date
    existing_leave = db.query(DoctorLeave).filter(
        DoctorLeave.doctor_id == doctor_id,
        DoctorLeave.leave_date == payload.leave_date
    ).first()
    
    if existing_leave:
        return {"error": "Bác sĩ đã có lịch nghỉ/nghỉ phép vào ngày này"}
    
    leave = DoctorLeave(
        doctor_id=doctor_id,
        leave_date=payload.leave_date,
        reason=payload.reason or "Bận tạm thời",
        created_by=current_user.id,
    )
    db.add(leave)
    db.commit()
    return {"message": "Đã tạo lịch bận tạm thời cho bác sĩ"}


@router.patch("/api/v1/appointments/{appointment_id}/propose-reschedule")
def propose_reschedule(
    appointment_id: int,
    payload: RescheduleProposalPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["doctor", "admin"])),
):
    appointment = get_appointment_or_404(db, appointment_id)
    appointment.proposed_date = payload.proposed_date
    appointment.proposed_time = payload.proposed_time
    appointment.discount_percent = payload.discount_percent
    appointment.discount_note = payload.discount_note
    appointment.status = AppointmentStatus.pending
    appointment.notes = payload.note
    patient = get_patient_or_404(db, appointment.patient_id)
    if patient.user_id:
        create_notification(
            db,
            patient.user_id,
            "Bác sĩ đề nghị đổi lịch",
            payload.note,
            NotificationType.appointment,
        )
    db.commit()
    return serialize_appointment(db, appointment)


@router.get("/api/v1/admin/accounts")
def list_accounts(db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [serialize_user(user) for user in users]


@router.post("/api/v1/admin/accounts/{role_name}")
def create_account(
    role_name: str,
    payload: AdminAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    role_map = {"doctor": RoleEnum.doctor, "pharmacist": RoleEnum.pharmacist, "patient": RoleEnum.patient}
    if role_name not in role_map:
        raise HTTPException(status_code=400, detail="Role is not supported")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    user = User(
        email=payload.email,
        password=get_password_hash(payload.password),
        role=role_map[role_name],
        full_name=payload.full_name,
        phone=payload.phone,
        is_active=True,
        email_verified_at=utcnow(),
    )
    db.add(user)
    db.flush()
    if role_name == "doctor":
        if not payload.specialty or not payload.license_number:
            raise HTTPException(status_code=400, detail="specialty and license_number are required")
        db.add(
            Doctor(
                user_id=user.id,
                specialty=payload.specialty,
                license_number=payload.license_number,
                degree=payload.degree,
                experience_years=payload.experience_years,
                consultation_fee=payload.consultation_fee,
                bio=payload.bio,
            )
        )
    if role_name == "patient":
        db.add(Patient(user_id=user.id, patient_code=next_patient_code(db), created_source=PatientSource.admin))
    db.commit()
    return {"message": "Đã tạo tài khoản", "user": serialize_user(user)}


@router.patch("/api/v1/admin/accounts/{user_id}/reset-password")
def admin_reset_password(user_id: int, payload: dict | None = None, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_password = (payload or {}).get("new_password") or "123456"
    user.password = get_password_hash(new_password)
    db.commit()
    return {"message": "Đã đặt lại mật khẩu mặc định 123456"}


@router.patch("/api/v1/admin/accounts/{user_id}/lock")
def lock_account(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": "Đã khóa tài khoản"}


@router.patch("/api/v1/admin/accounts/{user_id}/unlock")
def unlock_account(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    user.email_verified_at = user.email_verified_at or utcnow()
    db.commit()
    return {"message": "Đã mở khóa tài khoản"}


@router.delete("/api/v1/admin/accounts/{user_id}")
def delete_account(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    try:
        db.delete(user)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Không thể xóa tài khoản đã có dữ liệu liên kết. Vui lòng khóa tài khoản thay vì xóa.")
    return {"message": "Đã xóa tài khoản"}


@router.get("/api/v1/admin/contracts")
def list_contracts(db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    rows = db.query(DoctorProfile).order_by(DoctorProfile.updated_at.desc()).all()
    return [serialize_doctor_profile(item) for item in rows]


@router.post("/api/v1/admin/contracts")
def create_contract(
    payload: DoctorProfilePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Không tìm thấy bác sĩ")
    if db.query(DoctorProfile).filter(DoctorProfile.doctor_id == payload.doctor_id).first():
        raise HTTPException(status_code=400, detail="Bác sĩ này đã có hồ sơ")
    dup_cccd = db.query(DoctorProfile).filter(DoctorProfile.citizen_id == payload.so_cccd).first()
    if dup_cccd:
        raise HTTPException(status_code=400, detail="Số CCCD đã tồn tại")
    profile = DoctorProfile(doctor_id=payload.doctor_id)
    _apply_doctor_profile_payload(profile, payload)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return {"message": "Đã thêm hồ sơ bác sĩ", "id": profile.id}


@router.put("/api/v1/admin/contracts/{contract_id}")
def update_contract(
    contract_id: int,
    payload: DoctorProfilePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    profile = db.query(DoctorProfile).filter(DoctorProfile.id == contract_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ bác sĩ")
    dup_cccd = db.query(DoctorProfile).filter(DoctorProfile.citizen_id == payload.so_cccd, DoctorProfile.id != contract_id).first()
    if dup_cccd:
        raise HTTPException(status_code=400, detail="Số CCCD đã tồn tại")
    if payload.doctor_id != profile.doctor_id:
        doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Không tìm thấy bác sĩ")
        taken = db.query(DoctorProfile).filter(DoctorProfile.doctor_id == payload.doctor_id, DoctorProfile.id != contract_id).first()
        if taken:
            raise HTTPException(status_code=400, detail="Bác sĩ đích đã có hồ sơ khác")
        profile.doctor_id = payload.doctor_id
    _apply_doctor_profile_payload(profile, payload)
    db.commit()
    return {"message": "Đã cập nhật hồ sơ bác sĩ"}


@router.delete("/api/v1/admin/contracts/{contract_id}")
def delete_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    profile = db.query(DoctorProfile).filter(DoctorProfile.id == contract_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ bác sĩ")
    db.delete(profile)
    db.commit()
    return {"message": "Đã xóa hồ sơ bác sĩ"}


@router.get("/api/v1/admin/contracts/pdf")
def export_contracts_pdf(db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    rows = db.query(DoctorProfile).order_by(DoctorProfile.updated_at.desc()).all()
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.setTitle("Danh_sach_ho_so_bac_si")
    pdf.drawString(50, 810, "DANH SACH HO SO BAC SI")
    y = 790
    for idx, item in enumerate(rows, start=1):
        end_hd = item.contract_end_date.isoformat() if item.contract_end_date else "N/A"
        row = f"{idx}. {item.full_name} | CCCD {item.citizen_id} | Vao lam: {item.start_work_date} | Het han HD: {end_hd} | {item.position or '-'}"
        pdf.drawString(50, y, row[:120])
        y -= 18
        if y < 60:
            pdf.showPage()
            y = 810
    pdf.save()
    buffer.seek(0)
    return Response(
        buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=danh_sach_ho_so_bac_si.pdf"},
    )


@router.get("/api/v1/suppliers")
def list_suppliers(db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "pharmacist"]))):
    suppliers = db.query(Supplier).order_by(Supplier.name.asc()).all()
    return [
        {
            "id": item.id,
            "name": item.name,
            "contact_name": item.contact_name,
            "phone": item.phone,
            "email": item.email,
            "address": item.address,
            "notes": item.notes,
            "is_active": item.is_active,
        }
        for item in suppliers
    ]


@router.post("/api/v1/suppliers")
def create_supplier(payload: SupplierCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "pharmacist"]))):
    supplier = Supplier(**payload.model_dump())
    db.add(supplier)
    db.commit()
    return {"message": "Đã tạo nhà cung cấp", "id": supplier.id}


@router.put("/api/v1/suppliers/{supplier_id}")
def update_supplier(
    supplier_id: int,
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pharmacist"])),
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for key, value in payload.model_dump().items():
        setattr(supplier, key, value)
    db.commit()
    return {"message": "Đã cập nhật nhà cung cấp"}


@router.delete("/api/v1/suppliers/{supplier_id}")
def deactivate_supplier(supplier_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin", "pharmacist"]))):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    supplier.is_active = False
    db.commit()
    return {"message": "Đã vô hiệu hóa nhà cung cấp"}





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


@router.get("/api/v1/inventory-logs")
def list_inventory_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "pharmacist"])),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    medicine_id: int | None = Query(default=None),
    action: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
):
    """Lấy lịch sử xuất nhập kho"""
    query = db.query(InventoryLog).join(Medicine, InventoryLog.medicine_id == Medicine.id)
    
    if medicine_id:
        query = query.filter(InventoryLog.medicine_id == medicine_id)
    
    if action:
        query = query.filter(InventoryLog.action == action)
    
    if date_from:
        try:
            from datetime import datetime
            date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query = query.filter(InventoryLog.created_at >= date_from_dt)
        except ValueError:
            pass
    
    if date_to:
        try:
            from datetime import datetime
            date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            query = query.filter(InventoryLog.created_at <= date_to_dt)
        except ValueError:
            pass
    
    total = query.count()
    logs = query.order_by(InventoryLog.created_at.desc()).offset(offset).limit(limit).all()
    
    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        medicine = db.query(Medicine).filter(Medicine.id == log.medicine_id).first()
        result.append({
            "id": log.id,
            "medicine_id": log.medicine_id,
            "medicine_name": medicine.name if medicine else 'N/A',
            "batch_id": log.batch_id,
            "user_id": log.user_id,
            "user_name": user.full_name if user else 'N/A',
            "action": log.action,
            "quantity_change": log.quantity_change,
            "quantity_before": log.quantity_before,
            "quantity_after": log.quantity_after,
            "reference_id": log.reference_id,
            "reference_type": log.reference_type,
            "notes": log.notes,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })
    
    return {
        "items": result,
        "total": total,
        "limit": limit,
        "offset": offset
    }
