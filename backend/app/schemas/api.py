from datetime import date, datetime, time
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)
    phone: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None


class QuickPatientCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=8, max_length=15)
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None


class PatientUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None
    insurance_number: str | None = None
    allergy_notes: str | None = None
    occupation: str | None = None


class LinkUserPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class DoctorCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=8)
    phone: str | None = None
    specialty: str
    license_number: str
    degree: str | None = None
    experience_years: int = 0
    consultation_fee: float = 200000
    bio: str | None = None


class DoctorSchedulePayload(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    slot_duration: int = Field(default=30, ge=10)
    max_patients: int = Field(default=20, ge=1)


class DoctorLeavePayload(BaseModel):
    leave_date: date
    reason: str | None = None


class HolidayPayload(BaseModel):
    holiday_date: date
    name: str
    is_active: bool = True


class ServiceCreate(BaseModel):
    name: str
    category: str | None = None
    description: str | None = None
    price: float
    duration: int = 30
    image_url: str | None = None


class AppointmentCreate(BaseModel):
    patient_id: int | None = None
    doctor_id: int
    primary_service_id: int | None = None
    appointment_date: date
    appointment_time: time
    duration_minutes: int = 30
    chief_complaint: str | None = None
    notes: str | None = None
    booking_source: str = "patient_app"


class WalkInCreate(BaseModel):
    patient_id: int | None = None
    patient_name: str | None = None
    patient_phone: str | None = None
    doctor_id: int
    primary_service_id: int | None = None
    appointment_date: date
    appointment_time: time
    chief_complaint: str | None = None


class AppointmentServicePayload(BaseModel):
    service_id: int
    quantity: int = Field(default=1, ge=1)
    notes: str | None = None


class ReschedulePayload(BaseModel):
    appointment_date: date
    appointment_time: time
    reason: str | None = None


class FollowUpPayload(BaseModel):
    doctor_id: int | None = None
    appointment_date: date
    appointment_time: time
    notes: str | None = None


class MedicalRecordCreate(BaseModel):
    appointment_id: int
    patient_id: int
    doctor_id: int
    symptoms: str | None = None
    clinical_findings: str | None = None
    diagnosis: str
    icd10_code: str | None = None
    treatment_plan: str | None = None
    follow_up_date: date | None = None
    follow_up_notes: str | None = None
    doctor_notes: str | None = None


class MedicalRecordUpdate(BaseModel):
    symptoms: str | None = None
    clinical_findings: str | None = None
    diagnosis: str | None = None
    icd10_code: str | None = None
    treatment_plan: str | None = None
    follow_up_date: date | None = None
    follow_up_notes: str | None = None
    doctor_notes: str | None = None


class PrescriptionItemPayload(BaseModel):
    medicine_id: int
    quantity: int = Field(ge=1)
    dosage: str
    frequency: str
    duration_days: int | None = None
    instruction: str | None = None
    unit_price: float


class PrescriptionCreate(BaseModel):
    medical_record_id: int
    doctor_id: int
    patient_id: int
    notes: str | None = None
    items: list[PrescriptionItemPayload]


class MedicineCreate(BaseModel):
    name: str
    generic_name: str | None = None
    category: str | None = None
    unit: str
    price_per_unit: float
    reorder_level: int = 50
    manufacturer: str | None = None
    storage_conditions: str | None = None
    description: str | None = None


class MedicineBatchImport(BaseModel):
    batch_number: str
    expiry_date: date
    import_quantity: int = Field(ge=1)
    import_unit_cost: float = 0
    supplier_name: str | None = None


class InvoiceGeneratePayload(BaseModel):
    discount_amount: float = 0
    discount_reason: str | None = None
    insurance_support_amount: float = 0
    notes: str | None = None


class InvoicePayPayload(BaseModel):
    payment_method: str
    amount: float = Field(gt=0)
    transaction_ref: str | None = None
    notes: str | None = None


class RefundPayload(BaseModel):
    amount: float = Field(gt=0)
    reason: str


class ApproveCreditPayload(BaseModel):
    notes: str | None = None


class NotificationReadPayload(BaseModel):
    is_read: bool = True


class AppointmentView(ORMBase):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: date
    appointment_time: time
    status: str
    visit_type: str
    booking_source: str
    queue_number: int | None = None
    chief_complaint: str | None = None
    notes: str | None = None
    created_at: datetime


class NotificationView(ORMBase):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    action_url: str | None = None
    created_at: datetime

