-- ============================================================
-- QLPK - Quản Lý Phòng Khám Da Liễu
-- MySQL 8.0+ — Full Schema
-- Chạy file này trong MySQL Workbench hoặc mysql CLI
-- ============================================================

-- Bước 1: Tạo database (bỏ qua nếu đã tồn tại)
CREATE DATABASE IF NOT EXISTS phong_kham_da_lieu
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE phong_kham_da_lieu;

-- ============================================================
-- 1. users — Tài khoản hệ thống
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email               VARCHAR(150)  NOT NULL,
    password            VARCHAR(255)  NOT NULL COMMENT 'bcrypt hash',
    role                ENUM('admin','doctor','receptionist','cashier','pharmacist','patient')
                        NOT NULL DEFAULT 'patient',
    full_name           VARCHAR(100)  NOT NULL,
    phone               VARCHAR(15)   NULL,
    avatar_url          VARCHAR(500)  NULL,
    is_active           TINYINT(1)    NOT NULL DEFAULT 1,
    email_verified_at   DATETIME      NULL,
    last_login          DATETIME      NULL,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. patients — Hồ sơ bệnh nhân
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
    id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id                 INT UNSIGNED NULL,
    patient_code            VARCHAR(20)  NOT NULL COMMENT 'Mã bệnh nhân duy nhất VD: BN-0001',
    created_source          ENUM('self_register','frontdesk','phone','admin')
                            NOT NULL DEFAULT 'self_register',
    date_of_birth           DATE         NULL,
    gender                  ENUM('male','female','other') NULL,
    blood_type              VARCHAR(5)   NULL COMMENT 'A+, A-, B+, B-, O+, O-, AB+, AB-',
    address                 TEXT         NULL,
    insurance_number        VARCHAR(50)  NULL COMMENT 'Số BHYT',
    insurance_expire        DATE         NULL,
    occupation              VARCHAR(100) NULL,
    emergency_contact_name  VARCHAR(100) NULL,
    emergency_contact_phone VARCHAR(15)  NULL,
    allergy_notes           TEXT         NULL COMMENT 'Ghi chú dị ứng thuốc',
    created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_id (user_id),
    UNIQUE KEY uq_patient_code (patient_code),
    INDEX idx_patient_code (patient_code),
    CONSTRAINT fk_patients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. doctors — Thông tin bác sĩ
