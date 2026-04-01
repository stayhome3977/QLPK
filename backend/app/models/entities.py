import enum

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RoleEnum(str, enum.Enum):
    admin = "admin"
    doctor = "doctor"
    receptionist = "receptionist"
    cashier = "cashier"
    pharmacist = "pharmacist"
    patient = "patient"


class GenderEnum(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class VisitType(str, enum.Enum):
    scheduled = "scheduled"
    walk_in = "walk_in"
    follow_up = "follow_up"


class BookingSource(str, enum.Enum):
    patient_app = "patient_app"
    phone = "phone"
    frontdesk = "frontdesk"
    admin = "admin"


class AppointmentStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    checked_in = "checked_in"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class PrescriptionStatus(str, enum.Enum):
    pending = "pending"
    prepared = "prepared"
    awaiting_payment = "awaiting_payment"
    partially_dispensed = "partially_dispensed"
    dispensed = "dispensed"
    cancelled = "cancelled"


class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    issued = "issued"
    partially_paid = "partially_paid"
    paid = "paid"
    cancelled = "cancelled"
    refunded = "refunded"


class PaymentStatus(str, enum.Enum):
    unpaid = "unpaid"
    awaiting_confirmation = "awaiting_confirmation"
    partial = "partial"
    paid = "paid"
    credit_approved = "credit_approved"
    refunded = "refunded"


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    card = "card"
    transfer = "transfer"
    insurance_support = "insurance_support"
    other = "other"


class TransactionStatus(str, enum.Enum):
    pending = "pending"
    success = "success"
    failed = "failed"
    cancelled = "cancelled"


class TransactionType(str, enum.Enum):
    payment = "payment"
    refund = "refund"


class NotificationType(str, enum.Enum):
    appointment = "appointment"
    prescription = "prescription"
    invoice = "invoice"
    system = "system"
    reminder = "reminder"


class PatientSource(str, enum.Enum):
    self_register = "self_register"
    frontdesk = "frontdesk"
    phone = "phone"
    admin = "admin"


class InventoryAction(str, enum.Enum):
    import_ = "import"
    export = "export"
    adjust = "adjust"
    expired = "expired"
    import_return = "import_return"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(255))
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum), default=RoleEnum.patient, nullable=False)
    full_name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(15))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    email_verified_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    last_login: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    patient_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    created_source: Mapped[PatientSource] = mapped_column(Enum(PatientSource), default=PatientSource.self_register)
    date_of_birth: Mapped[str | None] = mapped_column(Date)
    gender: Mapped[GenderEnum | None] = mapped_column(Enum(GenderEnum))
    blood_type: Mapped[str | None] = mapped_column(String(5))
    address: Mapped[str | None] = mapped_column(Text)
    insurance_number: Mapped[str | None] = mapped_column(String(50))
    insurance_expire: Mapped[str | None] = mapped_column(Date)
    occupation: Mapped[str | None] = mapped_column(String(100))
    emergency_contact_name: Mapped[str | None] = mapped_column(String(100))
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(15))
    allergy_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    specialty: Mapped[str] = mapped_column(String(100))
    license_number: Mapped[str] = mapped_column(String(50), unique=True)
    degree: Mapped[str | None] = mapped_column(String(100))
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    consultation_fee: Mapped[float] = mapped_column(Numeric(12, 0), default=200000)
    bio: Mapped[str | None] = mapped_column(Text)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DoctorSchedule(Base):
    __tablename__ = "doctor_schedules"
    __table_args__ = (UniqueConstraint("doctor_id", "day_of_week", "start_time", name="uq_doctor_day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="CASCADE"))
    day_of_week: Mapped[int] = mapped_column(Integer)
    start_time: Mapped[str] = mapped_column(Time)
    end_time: Mapped[str] = mapped_column(Time)
    slot_duration: Mapped[int] = mapped_column(Integer, default=30)
    max_patients: Mapped[int] = mapped_column(Integer, default=20)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class DoctorLeave(Base):
    __tablename__ = "doctor_leave"
    __table_args__ = (UniqueConstraint("doctor_id", "leave_date", name="uq_doc_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="CASCADE"))
    leave_date: Mapped[str] = mapped_column(Date)
    reason: Mapped[str | None] = mapped_column(String(200))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ClinicHoliday(Base):
    __tablename__ = "clinic_holidays"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    holiday_date: Mapped[str] = mapped_column(Date, unique=True)
    name: Mapped[str] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Numeric(12, 0), default=0)
    duration: Mapped[int] = mapped_column(Integer, default=30)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    image_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"))
    primary_service_id: Mapped[int | None] = mapped_column(ForeignKey("services.id"))
    visit_type: Mapped[VisitType] = mapped_column(Enum(VisitType), default=VisitType.scheduled)
    booking_source: Mapped[BookingSource] = mapped_column(Enum(BookingSource), default=BookingSource.patient_app)
    appointment_date: Mapped[str] = mapped_column(Date, index=True)
    appointment_time: Mapped[str] = mapped_column(Time)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    status: Mapped[AppointmentStatus] = mapped_column(Enum(AppointmentStatus), default=AppointmentStatus.pending, index=True)
    queue_number: Mapped[int | None] = mapped_column(Integer)
    chief_complaint: Mapped[str | None] = mapped_column(Text)
    cancel_reason: Mapped[str | None] = mapped_column(Text)
    cancelled_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    cancelled_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    confirmed_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    checked_in_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    no_show_marked_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    rescheduled_from_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"))
    follow_up_from_appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"))
    reminder_24h_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    reminder_2h_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AppointmentService(Base):
    __tablename__ = "appointment_services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id", ondelete="CASCADE"), index=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 0), default=0)
    added_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    added_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    notes: Mapped[str | None] = mapped_column(Text)


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), unique=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"))
    symptoms: Mapped[str | None] = mapped_column(Text)
    clinical_findings: Mapped[str | None] = mapped_column(Text)
    diagnosis: Mapped[str] = mapped_column(String(500))
    icd10_code: Mapped[str | None] = mapped_column(String(20))
    treatment_plan: Mapped[str | None] = mapped_column(Text)
    follow_up_date: Mapped[str | None] = mapped_column(Date)
    follow_up_notes: Mapped[str | None] = mapped_column(Text)
    doctor_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Medicine(Base):
    __tablename__ = "medicines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    generic_name: Mapped[str | None] = mapped_column(String(200))
    category: Mapped[str | None] = mapped_column(String(100))
    unit: Mapped[str] = mapped_column(String(20))
    price_per_unit: Mapped[float] = mapped_column(Numeric(12, 0), default=0)
    current_stock: Mapped[int] = mapped_column(Integer, default=0, index=True)
    reorder_level: Mapped[int] = mapped_column(Integer, default=50)
    manufacturer: Mapped[str | None] = mapped_column(String(200))
    storage_conditions: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MedicineBatch(Base):
    __tablename__ = "medicine_batches"
    __table_args__ = (UniqueConstraint("medicine_id", "batch_number", name="uq_batch"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id"))
    batch_number: Mapped[str] = mapped_column(String(100))
    expiry_date: Mapped[str] = mapped_column(Date, index=True)
    import_quantity: Mapped[int] = mapped_column(Integer)
    remaining_quantity: Mapped[int] = mapped_column(Integer, index=True)
    reserved_quantity: Mapped[int] = mapped_column(Integer, default=0)
    import_unit_cost: Mapped[float] = mapped_column(Numeric(12, 0), default=0)
    supplier_name: Mapped[str | None] = mapped_column(String(200))
    imported_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    medical_record_id: Mapped[int] = mapped_column(ForeignKey("medical_records.id"), unique=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"))
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    status: Mapped[PrescriptionStatus] = mapped_column(Enum(PrescriptionStatus), default=PrescriptionStatus.pending)
    prepared_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    prepared_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    dispensed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    dispensed_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    picked_up_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    prescription_id: Mapped[int] = mapped_column(ForeignKey("prescriptions.id", ondelete="CASCADE"))
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    reserved_quantity: Mapped[int] = mapped_column(Integer, default=0)
    dispensed_quantity: Mapped[int] = mapped_column(Integer, default=0)
    dosage: Mapped[str] = mapped_column(String(100))
    frequency: Mapped[str] = mapped_column(String(100))
    duration_days: Mapped[int | None] = mapped_column(Integer)
    instruction: Mapped[str | None] = mapped_column(Text)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 0), default=0)


class PrescriptionItemAllocation(Base):
    __tablename__ = "prescription_item_allocations"
    __table_args__ = (UniqueConstraint("prescription_item_id", "batch_id", name="uq_item_batch"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    prescription_item_id: Mapped[int] = mapped_column(ForeignKey("prescription_items.id", ondelete="CASCADE"))
    batch_id: Mapped[int] = mapped_column(ForeignKey("medicine_batches.id"))
    reserved_quantity: Mapped[int] = mapped_column(Integer, default=0)
    dispensed_quantity: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), unique=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    cashier_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    invoice_number: Mapped[str] = mapped_column(String(20), unique=True)
    invoice_status: Mapped[InvoiceStatus] = mapped_column(Enum(InvoiceStatus), default=InvoiceStatus.draft)
    subtotal_amount: Mapped[float] = mapped_column(Numeric(12, 0), default=0)
    discount_amount: Mapped[float] = mapped_column(Numeric(12, 0), default=0)
    discount_reason: Mapped[str | None] = mapped_column(String(200))
    approved_discount_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    insurance_support_amount: Mapped[float] = mapped_column(Numeric(12, 0), default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 0), default=0)
    paid_amount: Mapped[float] = mapped_column(Numeric(12, 0), default=0)
    payment_status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.unpaid)
    credit_approved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    credit_approved_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    locked_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    paid_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"))
    item_type: Mapped[str] = mapped_column(String(20))
    reference_id: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 0), default=0)
    line_total: Mapped[float] = mapped_column(Numeric(12, 0), default=0)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"))
    transaction_type: Mapped[TransactionType] = mapped_column(Enum(TransactionType), default=TransactionType.payment)
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod))
    amount: Mapped[float] = mapped_column(Numeric(12, 0), default=0)
    transaction_ref: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[TransactionStatus] = mapped_column(Enum(TransactionStatus), default=TransactionStatus.success)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    paid_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InventoryLog(Base):
    __tablename__ = "inventory_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id"))
    batch_id: Mapped[int | None] = mapped_column(ForeignKey("medicine_batches.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    action: Mapped[InventoryAction] = mapped_column(Enum(InventoryAction))
    quantity_change: Mapped[int] = mapped_column(Integer)
    quantity_before: Mapped[int] = mapped_column(Integer)
    quantity_after: Mapped[int] = mapped_column(Integer)
    reference_id: Mapped[int | None] = mapped_column(Integer)
    reference_type: Mapped[str | None] = mapped_column(String(50))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), default=NotificationType.system)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    action_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AppointmentProposal(Base):
    __tablename__ = "appointment_proposals"
    __table_args__ = (UniqueConstraint("appointment_id", name="uq_appointment_proposal"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id", ondelete="CASCADE"), unique=True)
    proposed_date: Mapped[str] = mapped_column(Date)
    proposed_time: Mapped[str] = mapped_column(Time)
    note: Mapped[str] = mapped_column(Text)
    discount_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    discount_note: Mapped[str | None] = mapped_column(String(255))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    contact_name: Mapped[str | None] = mapped_column(String(150))
    phone: Mapped[str | None] = mapped_column(String(15))
    email: Mapped[str | None] = mapped_column(String(150))
    address: Mapped[str | None] = mapped_column(Text)
    tax_code: Mapped[str | None] = mapped_column(String(50))
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
