from datetime import date, datetime, time
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
import re

# NOTE: lookahead not supported in pydantic-core (Rust regex engine)
# Password validation is done in field_validator instead
PHONE_PATTERN = r"^(0|\+84)\d{9,10}$"


def _validate_password(v: str) -> str:
    """Validate password: just need to be non-empty."""
    if len(v) == 0:
        raise ValueError("Mật khẩu không được để trống")
    return v


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=1)
    phone: str | None = Field(default=None, min_length=10, max_length=15)
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v is None:
            return v
        # Allow various phone formats
        if not re.match(r'^[0-9+\-\s()]+$', v):
            raise ValueError('Số điện thoại không hợp lệ')
        return v
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        return _validate_password(v)


class PatientUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=100)
    phone: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None
    insurance_number: str | None = None
    allergy_notes: str | None = None
    occupation: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None

    @field_validator("full_name", "phone", "emergency_contact_phone", mode="before")
    @classmethod
    def empty_string_to_none(cls, v):
        if v == "":
            return None
        return v

    @field_validator("phone", "emergency_contact_phone", mode="before")
    @classmethod
    def validate_phone(cls, v):
        if v is None or v == "":
            return None
        if not re.match(PHONE_PATTERN, v):
            raise ValueError("Số điện thoại không hợp lệ. Phải bắt đầu bằng 0 hoặc +84 và có 9-10 số tiếp theo.")
        return v

    @field_validator("date_of_birth", mode="before")
    @classmethod
    def empty_date_to_none(cls, v: Any) -> Any:
        if v == "" or v is None:
            return None
        return v


class QuickPatientCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    phone: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v):
        if v is None or v == "":
            return None
        if not re.match(PHONE_PATTERN, v):
            raise ValueError("Số điện thoại không hợp lệ. Phải bắt đầu bằng 0 hoặc +84 và có 9-10 số tiếp theo.")
        return v


class LinkUserPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password(v)


class AdminAccountCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=1)
    phone: str | None = None
    specialty: str | None = None
    license_number: str | None = None
    degree: str | None = None
    experience_years: int | None = None
    consultation_fee: float | None = None
    bio: str | None = None

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v):
        if v is None or v == "":
            return None
        if not re.match(PHONE_PATTERN, v):
            raise ValueError("Số điện thoại không hợp lệ. Phải bắt đầu bằng 0 hoặc +84 và có 9-10 số tiếp theo.")
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password(v)


class DoctorCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=1)
    phone: str | None = None
    specialty: str
    license_number: str
    degree: str | None = None
    experience_years: int | None = None
    consultation_fee: float | None = None
    bio: str | None = None

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v):
        if v is None or v == "":
            return None
        if not re.match(PHONE_PATTERN, v):
            raise ValueError("Số điện thoại không hợp lệ. Phải bắt đầu bằng 0 hoặc +84 và có 9-10 số tiếp theo.")
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password(v)


class ResetPasswordPayload(BaseModel):
    new_password: str = Field(min_length=1)

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password(v)