-- ============================================================
CREATE TABLE IF NOT EXISTS doctors (
    id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id           INT UNSIGNED NOT NULL,
    specialty         VARCHAR(100) NOT NULL COMMENT 'Da liễu, Thẩm mỹ da...',
    license_number    VARCHAR(50)  NOT NULL COMMENT 'Số chứng chỉ hành nghề',
    degree            VARCHAR(100) NULL COMMENT 'Tiến sĩ, Thạc sĩ...',
    experience_years  INT UNSIGNED NOT NULL DEFAULT 0,
    consultation_fee  DECIMAL(12,0) NOT NULL DEFAULT 200000 COMMENT 'Phí khám (VNĐ)',
    bio               TEXT         NULL,
    is_available      TINYINT(1)   NOT NULL DEFAULT 1,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_doctor_user (user_id),
    UNIQUE KEY uq_license (license_number),
    CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. doctor_schedules — Lịch làm việc bác sĩ
-- ============================================================
CREATE TABLE IF NOT EXISTS doctor_schedules (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    doctor_id       INT UNSIGNED NOT NULL,
    day_of_week     TINYINT      NOT NULL COMMENT '0=CN, 1=T2, ..., 6=T7',
    start_time      TIME         NOT NULL,
    end_time        TIME         NOT NULL,
    slot_duration   INT          NOT NULL DEFAULT 30 COMMENT 'Phút/lượt khám',
    max_patients    INT          NOT NULL DEFAULT 20,
    is_active       TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_doctor_day (doctor_id, day_of_week, start_time),
    CONSTRAINT fk_schedules_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. doctor_leave — Ngày nghỉ đột xuất
-- ============================================================
CREATE TABLE IF NOT EXISTS doctor_leave (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    doctor_id   INT UNSIGNED NOT NULL,
    leave_date  DATE         NOT NULL,
    reason      VARCHAR(200) NULL,
    created_by  INT UNSIGNED NOT NULL COMMENT 'Admin/lễ tân ghi nhận',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_doc_date (doctor_id, leave_date),
    CONSTRAINT fk_leave_doctor  FOREIGN KEY (doctor_id)  REFERENCES doctors(id) ON DELETE CASCADE,
    CONSTRAINT fk_leave_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. clinic_holidays — Ngày lễ / phòng khám đóng cửa
-- ============================================================
CREATE TABLE IF NOT EXISTS clinic_holidays (
    id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    holiday_date DATE         NOT NULL,
    name         VARCHAR(100) NOT NULL COMMENT 'VD: Tết Nguyên Đán, 30/4...',
    is_active    TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_holiday_date (holiday_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. services — Dịch vụ khám
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name        VARCHAR(200) NOT NULL,
    category    VARCHAR(100) NULL COMMENT 'Điều trị mụn, Laser, Chăm sóc da...',
    description TEXT         NULL,
    price       DECIMAL(12,0) NOT NULL DEFAULT 0,
    duration    INT          NOT NULL DEFAULT 30 COMMENT 'Thời gian thực hiện (phút)',
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,
    image_url   VARCHAR(500) NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. appointments — Lịch hẹn
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
    id                              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id                      INT UNSIGNED NOT NULL,
    doctor_id                       INT UNSIGNED NOT NULL,
    primary_service_id              INT UNSIGNED NULL COMMENT 'Dịch vụ chính',
    visit_type                      ENUM('scheduled','walk_in','follow_up')
                                    NOT NULL DEFAULT 'scheduled',
    booking_source                  ENUM('patient_app','phone','frontdesk','admin')
                                    NOT NULL DEFAULT 'patient_app',
    appointment_date                DATE         NOT NULL,
    appointment_time                TIME         NOT NULL,
    duration_minutes                INT          NOT NULL DEFAULT 30,
    status                          ENUM('pending','confirmed','checked_in','in_progress',
                                         'completed','cancelled','no_show')
                                    NOT NULL DEFAULT 'pending',
    queue_number                    INT          NULL COMMENT 'Số thứ tự trong ngày',
    chief_complaint                 TEXT         NULL COMMENT 'Lý do khám / triệu chứng chính',
    cancel_reason                   TEXT         NULL,
    cancelled_by                    INT UNSIGNED NULL,
    cancelled_at                    DATETIME     NULL,
    confirmed_at                    DATETIME     NULL,
    checked_in_at                   DATETIME     NULL,
    started_at                      DATETIME     NULL,
    completed_at                    DATETIME     NULL,
    no_show_marked_at               DATETIME     NULL,
    rescheduled_from_id             INT UNSIGNED NULL COMMENT 'Lịch gốc nếu là lịch đổi',
    follow_up_from_appointment_id   INT UNSIGNED NULL COMMENT 'Lịch khám trước nếu là tái khám',
    reminder_24h_sent               TINYINT(1)   NOT NULL DEFAULT 0,
    reminder_2h_sent                TINYINT(1)   NOT NULL DEFAULT 0,
    notes                           TEXT         NULL COMMENT 'Ghi chú của lễ tân',
    created_at                      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_date_doctor   (appointment_date, doctor_id),
    INDEX idx_patient       (patient_id),
    INDEX idx_status        (status),
    CONSTRAINT fk_appt_patient         FOREIGN KEY (patient_id)                    REFERENCES patients(id),
    CONSTRAINT fk_appt_doctor          FOREIGN KEY (doctor_id)                     REFERENCES doctors(id),
    CONSTRAINT fk_appt_service         FOREIGN KEY (primary_service_id)            REFERENCES services(id),
    CONSTRAINT fk_appt_cancelled_by    FOREIGN KEY (cancelled_by)                  REFERENCES users(id),
    CONSTRAINT fk_appt_rescheduled     FOREIGN KEY (rescheduled_from_id)           REFERENCES appointments(id),
    CONSTRAINT fk_appt_follow_up       FOREIGN KEY (follow_up_from_appointment_id) REFERENCES appointments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. appointment_services — Dịch vụ thực hiện trong buổi khám
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_services (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    appointment_id  INT UNSIGNED NOT NULL,
    service_id      INT UNSIGNED NOT NULL,
    quantity        INT          NOT NULL DEFAULT 1,
    unit_price      DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT 'Snapshot giá tại thời điểm',
    added_by        INT UNSIGNED NOT NULL COMMENT 'user_id người thêm dịch vụ',
    added_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT         NULL,
    PRIMARY KEY (id),
    INDEX idx_appt_svc_appointment (appointment_id),
    CONSTRAINT fk_appt_svc_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_svc_service     FOREIGN KEY (service_id)     REFERENCES services(id),
    CONSTRAINT fk_appt_svc_added_by    FOREIGN KEY (added_by)       REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. medical_records — Hồ sơ bệnh án
-- ============================================================
CREATE TABLE IF NOT EXISTS medical_records (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    appointment_id      INT UNSIGNED NOT NULL,
    patient_id          INT UNSIGNED NOT NULL,
    doctor_id           INT UNSIGNED NOT NULL,
    symptoms            TEXT         NULL COMMENT 'Triệu chứng bệnh nhân mô tả',
    clinical_findings   TEXT         NULL COMMENT 'Kết quả thăm khám lâm sàng',
    diagnosis           VARCHAR(500) NOT NULL COMMENT 'Chẩn đoán bệnh',
    icd10_code          VARCHAR(20)  NULL COMMENT 'Mã ICD-10',
    treatment_plan      TEXT         NULL COMMENT 'Phác đồ điều trị',
    follow_up_date      DATE         NULL COMMENT 'Ngày tái khám',
    follow_up_notes     TEXT         NULL,
    doctor_notes        TEXT         NULL COMMENT 'Ghi chú riêng của bác sĩ',
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_appointment (appointment_id),
    INDEX idx_mr_patient (patient_id),
    INDEX idx_mr_created (created_at),
    CONSTRAINT fk_mr_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    CONSTRAINT fk_mr_patient     FOREIGN KEY (patient_id)     REFERENCES patients(id),
    CONSTRAINT fk_mr_doctor      FOREIGN KEY (doctor_id)      REFERENCES doctors(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. medicines — Danh mục thuốc
-- ============================================================
CREATE TABLE IF NOT EXISTS medicines (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name                VARCHAR(200) NOT NULL,
    generic_name        VARCHAR(200) NULL COMMENT 'Tên hoạt chất',
    category            VARCHAR(100) NULL COMMENT 'Kháng sinh, Corticoid, Kem bôi...',
    unit                VARCHAR(20)  NOT NULL COMMENT 'Viên, Lọ, Tuýp, ml...',
    price_per_unit      DECIMAL(12,0) NOT NULL DEFAULT 0,
    current_stock       INT          NOT NULL DEFAULT 0,
    reorder_level       INT          NOT NULL DEFAULT 50 COMMENT 'Cảnh báo khi tồn kho < mức này',
    manufacturer        VARCHAR(200) NULL,
    storage_conditions  VARCHAR(200) NULL,
    description         TEXT         NULL,
    is_active           TINYINT(1)   NOT NULL DEFAULT 1,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_med_name     (name),
    INDEX idx_med_category (category),
    INDEX idx_med_stock    (current_stock)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. medicine_batches — Lô nhập thuốc
-- ============================================================
CREATE TABLE IF NOT EXISTS medicine_batches (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    medicine_id         INT UNSIGNED NOT NULL,
    batch_number        VARCHAR(100) NOT NULL,
    expiry_date         DATE         NOT NULL,
    import_quantity     INT          NOT NULL,
    remaining_quantity  INT          NOT NULL,
    reserved_quantity   INT          NOT NULL DEFAULT 0 COMMENT 'Đã đặt chờ xuất',
    import_unit_cost    DECIMAL(12,0) NOT NULL DEFAULT 0,
    supplier_name       VARCHAR(200) NULL,
    imported_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active           TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_batch (medicine_id, batch_number),
    INDEX idx_batch_expiry    (expiry_date),
    INDEX idx_batch_remaining (remaining_quantity),
    CONSTRAINT fk_batch_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 13. prescriptions — Đơn thuốc
-- ============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    medical_record_id   INT UNSIGNED NOT NULL,
    doctor_id           INT UNSIGNED NOT NULL,
    patient_id          INT UNSIGNED NOT NULL,
    status              ENUM('pending','prepared','awaiting_payment',
                             'partially_dispensed','dispensed','cancelled')
                        NOT NULL DEFAULT 'pending',
    prepared_by         INT UNSIGNED NULL COMMENT 'Dược sĩ chuẩn bị thuốc',
    prepared_at         DATETIME     NULL,
    dispensed_by        INT UNSIGNED NULL COMMENT 'Dược sĩ xuất thuốc',
    dispensed_at        DATETIME     NULL,
    picked_up_at        DATETIME     NULL COMMENT 'Bệnh nhân đã nhận thuốc',
    notes               TEXT         NULL,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_medical_record (medical_record_id),
    CONSTRAINT fk_presc_mr          FOREIGN KEY (medical_record_id) REFERENCES medical_records(id),
    CONSTRAINT fk_presc_doctor      FOREIGN KEY (doctor_id)         REFERENCES doctors(id),
    CONSTRAINT fk_presc_patient     FOREIGN KEY (patient_id)        REFERENCES patients(id),
    CONSTRAINT fk_presc_prepared_by FOREIGN KEY (prepared_by)       REFERENCES users(id),
    CONSTRAINT fk_presc_dispensed   FOREIGN KEY (dispensed_by)      REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14. prescription_items — Chi tiết đơn thuốc
-- ============================================================
CREATE TABLE IF NOT EXISTS prescription_items (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    prescription_id     INT UNSIGNED NOT NULL,
    medicine_id         INT UNSIGNED NOT NULL,
    quantity            INT          NOT NULL COMMENT 'Số lượng kê',
    reserved_quantity   INT          NOT NULL DEFAULT 0 COMMENT 'Đã giữ kho',
    dispensed_quantity  INT          NOT NULL DEFAULT 0 COMMENT 'Đã giao thực tế',
    dosage              VARCHAR(100) NOT NULL COMMENT 'Liều dùng VD: 1 viên',
    frequency           VARCHAR(100) NOT NULL COMMENT 'Tần suất VD: 2 lần/ngày',
    duration_days       INT          NULL COMMENT 'Số ngày dùng',
    instruction         TEXT         NULL COMMENT 'Trước/sau ăn, cách dùng...',
    unit_price          DECIMAL(12,0) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_pi_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
    CONSTRAINT fk_pi_medicine     FOREIGN KEY (medicine_id)     REFERENCES medicines(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 15. prescription_item_allocations — Phân bổ lô thuốc cho từng dòng đơn
-- ============================================================
CREATE TABLE IF NOT EXISTS prescription_item_allocations (
    id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    prescription_item_id    INT UNSIGNED NOT NULL,
    batch_id                INT UNSIGNED NOT NULL,
    reserved_quantity       INT          NOT NULL DEFAULT 0,
    dispensed_quantity      INT          NOT NULL DEFAULT 0,
    created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_item_batch (prescription_item_id, batch_id),
    CONSTRAINT fk_pia_item  FOREIGN KEY (prescription_item_id) REFERENCES prescription_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_pia_batch FOREIGN KEY (batch_id)             REFERENCES medicine_batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 16. invoices — Hóa đơn
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    appointment_id          INT UNSIGNED NOT NULL,
    patient_id              INT UNSIGNED NOT NULL,
    cashier_id              INT UNSIGNED NULL COMMENT 'Thu ngân tạo hóa đơn',
    invoice_number          VARCHAR(20)  NOT NULL COMMENT 'PKD-2026-0001',
    invoice_status          ENUM('draft','issued','partially_paid','paid','cancelled','refunded')
                            NOT NULL DEFAULT 'draft',
    subtotal_amount         DECIMAL(12,0) NOT NULL DEFAULT 0,
    discount_amount         DECIMAL(12,0) NOT NULL DEFAULT 0,
    discount_reason         VARCHAR(200) NULL,
    approved_discount_by    INT UNSIGNED NULL COMMENT 'Người duyệt giảm giá',
    insurance_support_amount DECIMAL(12,0) NOT NULL DEFAULT 0 COMMENT 'Mức hỗ trợ BHYT nhập tay',
    total_amount            DECIMAL(12,0) NOT NULL DEFAULT 0,
    paid_amount             DECIMAL(12,0) NOT NULL DEFAULT 0,
    payment_status          ENUM('unpaid','awaiting_confirmation','partial','paid',
                                 'credit_approved','refunded')
                            NOT NULL DEFAULT 'unpaid',
    credit_approved_by      INT UNSIGNED NULL,
    credit_approved_at      DATETIME     NULL,
    locked_at               DATETIME     NULL,
    notes                   TEXT         NULL,
    paid_at                 DATETIME     NULL,
    created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_appointment     (appointment_id),
    UNIQUE KEY uq_invoice_number  (invoice_number),
    INDEX idx_inv_patient (patient_id),
    INDEX idx_inv_status  (payment_status),
    INDEX idx_inv_created (created_at),
    CONSTRAINT fk_inv_appointment      FOREIGN KEY (appointment_id)       REFERENCES appointments(id),
    CONSTRAINT fk_inv_patient          FOREIGN KEY (patient_id)           REFERENCES patients(id),
    CONSTRAINT fk_inv_cashier          FOREIGN KEY (cashier_id)           REFERENCES users(id),
    CONSTRAINT fk_inv_discount_approver FOREIGN KEY (approved_discount_by) REFERENCES users(id),
    CONSTRAINT fk_inv_credit_approver  FOREIGN KEY (credit_approved_by)   REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 17. invoice_items — Dòng chi tiết hóa đơn
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    invoice_id      INT UNSIGNED NOT NULL,
    item_type       VARCHAR(20)  NOT NULL COMMENT 'exam | service | medicine | other',
    reference_id    INT UNSIGNED NULL COMMENT 'service_id / prescription_item_id...',
    description     VARCHAR(255) NOT NULL,
    quantity        INT          NOT NULL DEFAULT 1,
    unit_price      DECIMAL(12,0) NOT NULL DEFAULT 0,
    line_total      DECIMAL(12,0) NOT NULL DEFAULT 0,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_ii_invoice (invoice_id),
    CONSTRAINT fk_ii_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 18. payment_transactions — Giao dịch thanh toán
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    invoice_id          INT UNSIGNED NOT NULL,
    transaction_type    ENUM('payment','refund') NOT NULL DEFAULT 'payment',
    payment_method      ENUM('cash','card','transfer','insurance_support','other') NOT NULL,
    amount              DECIMAL(12,0) NOT NULL DEFAULT 0,
    transaction_ref     VARCHAR(100) NULL COMMENT 'Mã giao dịch ngân hàng/POS',
    status              ENUM('pending','success','failed','cancelled') NOT NULL DEFAULT 'success',
    created_by          INT UNSIGNED NOT NULL,
    approved_by         INT UNSIGNED NULL COMMENT 'Duyệt hoàn tiền hoặc GD nhạy cảm',
    paid_at             DATETIME     NULL,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_pt_invoice (invoice_id),
    INDEX idx_pt_paid_at (paid_at),
    CONSTRAINT fk_pt_invoice     FOREIGN KEY (invoice_id)  REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_pt_created_by  FOREIGN KEY (created_by)  REFERENCES users(id),
    CONSTRAINT fk_pt_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 19. inventory_logs — Lịch sử xuất nhập kho
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_logs (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    medicine_id     INT UNSIGNED NOT NULL,
    batch_id        INT UNSIGNED NULL COMMENT 'Lô bị tác động',
    user_id         INT UNSIGNED NOT NULL COMMENT 'Người thực hiện',
    action          ENUM('import','export','adjust','expired','import_return') NOT NULL,
    quantity_change INT          NOT NULL COMMENT 'Dương = nhập, Âm = xuất',
    quantity_before INT          NOT NULL,
    quantity_after  INT          NOT NULL,
    reference_id    INT UNSIGNED NULL COMMENT 'prescription_id nếu xuất theo đơn',
    reference_type  VARCHAR(50)  NULL,
    notes           TEXT         NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_il_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id),
    CONSTRAINT fk_il_batch    FOREIGN KEY (batch_id)    REFERENCES medicine_batches(id),
    CONSTRAINT fk_il_user     FOREIGN KEY (user_id)     REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 20. notifications — Thông báo hệ thống
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED NOT NULL,
    title       VARCHAR(200) NOT NULL,
    message     TEXT         NOT NULL,
    type        ENUM('appointment','prescription','invoice','system','reminder')
                NOT NULL DEFAULT 'system',
    is_read     TINYINT(1)   NOT NULL DEFAULT 0,
    action_url  VARCHAR(500) NULL COMMENT 'Link đến trang liên quan',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_notif_user_unread (user_id, is_read),
    INDEX idx_notif_created     (created_at),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED DATA — Dữ liệu mặc định
-- ============================================================

-- Tài khoản admin mặc định (password: Admin@123 — bcrypt hash)
INSERT IGNORE INTO users (email, password, role, full_name, phone, is_active, email_verified_at)
VALUES (
    'admin@qlpk.vn',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',  -- Admin@123
    'admin',
    'Quản Trị Viên',
    '0900000000',
    1,
    NOW()
);

-- Ngày lễ mặc định năm 2026
INSERT IGNORE INTO clinic_holidays (holiday_date, name) VALUES
    ('2026-01-01', 'Tết Dương lịch'),
    ('2026-02-17', 'Tết Nguyên Đán (28 tháng Chạp)'),
    ('2026-02-18', 'Tết Nguyên Đán (29 tháng Chạp)'),
    ('2026-02-19', 'Tết Nguyên Đán (Mùng 1)'),
    ('2026-02-20', 'Tết Nguyên Đán (Mùng 2)'),
    ('2026-02-21', 'Tết Nguyên Đán (Mùng 3)'),
    ('2026-02-22', 'Tết Nguyên Đán (Mùng 4)'),
    ('2026-02-23', 'Tết Nguyên Đán (Mùng 5)'),
    ('2026-04-07', 'Giỗ Tổ Hùng Vương'),
    ('2026-04-30', 'Ngày Giải phóng miền Nam'),
    ('2026-05-01', 'Ngày Quốc tế Lao động'),
    ('2026-09-02', 'Ngày Quốc khánh');

-- Dịch vụ mẫu phòng khám da liễu
INSERT IGNORE INTO services (name, category, price, duration, description) VALUES
    ('Khám da liễu tổng quát', 'Khám tổng quát', 200000, 30, 'Khám và tư vấn các vấn đề về da liễu'),
    ('Điều trị mụn trứng cá', 'Điều trị mụn', 350000, 45, 'Điều trị mụn chuyên sâu, chiết xuất nhân mụn'),
    ('Laser trị nám, tàn nhang', 'Laser thẩm mỹ', 800000, 60, 'Laser Q-Switch trị nám, đốm nâu, tàn nhang'),
    ('Chăm sóc da cơ bản', 'Chăm sóc da', 250000, 60, 'Làm sạch sâu, dưỡng ẩm, bảo vệ da'),
    ('Điều trị viêm da cơ địa', 'Điều trị bệnh da', 300000, 30, 'Theo dõi và điều trị viêm da cơ địa, chàm'),
    ('Peel da hóa học', 'Thẩm mỹ da', 500000, 45, 'Chemical peel làm đều màu, trẻ hóa da'),
    ('Tiêm filler, botox', 'Thẩm mỹ tiêm', 1500000, 30, 'Tiêm filler và botox thẩm mỹ'),
    ('Xét nghiệm da liễu', 'Xét nghiệm', 150000, 20, 'Lấy mẫu và xét nghiệm các bệnh da liễu');

SELECT 'Schema QLPK đã khởi tạo thành công!' AS message;
