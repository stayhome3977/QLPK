from datetime import date, datetime

import enum

from sqlalchemy import (
    TypeDecorator, String,
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


from sqlalchemy.types import TypeDecorator, String

class DBEnum(TypeDecorator):
    impl = String
    cache_ok = False

    def __init__(self, enum_cls, mapping=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.enum_cls = enum_cls
        self.mapping = mapping or {}
        # Keep first writer so ambiguous DB values (e.g. "quan_tri") resolve
        # deterministically to the primary app role (admin).
        self.reverse_mapping = {}
        for key, value in self.mapping.items():
            if value not in self.reverse_mapping:
                self.reverse_mapping[value] = key

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, self.enum_cls):
            value = value.value
        return self.mapping.get(value, value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        py_val = self.reverse_mapping.get(value, value)
        try:
            return self.enum_cls(py_val)
        except ValueError:
            return py_val


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
    __tablename__ = "tai_khoan"

    id: Mapped[int] = mapped_column("ma_tai_khoan", Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column("email", String(150), unique=True, index=True)
    password: Mapped[str] = mapped_column("mat_khau", String(255))
    role: Mapped[RoleEnum] = mapped_column("vai_tro", DBEnum(RoleEnum, {"admin": "quan_tri", "doctor": "bac_si", "receptionist": "quan_tri", "cashier": "quan_tri", "pharmacist": "duoc_si", "patient": "benh_nhan"}), default=RoleEnum.patient, nullable=False)
    full_name: Mapped[str] = mapped_column("ho_ten", String(100))
    phone: Mapped[str | None] = mapped_column("so_dien_thoai", String(15))
    avatar_url: Mapped[str | None] = mapped_column("anh_dai_dien", String(500))
    is_active: Mapped[bool] = mapped_column("dang_hoat_dong", Boolean, default=True)
    email_verified_at: Mapped[str | None] = mapped_column("email_xac_thuc_luc", DateTime(timezone=True))
    last_login: Mapped[str | None] = mapped_column("dang_nhap_cuoi_luc", DateTime(timezone=True))
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column("cap_nhat_luc", DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Patient(Base):
    __tablename__ = "benh_nhan"

    id: Mapped[int] = mapped_column("ma_benh_nhan", Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column("ma_tai_khoan", ForeignKey("tai_khoan.ma_tai_khoan", ondelete="CASCADE"), unique=True)
    patient_code: Mapped[str] = mapped_column("ma_benh_nhan_he_thong", String(20), unique=True, index=True)
    created_source: Mapped[PatientSource] = mapped_column("nguon_tao", DBEnum(PatientSource, {"self_register": "tu_dang_ky", "frontdesk": "quan_tri", "phone": "quan_tri", "admin": "quan_tri"}), default=PatientSource.self_register)
    date_of_birth: Mapped[str | None] = mapped_column("ngay_sinh", Date)
    gender: Mapped[GenderEnum | None] = mapped_column("gioi_tinh", DBEnum(GenderEnum, {"male": "nam", "female": "nu", "other": "khac"}))
    blood_type: Mapped[str | None] = mapped_column("nhom_mau", String(5))
    address: Mapped[str | None] = mapped_column("dia_chi", Text)
    insurance_number: Mapped[str | None] = mapped_column("so_bhyt", String(50))
    insurance_expire: Mapped[str | None] = mapped_column("han_bhyt", Date)
    occupation: Mapped[str | None] = mapped_column("nghe_nghiep", String(100))
    emergency_contact_name: Mapped[str | None] = mapped_column("nguoi_lien_he_khan_cap", String(100))
    emergency_contact_phone: Mapped[str | None] = mapped_column("so_dien_thoai_khan_cap", String(15))
    allergy_notes: Mapped[str | None] = mapped_column("ghi_chu_di_ung", Text)
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())


class Doctor(Base):
    __tablename__ = "bac_si"

    id: Mapped[int] = mapped_column("ma_bac_si", Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column("ma_tai_khoan", ForeignKey("tai_khoan.ma_tai_khoan", ondelete="CASCADE"), unique=True)
    specialty: Mapped[str] = mapped_column("chuyen_khoa", String(100))
    license_number: Mapped[str] = mapped_column("so_chung_chi_hanh_nghe", String(50), unique=True)
    degree: Mapped[str | None] = mapped_column("bang_cap", String(100))
    experience_years: Mapped[int] = mapped_column("so_nam_kinh_nghiem", Integer, default=0)
    consultation_fee: Mapped[float] = mapped_column("phi_kham", Numeric(12, 0), default=200000)
    bio: Mapped[str | None] = mapped_column("gioi_thieu", Text)
    is_available: Mapped[bool] = mapped_column("dang_nhan_kham", Boolean, default=True)
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())


class DoctorProfile(Base):
    __tablename__ = "ho_so_bac_si"

    id: Mapped[int] = mapped_column("ma_ho_so_bac_si", Integer, primary_key=True, autoincrement=True)
    doctor_id: Mapped[int] = mapped_column(
        "ma_bac_si",
        ForeignKey("bac_si.ma_bac_si", ondelete="CASCADE"),
        unique=True,
    )
    full_name: Mapped[str] = mapped_column("ho_ten", String(100))
    birth_date: Mapped[date | None] = mapped_column("ngay_sinh", Date, nullable=True)
    gender: Mapped[GenderEnum | None] = mapped_column(
        "gioi_tinh",
        DBEnum(GenderEnum, {"male": "nam", "female": "nu", "other": "khac"}),
        nullable=True,
    )
    address: Mapped[str | None] = mapped_column("dia_chi", Text)
    citizen_id: Mapped[str] = mapped_column("so_cccd", String(20))
    phone: Mapped[str | None] = mapped_column("so_dien_thoai", String(15))
    contact_email: Mapped[str | None] = mapped_column("email_lien_he", String(150))
    start_work_date: Mapped[date] = mapped_column("ngay_vao_lam", Date)
    contract_end_date: Mapped[date | None] = mapped_column("ngay_het_han_hop_dong", Date)
    contract_signatory: Mapped[str | None] = mapped_column("nguoi_ky_hop_dong", String(100))
    license_expiry_date: Mapped[date | None] = mapped_column("ngay_het_han_chung_chi", Date)
    position: Mapped[str | None] = mapped_column("vi_tri_cong_tac", String(100))
    notes: Mapped[str | None] = mapped_column("ghi_chu", Text)
    created_at: Mapped[datetime] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column("cap_nhat_luc", DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DoctorSchedule(Base):
    __tablename__ = "lich_lam_viec_bac_si"
    __table_args__ = (UniqueConstraint("ma_bac_si", "thu_trong_tuan", "gio_bat_dau", name="uq_doctor_day"),)

    id: Mapped[int] = mapped_column("ma_lich_lam_viec", Integer, primary_key=True)
    doctor_id: Mapped[int] = mapped_column("ma_bac_si", ForeignKey("bac_si.ma_bac_si", ondelete="CASCADE"))
    day_of_week: Mapped[int] = mapped_column("thu_trong_tuan", Integer)
    start_time: Mapped[str] = mapped_column("gio_bat_dau", Time)
    end_time: Mapped[str] = mapped_column("gio_ket_thuc", Time)
    slot_duration: Mapped[int] = mapped_column("thoi_luong_moi_ca_phut", Integer, default=30)
    max_patients: Mapped[int] = mapped_column("so_benh_nhan_toi_da", Integer, default=20)
    is_active: Mapped[bool] = mapped_column("dang_ap_dung", Boolean, default=True)
    managed_by: Mapped[int] = mapped_column("quan_ly_boi", ForeignKey("tai_khoan.ma_tai_khoan"))
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column("cap_nhat_luc", DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DoctorLeave(Base):
    __tablename__ = "ngay_nghi_bac_si"
    __table_args__ = (UniqueConstraint("ma_bac_si", "ngay_nghi", name="uq_doc_date"),)

    id: Mapped[int] = mapped_column("ma_ngay_nghi", Integer, primary_key=True)
    doctor_id: Mapped[int] = mapped_column("ma_bac_si", ForeignKey("bac_si.ma_bac_si", ondelete="CASCADE"))
    leave_date: Mapped[str] = mapped_column("ngay_nghi", Date)
    reason: Mapped[str | None] = mapped_column("ly_do", String(200))
    created_by: Mapped[int] = mapped_column("tao_boi", ForeignKey("tai_khoan.ma_tai_khoan"))
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())


class DoctorBusySlot(Base):
    __tablename__ = "khoang_ban_bac_si"

    id: Mapped[int] = mapped_column("ma_khoang_ban", Integer, primary_key=True)
    doctor_id: Mapped[int] = mapped_column("ma_bac_si", ForeignKey("bac_si.ma_bac_si", ondelete="CASCADE"))
    busy_date: Mapped[str] = mapped_column("ngay_ap_dung", Date)
    start_time: Mapped[str] = mapped_column("gio_bat_dau", Time)
    end_time: Mapped[str] = mapped_column("gio_ket_thuc", Time)
    reason: Mapped[str | None] = mapped_column("ly_do", String(255))
    created_by: Mapped[int] = mapped_column("tao_boi", ForeignKey("tai_khoan.ma_tai_khoan"))
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())


class ClinicHoliday(Base):
    __tablename__ = "ngay_nghi_phong_kham"

    id: Mapped[int] = mapped_column("ma_ngay_nghi_phong", Integer, primary_key=True)
    holiday_date: Mapped[str] = mapped_column("ngay_nghi", Date, unique=True)
    name: Mapped[str] = mapped_column("ten_ngay_nghi", String(100))
    is_active: Mapped[bool] = mapped_column("dang_ap_dung", Boolean, default=True)


class Service(Base):
    __tablename__ = "dich_vu"

    id: Mapped[int] = mapped_column("ma_dich_vu", Integer, primary_key=True)
    name: Mapped[str] = mapped_column("ten_dich_vu", String(200))
    category: Mapped[str | None] = mapped_column("nhom_dich_vu", String(100))
    description: Mapped[str | None] = mapped_column("mo_ta", Text)
    price: Mapped[float] = mapped_column("gia_dich_vu", Numeric(12, 0), default=0)
    duration: Mapped[int] = mapped_column("thoi_luong_phut", Integer, default=30)
    is_active: Mapped[bool] = mapped_column("dang_ap_dung", Boolean, default=True)
    image_url: Mapped[str | None] = mapped_column("hinh_anh", String(500))
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())


class Appointment(Base):
    __tablename__ = "lich_hen"

    id: Mapped[int] = mapped_column("ma_lich_hen", Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column("ma_benh_nhan", ForeignKey("benh_nhan.ma_benh_nhan"))
    doctor_id: Mapped[int] = mapped_column("ma_bac_si", ForeignKey("bac_si.ma_bac_si"))
    primary_service_id: Mapped[int | None] = mapped_column("ma_dich_vu_chinh", ForeignKey("dich_vu.ma_dich_vu"))
    visit_type: Mapped[VisitType] = mapped_column("loai_luot_kham", DBEnum(VisitType, {"scheduled": "dat_truoc", "walk_in": "dat_truoc", "follow_up": "tai_kham"}), default=VisitType.scheduled)
    booking_source: Mapped[BookingSource] = mapped_column("nguon_dat", DBEnum(BookingSource, {"patient_app": "ung_dung_benh_nhan", "phone": "quan_tri", "frontdesk": "quan_tri", "admin": "quan_tri"}), default=BookingSource.patient_app)
    appointment_date: Mapped[str] = mapped_column("ngay_kham", Date, index=True)
    appointment_time: Mapped[str] = mapped_column("gio_kham", Time)
    duration_minutes: Mapped[int] = mapped_column("thoi_luong_phut", Integer, default=30)
    status: Mapped[AppointmentStatus] = mapped_column("trang_thai", DBEnum(AppointmentStatus, {"pending": "cho_duyet", "confirmed": "da_xac_nhan", "checked_in": "da_den", "in_progress": "dang_kham", "completed": "hoan_tat", "cancelled": "da_huy", "no_show": "vang_mat"}), default=AppointmentStatus.pending, index=True)
    queue_number: Mapped[int | None] = mapped_column("so_thu_tu", Integer)
    chief_complaint: Mapped[str | None] = mapped_column("ly_do_kham", Text)
    cancel_reason: Mapped[str | None] = mapped_column("ly_do_huy", Text)
    cancelled_by: Mapped[int | None] = mapped_column("huy_boi", ForeignKey("tai_khoan.ma_tai_khoan"))
    cancelled_at: Mapped[str | None] = mapped_column("huy_luc", DateTime(timezone=True))
    confirmed_at: Mapped[str | None] = mapped_column("xac_nhan_luc", DateTime(timezone=True))
    checked_in_at: Mapped[str | None] = mapped_column("da_den_luc", DateTime(timezone=True))
    started_at: Mapped[str | None] = mapped_column("bat_dau_kham_luc", DateTime(timezone=True))
    completed_at: Mapped[str | None] = mapped_column("hoan_tat_luc", DateTime(timezone=True))
    no_show_marked_at: Mapped[str | None] = mapped_column("danh_dau_vang_mat_luc", DateTime(timezone=True))
    rescheduled_from_id: Mapped[int | None] = mapped_column("doi_tu_lich_hen", ForeignKey("lich_hen.ma_lich_hen"))
    follow_up_from_appointment_id: Mapped[int | None] = mapped_column("tai_kham_tu_lich_hen", ForeignKey("lich_hen.ma_lich_hen"))
    proposed_date: Mapped[str | None] = mapped_column("ngay_de_xuat_moi", Date)
    proposed_time: Mapped[str | None] = mapped_column("gio_de_xuat_moi", Time)
    discount_percent: Mapped[float] = mapped_column("phan_tram_uu_dai", Numeric(5, 2), default=0)
    discount_note: Mapped[str | None] = mapped_column("ghi_chu_uu_dai", String(255))
    reminder_24h_sent: Mapped[bool] = mapped_column("gui_nhac_24h", Boolean, default=False)
    reminder_2h_sent: Mapped[bool] = mapped_column("gui_nhac_2h", Boolean, default=False)
    notes: Mapped[str | None] = mapped_column("ghi_chu_chung", Text)
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column("cap_nhat_luc", DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AppointmentService(Base):
    __tablename__ = "dich_vu_lich_hen"

    id: Mapped[int] = mapped_column("ma_dich_vu_lich_hen", Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column("ma_lich_hen", ForeignKey("lich_hen.ma_lich_hen", ondelete="CASCADE"), index=True)
    service_id: Mapped[int] = mapped_column("ma_dich_vu", ForeignKey("dich_vu.ma_dich_vu"))
    quantity: Mapped[int] = mapped_column("so_luong", Integer, default=1)
    unit_price: Mapped[float] = mapped_column("don_gia", Numeric(12, 0), default=0)
    added_by: Mapped[int] = mapped_column("them_boi", ForeignKey("tai_khoan.ma_tai_khoan"))
    added_at: Mapped[str] = mapped_column("them_luc", DateTime(timezone=True), server_default=func.now())
    notes: Mapped[str | None] = mapped_column("ghi_chu", Text)


class MedicalRecord(Base):
    __tablename__ = "ho_so_benh_an"

    id: Mapped[int] = mapped_column("ma_ho_so_benh_an", Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column("ma_lich_hen", ForeignKey("lich_hen.ma_lich_hen"), unique=True)
    patient_id: Mapped[int] = mapped_column("ma_benh_nhan", ForeignKey("benh_nhan.ma_benh_nhan"))
    doctor_id: Mapped[int] = mapped_column("ma_bac_si", ForeignKey("bac_si.ma_bac_si"))
    symptoms: Mapped[str | None] = mapped_column("trieu_chung", Text)
    clinical_findings: Mapped[str | None] = mapped_column("ket_qua_tham_kham", Text)
    diagnosis: Mapped[str] = mapped_column("chan_doan", String(500))
    icd10_code: Mapped[str | None] = mapped_column("ma_icd10", String(20))
    treatment_plan: Mapped[str | None] = mapped_column("phac_do_dieu_tri", Text)
    follow_up_date: Mapped[str | None] = mapped_column("ngay_tai_kham", Date)
    follow_up_notes: Mapped[str | None] = mapped_column("ghi_chu_tai_kham", Text)
    doctor_notes: Mapped[str | None] = mapped_column("ghi_chu_bac_si", Text)
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column("cap_nhat_luc", DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Medicine(Base):
    __tablename__ = "thuoc"

    id: Mapped[int] = mapped_column("ma_thuoc", Integer, primary_key=True)
    name: Mapped[str] = mapped_column("ten_thuoc", String(200), index=True)
    generic_name: Mapped[str | None] = mapped_column("ten_hoat_chat", String(200))
    category: Mapped[str | None] = mapped_column("nhom_thuoc", String(100))
    unit: Mapped[str] = mapped_column("don_vi_tinh", String(20))
    price_per_unit: Mapped[float] = mapped_column("gia_ban_don_vi", Numeric(12, 0), default=0)
    current_stock: Mapped[int] = mapped_column("ton_kho_hien_tai", Integer, default=0, index=True)
    reorder_level: Mapped[int] = mapped_column("muc_canh_bao_ton_kho", Integer, default=50)
    manufacturer: Mapped[str | None] = mapped_column("hang_san_xuat", String(200))
    storage_conditions: Mapped[str | None] = mapped_column("dieu_kien_bao_quan", String(200))
    description: Mapped[str | None] = mapped_column("mo_ta", Text)
    is_active: Mapped[bool] = mapped_column("dang_ap_dung", Boolean, default=True)
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column("cap_nhat_luc", DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MedicineBatch(Base):
    __tablename__ = "lo_thuoc"
    __table_args__ = (UniqueConstraint("ma_thuoc", "so_lo", name="uq_batch"),)

    id: Mapped[int] = mapped_column("ma_lo_thuoc", Integer, primary_key=True)
    medicine_id: Mapped[int] = mapped_column("ma_thuoc", ForeignKey("thuoc.ma_thuoc"))
    batch_number: Mapped[str] = mapped_column("so_lo", String(100))
    expiry_date: Mapped[str] = mapped_column("han_su_dung", Date, index=True)
    import_quantity: Mapped[int] = mapped_column("so_luong_nhap", Integer)
    remaining_quantity: Mapped[int] = mapped_column("so_luong_con_lai", Integer, index=True)
    reserved_quantity: Mapped[int] = mapped_column("so_luong_giu_cho", Integer, default=0)
    import_unit_cost: Mapped[float] = mapped_column("gia_nhap_don_vi", Numeric(12, 0), default=0)
    supplier_id: Mapped[int] = mapped_column("ma_nha_cung_cap", ForeignKey("nha_cung_cap.ma_nha_cung_cap"))
    imported_at: Mapped[str] = mapped_column("nhap_luc", DateTime(timezone=True), server_default=func.now())
    is_active: Mapped[bool] = mapped_column("dang_ap_dung", Boolean, default=True)


class Prescription(Base):
    __tablename__ = "don_thuoc"

    id: Mapped[int] = mapped_column("ma_don_thuoc", Integer, primary_key=True)
    medical_record_id: Mapped[int] = mapped_column("ma_ho_so_benh_an", ForeignKey("ho_so_benh_an.ma_ho_so_benh_an"), unique=True)
    doctor_id: Mapped[int] = mapped_column("ma_bac_si", ForeignKey("bac_si.ma_bac_si"))
    patient_id: Mapped[int] = mapped_column("ma_benh_nhan", ForeignKey("benh_nhan.ma_benh_nhan"))
    status: Mapped[PrescriptionStatus] = mapped_column("trang_thai", DBEnum(PrescriptionStatus, {"pending": "cho_xu_ly", "prepared": "da_chuan_bi", "awaiting_payment": "cho_thanh_toan", "partially_dispensed": "giao_mot_phan", "dispensed": "da_giao", "cancelled": "da_huy"}), default=PrescriptionStatus.pending)
    prepared_by: Mapped[int | None] = mapped_column("chuan_bi_boi", ForeignKey("tai_khoan.ma_tai_khoan"))
    prepared_at: Mapped[str | None] = mapped_column("chuan_bi_luc", DateTime(timezone=True))
    dispensed_by: Mapped[int | None] = mapped_column("giao_boi", ForeignKey("tai_khoan.ma_tai_khoan"))
    dispensed_at: Mapped[str | None] = mapped_column("giao_luc", DateTime(timezone=True))
    picked_up_at: Mapped[str | None] = mapped_column("nhan_thuoc_luc", DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column("ghi_chu", Text)
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())


class PrescriptionItem(Base):
    __tablename__ = "chi_tiet_don_thuoc"

    id: Mapped[int] = mapped_column("ma_chi_tiet_don_thuoc", Integer, primary_key=True)
    prescription_id: Mapped[int] = mapped_column("ma_don_thuoc", ForeignKey("don_thuoc.ma_don_thuoc", ondelete="CASCADE"))
    medicine_id: Mapped[int] = mapped_column("ma_thuoc", ForeignKey("thuoc.ma_thuoc"))
    quantity: Mapped[int] = mapped_column("so_luong_ke", Integer)
    reserved_quantity: Mapped[int] = mapped_column("so_luong_giu_cho", Integer, default=0)
    dispensed_quantity: Mapped[int] = mapped_column("so_luong_giao", Integer, default=0)
    dosage: Mapped[str] = mapped_column("lieu_dung", String(100))
    frequency: Mapped[str] = mapped_column("tan_suat", String(100))
    duration_days: Mapped[int | None] = mapped_column("so_ngay_dung", Integer)
    instruction: Mapped[str | None] = mapped_column("huong_dan_su_dung", Text)
    unit_price: Mapped[float] = mapped_column("don_gia", Numeric(12, 0), default=0)


class PrescriptionItemAllocation(Base):
    __tablename__ = "phan_bo_lo_don_thuoc"
    __table_args__ = (UniqueConstraint("ma_chi_tiet_don_thuoc", "ma_lo_thuoc", name="uq_item_batch"),)

    id: Mapped[int] = mapped_column("ma_phan_bo", Integer, primary_key=True)
    prescription_item_id: Mapped[int] = mapped_column("ma_chi_tiet_don_thuoc", ForeignKey("chi_tiet_don_thuoc.ma_chi_tiet_don_thuoc", ondelete="CASCADE"))
    batch_id: Mapped[int] = mapped_column("ma_lo_thuoc", ForeignKey("lo_thuoc.ma_lo_thuoc"))
    reserved_quantity: Mapped[int] = mapped_column("so_luong_giu_cho", Integer, default=0)
    dispensed_quantity: Mapped[int] = mapped_column("so_luong_giao", Integer, default=0)
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())


class Invoice(Base):
    __tablename__ = "hoa_don"

    id: Mapped[int] = mapped_column("ma_hoa_don", Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column("ma_lich_hen", ForeignKey("lich_hen.ma_lich_hen"), unique=True)
    patient_id: Mapped[int] = mapped_column("ma_benh_nhan", ForeignKey("benh_nhan.ma_benh_nhan"))
    cashier_id: Mapped[int | None] = mapped_column("ma_duoc_si", ForeignKey("tai_khoan.ma_tai_khoan"))
    invoice_number: Mapped[str] = mapped_column("so_hoa_don", String(20), unique=True)
    invoice_status: Mapped[InvoiceStatus] = mapped_column("trang_thai_hoa_don", DBEnum(InvoiceStatus, {"draft": "nhap", "issued": "da_lap", "partially_paid": "thanh_toan_mot_phan", "paid": "da_thanh_toan", "cancelled": "da_huy", "refunded": "da_hoan_tien"}), default=InvoiceStatus.draft)
    subtotal_amount: Mapped[float] = mapped_column("tam_tinh", Numeric(12, 0), default=0)
    discount_amount: Mapped[float] = mapped_column("so_tien_giam", Numeric(12, 0), default=0)
    discount_reason: Mapped[str | None] = mapped_column("ly_do_giam", String(200))
    approved_discount_by: Mapped[int | None] = mapped_column("duyet_giam_gia_boi", ForeignKey("tai_khoan.ma_tai_khoan"))
    insurance_support_amount: Mapped[float] = mapped_column("so_tien_ho_tro", Numeric(12, 0), default=0)
    total_amount: Mapped[float] = mapped_column("tong_thanh_toan", Numeric(12, 0), default=0)
    paid_amount: Mapped[float] = mapped_column("da_thu", Numeric(12, 0), default=0)
    payment_status: Mapped[PaymentStatus] = mapped_column("trang_thai_thanh_toan", DBEnum(PaymentStatus, {"unpaid": "chua_thanh_toan", "awaiting_confirmation": "chua_thanh_toan", "partial": "thanh_toan_mot_phan", "paid": "da_thanh_toan", "credit_approved": "da_thanh_toan", "refunded": "da_hoan_tien"}), default=PaymentStatus.unpaid)
    notes: Mapped[str | None] = mapped_column("ghi_chu", Text)
    paid_at: Mapped[str | None] = mapped_column("thanh_toan_luc", DateTime(timezone=True))
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())


class InvoiceItem(Base):
    __tablename__ = "chi_tiet_hoa_don"

    id: Mapped[int] = mapped_column("ma_chi_tiet_hoa_don", Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column("ma_hoa_don", ForeignKey("hoa_don.ma_hoa_don", ondelete="CASCADE"))
    item_type: Mapped[str] = mapped_column("loai_muc", String(20))
    reference_id: Mapped[int | None] = mapped_column("ma_tham_chieu", Integer)
    description: Mapped[str] = mapped_column("dien_giai", String(255))
    quantity: Mapped[int] = mapped_column("so_luong", Integer, default=1)
    unit_price: Mapped[float] = mapped_column("don_gia", Numeric(12, 0), default=0)
    line_total: Mapped[float] = mapped_column("thanh_tien", Numeric(12, 0), default=0)
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())


class PaymentTransaction(Base):
    __tablename__ = "giao_dich_thanh_toan"

    id: Mapped[int] = mapped_column("ma_giao_dich", Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column("ma_hoa_don", ForeignKey("hoa_don.ma_hoa_don", ondelete="CASCADE"))
    transaction_type: Mapped[TransactionType] = mapped_column("loai_giao_dich", DBEnum(TransactionType, {"payment": "thu_tien", "refund": "hoan_tien"}), default=TransactionType.payment)
    payment_method: Mapped[PaymentMethod] = mapped_column("phuong_thuc", DBEnum(PaymentMethod, {"cash": "tien_mat", "card": "the", "transfer": "chuyen_khoan", "insurance_support": "ho_tro_noi_bo", "other": "khac"}))
    amount: Mapped[float] = mapped_column("so_tien", Numeric(12, 0), default=0)
    transaction_ref: Mapped[str | None] = mapped_column("ma_tham_chieu_giao_dich", String(100))
    status: Mapped[TransactionStatus] = mapped_column("trang_thai", DBEnum(TransactionStatus, {"pending": "cho_xu_ly", "success": "thanh_cong", "failed": "that_bai", "cancelled": "da_huy"}), default=TransactionStatus.success)
    created_by: Mapped[int] = mapped_column("tao_boi", ForeignKey("tai_khoan.ma_tai_khoan"))
    approved_by: Mapped[int | None] = mapped_column("duyet_boi", ForeignKey("tai_khoan.ma_tai_khoan"))
    paid_at: Mapped[str | None] = mapped_column("thanh_toan_luc", DateTime(timezone=True))
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())


class InventoryLog(Base):
    __tablename__ = "nhat_ky_kho"

    id: Mapped[int] = mapped_column("ma_nhat_ky_kho", Integer, primary_key=True)
    medicine_id: Mapped[int] = mapped_column("ma_thuoc", ForeignKey("thuoc.ma_thuoc"))
    batch_id: Mapped[int | None] = mapped_column("ma_lo_thuoc", ForeignKey("lo_thuoc.ma_lo_thuoc"))
    user_id: Mapped[int] = mapped_column("ma_tai_khoan", ForeignKey("tai_khoan.ma_tai_khoan"))
    action: Mapped[InventoryAction] = mapped_column("hanh_dong", DBEnum(InventoryAction, {"import_": "nhap", "export": "xuat", "adjust": "dieu_chinh", "expired": "het_han", "import_return": "tra_hang_nhap"}))
    quantity_change: Mapped[int] = mapped_column("so_luong_thay_doi", Integer)
    quantity_before: Mapped[int] = mapped_column("so_luong_truoc", Integer)
    quantity_after: Mapped[int] = mapped_column("so_luong_sau", Integer)
    reference_id: Mapped[int | None] = mapped_column("ma_tham_chieu", Integer)
    reference_type: Mapped[str | None] = mapped_column("loai_tham_chieu", String(50))
    notes: Mapped[str | None] = mapped_column("ghi_chu", Text)
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "thong_bao"

    id: Mapped[int] = mapped_column("ma_thong_bao", Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column("ma_tai_khoan", ForeignKey("tai_khoan.ma_tai_khoan", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column("tieu_de", String(200))
    message: Mapped[str] = mapped_column("noi_dung", Text)
    type: Mapped[NotificationType] = mapped_column("loai_thong_bao", DBEnum(NotificationType, {"appointment": "lich_hen", "prescription": "don_thuoc", "invoice": "hoa_don", "system": "he_thong", "reminder": "nhac_hen"}), default=NotificationType.system)
    is_read: Mapped[bool] = mapped_column("da_doc", Boolean, default=False)
    action_url: Mapped[str | None] = mapped_column("duong_dan_hanh_dong", String(500))
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())


class Supplier(Base):
    __tablename__ = "nha_cung_cap"

    id: Mapped[int] = mapped_column("ma_nha_cung_cap", Integer, primary_key=True)
    name: Mapped[str] = mapped_column("ten_nha_cung_cap", String(200), unique=True)
    contact_name: Mapped[str | None] = mapped_column("nguoi_lien_he", String(150))
    phone: Mapped[str | None] = mapped_column("so_dien_thoai", String(15))
    email: Mapped[str | None] = mapped_column("email", String(150))
    address: Mapped[str | None] = mapped_column("dia_chi", Text)
    tax_code: Mapped[str | None] = mapped_column("ma_so_thue", String(50))
    notes: Mapped[str | None] = mapped_column("ghi_chu", Text)
    is_active: Mapped[bool] = mapped_column("dang_hop_tac", Boolean, default=True)
    created_at: Mapped[str] = mapped_column("tao_luc", DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column("cap_nhat_luc", DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