class DoctorSchedulePayload(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    slot_duration: int = Field(default=30, ge=10)
    max_patients: int = Field(default=20, ge=1)


# ============================================================
# DEPRECATED - DoctorBusySlot functionality removed
# ============================================================

# class DoctorBusySlotPayload(BaseModel):
#     busy_date: date
#     start_time: time
#     end_time: time
#     reason: str | None = None


class DoctorLeavePayload(BaseModel):
    leave_date: date
    reason: str | None = None


class HolidayPayload(BaseModel):
    holiday_date: date
    name: str
    is_active: bool = True


class DoctorProfilePayload(BaseModel):
    doctor_id: int
    ho_ten: str = Field(min_length=1, max_length=100)
    ngay_sinh: date | None = None
    gioi_tinh: str | None = None
    dia_chi: str | None = None
    so_cccd: str = Field(min_length=2, max_length=20)
    so_dien_thoai: str | None = Field(default=None, max_length=15)
    email_lien_he: str | None = Field(default=None, max_length=150)
    ngay_vao_lam: date
    ngay_het_han_hop_dong: date | None = None
    nguoi_ky_hop_dong: str | None = Field(default=None, max_length=100)
    ngay_het_han_chung_chi: date | None = None
    vi_tri_cong_tac: str | None = Field(default=None, max_length=100)
    ghi_chu: str | None = None


class ServiceCreate(BaseModel):
    name: str
    category: str | None = None
    description: str | None = None
    price: float = Field(ge=0)
    duration: int = Field(default=30, ge=10)
    image_url: str | None = None


class AppointmentCreate(BaseModel):
    patient_id: int | None = None
    doctor_id: int
    primary_service_id: int | None = None
    service_ids: list[int] = Field(default_factory=list)
    appointment_date: date
    appointment_time: time
    duration_minutes: int = Field(default=30, ge=10)
    chief_complaint: str | None = None
    notes: str | None = None


class WalkInCreate(BaseModel):
    patient_id: int | None = None
    patient_name: str | None = None
    patient_phone: str | None = None
    doctor_id: int
    primary_service_id: int | None = None
    appointment_date: date
    appointment_time: time
    chief_complaint: str | None = None

    @field_validator("patient_phone", mode="before")
    @classmethod
    def validate_phone(cls, v):
        if v is None or v == "":
            return None
        if not re.match(PHONE_PATTERN, v):
            raise ValueError("Số điện thoại không hợp lệ. Phải bắt đầu bằng 0 hoặc +84 và có 9-10 số tiếp theo.")
        return v


class AppointmentServicePayload(BaseModel):
    service_id: int
    quantity: int = Field(default=1, ge=1)
    notes: str | None = None


class AppointmentApprovalPayload(BaseModel):
    note: str | None = None


class RescheduleProposalPayload(BaseModel):
    proposed_date: date
    proposed_time: time
    note: str = Field(min_length=5, max_length=500)
    discount_percent: float = Field(default=0, ge=0, le=100)
    discount_note: str | None = None


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
    diagnosis: str = Field(min_length=3, max_length=500)
    icd10_code: str | None = None
    treatment_plan: str | None = None
    follow_up_date: date | None = None
    follow_up_notes: str | None = None
    doctor_notes: str | None = None


class MedicalRecordUpdate(BaseModel):
    symptoms: str | None = None
    clinical_findings: str | None = None
    diagnosis: str | None = Field(default=None, min_length=3, max_length=500)
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
    duration_days: int | None = Field(default=None, ge=1)
    instruction: str | None = None
    unit_price: float = Field(ge=0)


class PrescriptionCreate(BaseModel):
    medical_record_id: int
    doctor_id: int
    patient_id: int
    notes: str | None = None
    items: list[PrescriptionItemPayload]


class SupplierCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    contact_name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    notes: str | None = None

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v):
        if v is None or v == "" or v == 'null':
            return None
        if not re.match(PHONE_PATTERN, v):
            raise ValueError("Số điện thoại không hợp lệ. Phải bắt đầu bằng 0 hoặc +84 và có 9-10 số tiếp theo.")
        return v


class MedicineCreate(BaseModel):
    name: str
    generic_name: str | None = None
    category: str | None = None
    unit: str
    price_per_unit: float = Field(ge=0)
    reorder_level: int = Field(default=50, ge=0)
    manufacturer: str | None = None
    storage_conditions: str | None = None
    description: str | None = None


class MedicineBatchImport(BaseModel):
    import_quantity: int = Field(ge=1)
    supplier_id: int | None = None
    notes: str | None = None


class InvoiceGeneratePayload(BaseModel):
    discount_amount: float = Field(default=0, ge=0)
    discount_reason: str | None = None
    insurance_support_amount: float = Field(default=0, ge=0)
    notes: str | None = None


class InvoicePayPayload(BaseModel):
    payment_method: str
    amount: float = Field(gt=0)
    transaction_ref: str | None = None
    notes: str | None = None


class PrescriptionCheckoutPayload(BaseModel):
    payment_method: str | None = None


class RefundPayload(BaseModel):
    amount: float = Field(gt=0)
    reason: str


class ApproveCreditPayload(BaseModel):
    notes: str | None = None


class AppointmentView(ORMBase):
    id: int
    patient_id: int
    patient_name: str | None = None
    doctor_id: int
    doctor_name: str | None = None
    appointment_date: date
    appointment_time: time
    duration_minutes: int | None = None
    status: str
    visit_type: str
    booking_source: str
    queue_number: int | None = None
    chief_complaint: str | None = None
    notes: str | None = None
    proposal: dict[str, Any] | None = None
    services: list[dict[str, Any]] | None = None
    medical_record: dict[str, Any] | None = None
    prescription: dict[str, Any] | None = None
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
