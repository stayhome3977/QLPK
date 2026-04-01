-- ============================================================
-- QLPK - Quan ly phong kham da lieu
-- MySQL 8.0+
-- Ban luoc do da duoc Viet hoa theo kieu khong dau
-- ============================================================

CREATE DATABASE IF NOT EXISTS phong_kham_da_lieu
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE phong_kham_da_lieu;

-- ============================================================
-- 1. tai_khoan - Tai khoan he thong
-- ============================================================
CREATE TABLE IF NOT EXISTS tai_khoan (
    ma_tai_khoan            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email                   VARCHAR(150) NOT NULL,
    mat_khau                VARCHAR(255) NOT NULL COMMENT 'Chuoi bam bcrypt',
    vai_tro                 ENUM('quan_tri','bac_si','duoc_si','benh_nhan')
                            NOT NULL DEFAULT 'benh_nhan',
    ho_ten                  VARCHAR(100) NOT NULL,
    so_dien_thoai           VARCHAR(15) NULL,
    anh_dai_dien            VARCHAR(500) NULL,
    dang_hoat_dong          TINYINT(1) NOT NULL DEFAULT 1,
    email_xac_thuc_luc      DATETIME NULL,
    dang_nhap_cuoi_luc      DATETIME NULL,
    tao_boi                 INT UNSIGNED NULL COMMENT 'Tai khoan quan tri tao tai khoan nay',
    dat_lai_mat_khau_boi    INT UNSIGNED NULL COMMENT 'Tai khoan quan tri dat lai mat khau',
    dat_lai_mat_khau_luc    DATETIME NULL,
    buoc_doi_mat_khau       TINYINT(1) NOT NULL DEFAULT 0,
    tao_luc                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cap_nhat_luc            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_tai_khoan),
    UNIQUE KEY uq_tai_khoan_email (email),
    INDEX idx_tai_khoan_vai_tro (vai_tro),
    CONSTRAINT fk_tai_khoan_tao_boi
        FOREIGN KEY (tao_boi) REFERENCES tai_khoan(ma_tai_khoan),
    CONSTRAINT fk_tai_khoan_dat_lai_boi
        FOREIGN KEY (dat_lai_mat_khau_boi) REFERENCES tai_khoan(ma_tai_khoan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. benh_nhan - Ho so benh nhan
-- ============================================================
CREATE TABLE IF NOT EXISTS benh_nhan (
    ma_benh_nhan                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_tai_khoan                INT UNSIGNED NOT NULL,
    ma_benh_nhan_he_thong       VARCHAR(20) NOT NULL COMMENT 'Vi du BN-0001',
    nguon_tao                   ENUM('tu_dang_ky','quan_tri') NOT NULL DEFAULT 'tu_dang_ky',
    ngay_sinh                   DATE NULL,
    gioi_tinh                   ENUM('nam','nu','khac') NULL,
    nhom_mau                    VARCHAR(5) NULL,
    dia_chi                     TEXT NULL,
    so_bhyt                     VARCHAR(50) NULL,
    han_bhyt                    DATE NULL,
    nghe_nghiep                 VARCHAR(100) NULL,
    nguoi_lien_he_khan_cap      VARCHAR(100) NULL,
    so_dien_thoai_khan_cap      VARCHAR(15) NULL,
    ghi_chu_di_ung              TEXT NULL,
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_benh_nhan),
    UNIQUE KEY uq_benh_nhan_tai_khoan (ma_tai_khoan),
    UNIQUE KEY uq_benh_nhan_ma (ma_benh_nhan_he_thong),
    INDEX idx_benh_nhan_ma (ma_benh_nhan_he_thong),
    CONSTRAINT fk_benh_nhan_tai_khoan
        FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. bac_si - Thong tin bac si
-- ============================================================
CREATE TABLE IF NOT EXISTS bac_si (
    ma_bac_si                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_tai_khoan                INT UNSIGNED NOT NULL,
    chuyen_khoa                 VARCHAR(100) NOT NULL COMMENT 'Da lieu, tham my da...',
    so_chung_chi_hanh_nghe      VARCHAR(50) NOT NULL,
    bang_cap                    VARCHAR(100) NULL,
    so_nam_kinh_nghiem          INT UNSIGNED NOT NULL DEFAULT 0,
    phi_kham                    DECIMAL(12,0) NOT NULL DEFAULT 200000,
    gioi_thieu                  TEXT NULL,
    dang_nhan_kham              TINYINT(1) NOT NULL DEFAULT 1,
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_bac_si),
    UNIQUE KEY uq_bac_si_tai_khoan (ma_tai_khoan),
    UNIQUE KEY uq_bac_si_chung_chi (so_chung_chi_hanh_nghe),
    CONSTRAINT fk_bac_si_tai_khoan
        FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. lich_lam_viec_bac_si - Lich lam viec do quan tri quan ly
-- ============================================================
CREATE TABLE IF NOT EXISTS lich_lam_viec_bac_si (
    ma_lich_lam_viec            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_bac_si                   INT UNSIGNED NOT NULL,
    thu_trong_tuan              TINYINT NOT NULL COMMENT '0 = Chu nhat, 1 = Thu hai, ... 6 = Thu bay',
    gio_bat_dau                 TIME NOT NULL,
    gio_ket_thuc                TIME NOT NULL,
    thoi_luong_moi_ca_phut      INT NOT NULL DEFAULT 30,
    so_benh_nhan_toi_da         INT NOT NULL DEFAULT 20,
    dang_ap_dung                TINYINT(1) NOT NULL DEFAULT 1,
    quan_ly_boi                 INT UNSIGNED NOT NULL COMMENT 'Chi quan tri moi duoc cap nhat lich',
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cap_nhat_luc                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_lich_lam_viec),
    UNIQUE KEY uq_lich_lam_viec_bac_si (ma_bac_si, thu_trong_tuan, gio_bat_dau),
    CONSTRAINT fk_lich_lam_viec_bac_si
        FOREIGN KEY (ma_bac_si) REFERENCES bac_si(ma_bac_si) ON DELETE CASCADE,
    CONSTRAINT fk_lich_lam_viec_quan_tri
        FOREIGN KEY (quan_ly_boi) REFERENCES tai_khoan(ma_tai_khoan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. khoang_ban_bac_si - Khoang gio mau vang do quan tri danh dau
-- ============================================================
CREATE TABLE IF NOT EXISTS khoang_ban_bac_si (
    ma_khoang_ban               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_bac_si                   INT UNSIGNED NOT NULL,
    ngay_ap_dung                DATE NOT NULL,
    gio_bat_dau                 TIME NOT NULL,
    gio_ket_thuc                TIME NOT NULL,
    ly_do                       VARCHAR(255) NULL,
    tao_boi                     INT UNSIGNED NOT NULL COMMENT 'Quan tri tao khoang ban',
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_khoang_ban),
    INDEX idx_khoang_ban_bac_si_ngay (ma_bac_si, ngay_ap_dung),
    CONSTRAINT fk_khoang_ban_bac_si
        FOREIGN KEY (ma_bac_si) REFERENCES bac_si(ma_bac_si) ON DELETE CASCADE,
    CONSTRAINT fk_khoang_ban_tao_boi
        FOREIGN KEY (tao_boi) REFERENCES tai_khoan(ma_tai_khoan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. ngay_nghi_bac_si - Ngay nghi bac si do quan tri quan ly
-- ============================================================
CREATE TABLE IF NOT EXISTS ngay_nghi_bac_si (
    ma_ngay_nghi                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_bac_si                   INT UNSIGNED NOT NULL,
    ngay_nghi                   DATE NOT NULL,
    ly_do                       VARCHAR(200) NULL,
    tao_boi                     INT UNSIGNED NOT NULL COMMENT 'Quan tri ghi nhan',
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_ngay_nghi),
    UNIQUE KEY uq_ngay_nghi_bac_si (ma_bac_si, ngay_nghi),
    CONSTRAINT fk_ngay_nghi_bac_si
        FOREIGN KEY (ma_bac_si) REFERENCES bac_si(ma_bac_si) ON DELETE CASCADE,
    CONSTRAINT fk_ngay_nghi_tao_boi
        FOREIGN KEY (tao_boi) REFERENCES tai_khoan(ma_tai_khoan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. ngay_nghi_phong_kham - Ngay nghi toan phong kham
-- ============================================================
CREATE TABLE IF NOT EXISTS ngay_nghi_phong_kham (
    ma_ngay_nghi_phong          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ngay_nghi                   DATE NOT NULL,
    ten_ngay_nghi               VARCHAR(100) NOT NULL,
    dang_ap_dung                TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (ma_ngay_nghi_phong),
    UNIQUE KEY uq_ngay_nghi_phong_kham (ngay_nghi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. dich_vu - Danh muc dich vu
-- ============================================================
CREATE TABLE IF NOT EXISTS dich_vu (
    ma_dich_vu                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ten_dich_vu                 VARCHAR(200) NOT NULL,
    nhom_dich_vu                VARCHAR(100) NULL,
    mo_ta                       TEXT NULL,
    gia_dich_vu                 DECIMAL(12,0) NOT NULL DEFAULT 0,
    thoi_luong_phut             INT NOT NULL DEFAULT 30,
    dang_ap_dung                TINYINT(1) NOT NULL DEFAULT 1,
    hinh_anh                    VARCHAR(500) NULL,
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_dich_vu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. lich_hen - Lich hen kham
-- ============================================================
CREATE TABLE IF NOT EXISTS lich_hen (
    ma_lich_hen                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_benh_nhan                INT UNSIGNED NOT NULL,
    ma_bac_si                   INT UNSIGNED NOT NULL,
    ma_dich_vu_chinh            INT UNSIGNED NULL,
    loai_luot_kham              ENUM('dat_truoc','tai_kham') NOT NULL DEFAULT 'dat_truoc',
    nguon_dat                   ENUM('ung_dung_benh_nhan','quan_tri','bac_si')
                                NOT NULL DEFAULT 'ung_dung_benh_nhan',
    ngay_kham                   DATE NOT NULL,
    gio_kham                    TIME NOT NULL,
    thoi_luong_phut             INT NOT NULL DEFAULT 30,
    trang_thai                  ENUM('cho_duyet','da_xac_nhan','da_den','dang_kham','hoan_tat','da_huy','vang_mat')
                                NOT NULL DEFAULT 'cho_duyet',
    so_thu_tu                   INT NULL,
    ly_do_kham                  TEXT NULL,
    ly_do_huy                   TEXT NULL,
    huy_boi                     INT UNSIGNED NULL,
    huy_luc                     DATETIME NULL,
    xac_nhan_luc                DATETIME NULL,
    ghi_chu_bac_si              TEXT NULL,
    ngay_de_xuat_moi            DATE NULL,
    gio_de_xuat_moi             TIME NULL,
    phan_tram_uu_dai            DECIMAL(5,2) NOT NULL DEFAULT 0,
    ghi_chu_uu_dai              VARCHAR(255) NULL,
    da_den_luc                  DATETIME NULL,
    bat_dau_kham_luc            DATETIME NULL,
    hoan_tat_luc                DATETIME NULL,
    danh_dau_vang_mat_luc       DATETIME NULL,
    doi_tu_lich_hen             INT UNSIGNED NULL COMMENT 'Lich goc neu doi lich',
    tai_kham_tu_lich_hen        INT UNSIGNED NULL,
    gui_nhac_24h                TINYINT(1) NOT NULL DEFAULT 0,
    gui_nhac_2h                 TINYINT(1) NOT NULL DEFAULT 0,
    ghi_chu_chung               TEXT NULL,
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cap_nhat_luc                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_lich_hen),
    INDEX idx_lich_hen_ngay_bac_si (ngay_kham, ma_bac_si),
    INDEX idx_lich_hen_benh_nhan (ma_benh_nhan),
    INDEX idx_lich_hen_trang_thai (trang_thai),
    CONSTRAINT fk_lich_hen_benh_nhan
        FOREIGN KEY (ma_benh_nhan) REFERENCES benh_nhan(ma_benh_nhan),
    CONSTRAINT fk_lich_hen_bac_si
        FOREIGN KEY (ma_bac_si) REFERENCES bac_si(ma_bac_si),
    CONSTRAINT fk_lich_hen_dich_vu
        FOREIGN KEY (ma_dich_vu_chinh) REFERENCES dich_vu(ma_dich_vu),
    CONSTRAINT fk_lich_hen_huy_boi
        FOREIGN KEY (huy_boi) REFERENCES tai_khoan(ma_tai_khoan),
    CONSTRAINT fk_lich_hen_doi_tu
        FOREIGN KEY (doi_tu_lich_hen) REFERENCES lich_hen(ma_lich_hen),
    CONSTRAINT fk_lich_hen_tai_kham_tu
        FOREIGN KEY (tai_kham_tu_lich_hen) REFERENCES lich_hen(ma_lich_hen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. dich_vu_lich_hen - Dich vu phat sinh trong buoi kham
-- ============================================================
CREATE TABLE IF NOT EXISTS dich_vu_lich_hen (
    ma_dich_vu_lich_hen         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_lich_hen                 INT UNSIGNED NOT NULL,
    ma_dich_vu                  INT UNSIGNED NOT NULL,
    so_luong                    INT NOT NULL DEFAULT 1,
    don_gia                     DECIMAL(12,0) NOT NULL DEFAULT 0,
    them_boi                    INT UNSIGNED NOT NULL COMMENT 'Bac si hoac quan tri them',
    them_luc                    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ghi_chu                     TEXT NULL,
    PRIMARY KEY (ma_dich_vu_lich_hen),
    INDEX idx_dich_vu_lich_hen_lich_hen (ma_lich_hen),
    CONSTRAINT fk_dv_lich_hen_lich_hen
        FOREIGN KEY (ma_lich_hen) REFERENCES lich_hen(ma_lich_hen) ON DELETE CASCADE,
    CONSTRAINT fk_dv_lich_hen_dich_vu
        FOREIGN KEY (ma_dich_vu) REFERENCES dich_vu(ma_dich_vu),
    CONSTRAINT fk_dv_lich_hen_them_boi
        FOREIGN KEY (them_boi) REFERENCES tai_khoan(ma_tai_khoan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. ho_so_benh_an - Ho so benh an
-- ============================================================
CREATE TABLE IF NOT EXISTS ho_so_benh_an (
    ma_ho_so_benh_an            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_lich_hen                 INT UNSIGNED NOT NULL,
    ma_benh_nhan                INT UNSIGNED NOT NULL,
    ma_bac_si                   INT UNSIGNED NOT NULL,
    trieu_chung                 TEXT NULL,
    ket_qua_tham_kham           TEXT NULL,
    chan_doan                   VARCHAR(500) NOT NULL,
    ma_icd10                    VARCHAR(20) NULL,
    phac_do_dieu_tri            TEXT NULL,
    ngay_tai_kham               DATE NULL,
    ghi_chu_tai_kham            TEXT NULL,
    ghi_chu_bac_si              TEXT NULL,
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cap_nhat_luc                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_ho_so_benh_an),
    UNIQUE KEY uq_ho_so_benh_an_lich_hen (ma_lich_hen),
    INDEX idx_ho_so_benh_an_benh_nhan (ma_benh_nhan),
    CONSTRAINT fk_ho_so_benh_an_lich_hen
        FOREIGN KEY (ma_lich_hen) REFERENCES lich_hen(ma_lich_hen),
    CONSTRAINT fk_ho_so_benh_an_benh_nhan
        FOREIGN KEY (ma_benh_nhan) REFERENCES benh_nhan(ma_benh_nhan),
    CONSTRAINT fk_ho_so_benh_an_bac_si
        FOREIGN KEY (ma_bac_si) REFERENCES bac_si(ma_bac_si)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. nha_cung_cap - Danh sach nha cung cap thuoc
-- ============================================================
CREATE TABLE IF NOT EXISTS nha_cung_cap (
    ma_nha_cung_cap             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ten_nha_cung_cap            VARCHAR(200) NOT NULL,
    nguoi_lien_he               VARCHAR(150) NULL,
    so_dien_thoai               VARCHAR(15) NULL,
    email                       VARCHAR(150) NULL,
    dia_chi                     TEXT NULL,
    ma_so_thue                  VARCHAR(50) NULL,
    ghi_chu                     TEXT NULL,
    dang_hop_tac                TINYINT(1) NOT NULL DEFAULT 1,
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cap_nhat_luc                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_nha_cung_cap),
    UNIQUE KEY uq_nha_cung_cap_ten (ten_nha_cung_cap)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 13. thuoc - Danh muc thuoc
-- ============================================================
CREATE TABLE IF NOT EXISTS thuoc (
    ma_thuoc                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ten_thuoc                   VARCHAR(200) NOT NULL,
    ten_hoat_chat               VARCHAR(200) NULL,
    nhom_thuoc                  VARCHAR(100) NULL,
    don_vi_tinh                 VARCHAR(20) NOT NULL,
    gia_ban_don_vi              DECIMAL(12,0) NOT NULL DEFAULT 0,
    ton_kho_hien_tai            INT NOT NULL DEFAULT 0,
    muc_canh_bao_ton_kho        INT NOT NULL DEFAULT 50,
    hang_san_xuat               VARCHAR(200) NULL,
    dieu_kien_bao_quan          VARCHAR(200) NULL,
    mo_ta                       TEXT NULL,
    dang_ap_dung                TINYINT(1) NOT NULL DEFAULT 1,
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cap_nhat_luc                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_thuoc),
    INDEX idx_thuoc_ten (ten_thuoc),
    INDEX idx_thuoc_nhom (nhom_thuoc),
    INDEX idx_thuoc_ton_kho (ton_kho_hien_tai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14. lo_thuoc - Lo nhap thuoc
-- ============================================================
CREATE TABLE IF NOT EXISTS lo_thuoc (
    ma_lo_thuoc                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_thuoc                    INT UNSIGNED NOT NULL,
    ma_nha_cung_cap             INT UNSIGNED NOT NULL,
    so_lo                       VARCHAR(100) NOT NULL,
    han_su_dung                 DATE NOT NULL,
    so_luong_nhap               INT NOT NULL,
    so_luong_con_lai            INT NOT NULL,
    so_luong_giu_cho            INT NOT NULL DEFAULT 0,
    gia_nhap_don_vi             DECIMAL(12,0) NOT NULL DEFAULT 0,
    nhap_luc                    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dang_ap_dung                TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (ma_lo_thuoc),
    UNIQUE KEY uq_lo_thuoc (ma_thuoc, so_lo),
    INDEX idx_lo_thuoc_han_su_dung (han_su_dung),
    INDEX idx_lo_thuoc_con_lai (so_luong_con_lai),
    CONSTRAINT fk_lo_thuoc_thuoc
        FOREIGN KEY (ma_thuoc) REFERENCES thuoc(ma_thuoc),
    CONSTRAINT fk_lo_thuoc_nha_cung_cap
        FOREIGN KEY (ma_nha_cung_cap) REFERENCES nha_cung_cap(ma_nha_cung_cap)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 15. don_thuoc - Don thuoc bac si gui sang duoc si
-- ============================================================
CREATE TABLE IF NOT EXISTS don_thuoc (
    ma_don_thuoc                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_ho_so_benh_an            INT UNSIGNED NOT NULL,
    ma_bac_si                   INT UNSIGNED NOT NULL,
    ma_benh_nhan                INT UNSIGNED NOT NULL,
    trang_thai                  ENUM('cho_xu_ly','da_chuan_bi','cho_thanh_toan','giao_mot_phan','da_giao','da_huy')
                                NOT NULL DEFAULT 'cho_xu_ly',
    chuan_bi_boi                INT UNSIGNED NULL COMMENT 'Duoc si chuan bi thuoc',
    chuan_bi_luc                DATETIME NULL,
    giao_boi                    INT UNSIGNED NULL COMMENT 'Duoc si giao thuoc',
    giao_luc                    DATETIME NULL,
    nhan_thuoc_luc              DATETIME NULL,
    ghi_chu                     TEXT NULL,
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_don_thuoc),
    UNIQUE KEY uq_don_thuoc_ho_so (ma_ho_so_benh_an),
    CONSTRAINT fk_don_thuoc_ho_so_benh_an
        FOREIGN KEY (ma_ho_so_benh_an) REFERENCES ho_so_benh_an(ma_ho_so_benh_an),
    CONSTRAINT fk_don_thuoc_bac_si
        FOREIGN KEY (ma_bac_si) REFERENCES bac_si(ma_bac_si),
    CONSTRAINT fk_don_thuoc_benh_nhan
        FOREIGN KEY (ma_benh_nhan) REFERENCES benh_nhan(ma_benh_nhan),
    CONSTRAINT fk_don_thuoc_chuan_bi_boi
        FOREIGN KEY (chuan_bi_boi) REFERENCES tai_khoan(ma_tai_khoan),
    CONSTRAINT fk_don_thuoc_giao_boi
        FOREIGN KEY (giao_boi) REFERENCES tai_khoan(ma_tai_khoan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 16. chi_tiet_don_thuoc - Tung dong thuoc trong don
-- ============================================================
CREATE TABLE IF NOT EXISTS chi_tiet_don_thuoc (
    ma_chi_tiet_don_thuoc       INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_don_thuoc                INT UNSIGNED NOT NULL,
    ma_thuoc                    INT UNSIGNED NOT NULL,
    so_luong_ke                 INT NOT NULL,
    so_luong_giu_cho            INT NOT NULL DEFAULT 0,
    so_luong_giao               INT NOT NULL DEFAULT 0,
    lieu_dung                   VARCHAR(100) NOT NULL,
    tan_suat                    VARCHAR(100) NOT NULL,
    so_ngay_dung                INT NULL,
    huong_dan_su_dung           TEXT NULL,
    don_gia                     DECIMAL(12,0) NOT NULL DEFAULT 0,
    PRIMARY KEY (ma_chi_tiet_don_thuoc),
    CONSTRAINT fk_chi_tiet_don_thuoc_don
        FOREIGN KEY (ma_don_thuoc) REFERENCES don_thuoc(ma_don_thuoc) ON DELETE CASCADE,
    CONSTRAINT fk_chi_tiet_don_thuoc_thuoc
        FOREIGN KEY (ma_thuoc) REFERENCES thuoc(ma_thuoc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 17. phan_bo_lo_don_thuoc - Phan bo lo cho tung dong don thuoc
-- ============================================================
CREATE TABLE IF NOT EXISTS phan_bo_lo_don_thuoc (
    ma_phan_bo                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_chi_tiet_don_thuoc       INT UNSIGNED NOT NULL,
    ma_lo_thuoc                 INT UNSIGNED NOT NULL,
    so_luong_giu_cho            INT NOT NULL DEFAULT 0,
    so_luong_giao               INT NOT NULL DEFAULT 0,
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_phan_bo),
    UNIQUE KEY uq_phan_bo_lo_don_thuoc (ma_chi_tiet_don_thuoc, ma_lo_thuoc),
    CONSTRAINT fk_phan_bo_chi_tiet_don_thuoc
        FOREIGN KEY (ma_chi_tiet_don_thuoc) REFERENCES chi_tiet_don_thuoc(ma_chi_tiet_don_thuoc) ON DELETE CASCADE,
    CONSTRAINT fk_phan_bo_lo_thuoc
        FOREIGN KEY (ma_lo_thuoc) REFERENCES lo_thuoc(ma_lo_thuoc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 18. hoa_don - Hoa don do duoc si lap va thu tien
-- ============================================================
CREATE TABLE IF NOT EXISTS hoa_don (
    ma_hoa_don                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_lich_hen                 INT UNSIGNED NOT NULL,
    ma_benh_nhan                INT UNSIGNED NOT NULL,
    ma_duoc_si                  INT UNSIGNED NULL COMMENT 'Duoc si lap hoa don va thu tien',
    so_hoa_don                  VARCHAR(20) NOT NULL COMMENT 'PKDL-2026-0001',
    trang_thai_hoa_don          ENUM('nhap','da_lap','thanh_toan_mot_phan','da_thanh_toan','da_huy','da_hoan_tien')
                                NOT NULL DEFAULT 'nhap',
    tam_tinh                    DECIMAL(12,0) NOT NULL DEFAULT 0,
    so_tien_giam                DECIMAL(12,0) NOT NULL DEFAULT 0,
    ly_do_giam                  VARCHAR(200) NULL,
    duyet_giam_gia_boi          INT UNSIGNED NULL,
    so_tien_ho_tro              DECIMAL(12,0) NOT NULL DEFAULT 0,
    tong_thanh_toan             DECIMAL(12,0) NOT NULL DEFAULT 0,
    da_thu                      DECIMAL(12,0) NOT NULL DEFAULT 0,
    trang_thai_thanh_toan       ENUM('chua_thanh_toan','thanh_toan_mot_phan','da_thanh_toan','da_hoan_tien')
                                NOT NULL DEFAULT 'chua_thanh_toan',
    ghi_chu                     TEXT NULL,
    thanh_toan_luc              DATETIME NULL,
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_hoa_don),
    UNIQUE KEY uq_hoa_don_lich_hen (ma_lich_hen),
    UNIQUE KEY uq_hoa_don_so (so_hoa_don),
    INDEX idx_hoa_don_benh_nhan (ma_benh_nhan),
    INDEX idx_hoa_don_trang_thai (trang_thai_thanh_toan),
    CONSTRAINT fk_hoa_don_lich_hen
        FOREIGN KEY (ma_lich_hen) REFERENCES lich_hen(ma_lich_hen),
    CONSTRAINT fk_hoa_don_benh_nhan
        FOREIGN KEY (ma_benh_nhan) REFERENCES benh_nhan(ma_benh_nhan),
    CONSTRAINT fk_hoa_don_duoc_si
        FOREIGN KEY (ma_duoc_si) REFERENCES tai_khoan(ma_tai_khoan),
    CONSTRAINT fk_hoa_don_duyet_giam_gia_boi
        FOREIGN KEY (duyet_giam_gia_boi) REFERENCES tai_khoan(ma_tai_khoan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 19. chi_tiet_hoa_don - Tung dong chi phi
-- ============================================================
CREATE TABLE IF NOT EXISTS chi_tiet_hoa_don (
    ma_chi_tiet_hoa_don         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_hoa_don                  INT UNSIGNED NOT NULL,
    loai_muc                    ENUM('phi_kham','dich_vu','thuoc','khac') NOT NULL,
    ma_tham_chieu               INT UNSIGNED NULL,
    dien_giai                   VARCHAR(255) NOT NULL,
    so_luong                    INT NOT NULL DEFAULT 1,
    don_gia                     DECIMAL(12,0) NOT NULL DEFAULT 0,
    thanh_tien                  DECIMAL(12,0) NOT NULL DEFAULT 0,
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_chi_tiet_hoa_don),
    INDEX idx_chi_tiet_hoa_don_hoa_don (ma_hoa_don),
    CONSTRAINT fk_chi_tiet_hoa_don_hoa_don
        FOREIGN KEY (ma_hoa_don) REFERENCES hoa_don(ma_hoa_don) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 20. giao_dich_thanh_toan - Lich su thu tien hoan tien
-- ============================================================
CREATE TABLE IF NOT EXISTS giao_dich_thanh_toan (
    ma_giao_dich                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_hoa_don                  INT UNSIGNED NOT NULL,
    loai_giao_dich              ENUM('thu_tien','hoan_tien') NOT NULL DEFAULT 'thu_tien',
    phuong_thuc                 ENUM('tien_mat','the','chuyen_khoan','ho_tro_noi_bo','khac') NOT NULL,
    so_tien                     DECIMAL(12,0) NOT NULL DEFAULT 0,
    ma_tham_chieu_giao_dich     VARCHAR(100) NULL,
    trang_thai                  ENUM('cho_xu_ly','thanh_cong','that_bai','da_huy') NOT NULL DEFAULT 'thanh_cong',
    tao_boi                     INT UNSIGNED NOT NULL,
    duyet_boi                   INT UNSIGNED NULL,
    thanh_toan_luc              DATETIME NULL,
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_giao_dich),
    INDEX idx_giao_dich_hoa_don (ma_hoa_don),
    INDEX idx_giao_dich_thanh_toan_luc (thanh_toan_luc),
    CONSTRAINT fk_giao_dich_hoa_don
        FOREIGN KEY (ma_hoa_don) REFERENCES hoa_don(ma_hoa_don) ON DELETE CASCADE,
    CONSTRAINT fk_giao_dich_tao_boi
        FOREIGN KEY (tao_boi) REFERENCES tai_khoan(ma_tai_khoan),
    CONSTRAINT fk_giao_dich_duyet_boi
        FOREIGN KEY (duyet_boi) REFERENCES tai_khoan(ma_tai_khoan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 21. nhat_ky_kho - Lich su nhap xuat dieu chinh kho
-- ============================================================
CREATE TABLE IF NOT EXISTS nhat_ky_kho (
    ma_nhat_ky_kho              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_thuoc                    INT UNSIGNED NOT NULL,
    ma_lo_thuoc                 INT UNSIGNED NULL,
    ma_tai_khoan                INT UNSIGNED NOT NULL,
    hanh_dong                   ENUM('nhap','xuat','dieu_chinh','het_han','tra_hang_nhap') NOT NULL,
    so_luong_thay_doi           INT NOT NULL COMMENT 'Duong la nhap, am la xuat',
    so_luong_truoc              INT NOT NULL,
    so_luong_sau                INT NOT NULL,
    ma_tham_chieu               INT UNSIGNED NULL,
    loai_tham_chieu             VARCHAR(50) NULL,
    ghi_chu                     TEXT NULL,
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_nhat_ky_kho),
    CONSTRAINT fk_nhat_ky_kho_thuoc
        FOREIGN KEY (ma_thuoc) REFERENCES thuoc(ma_thuoc),
    CONSTRAINT fk_nhat_ky_kho_lo_thuoc
        FOREIGN KEY (ma_lo_thuoc) REFERENCES lo_thuoc(ma_lo_thuoc),
    CONSTRAINT fk_nhat_ky_kho_tai_khoan
        FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 22. thong_bao - Thong bao he thong
-- ============================================================
CREATE TABLE IF NOT EXISTS thong_bao (
    ma_thong_bao                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_tai_khoan                INT UNSIGNED NOT NULL,
    tieu_de                     VARCHAR(200) NOT NULL,
    noi_dung                    TEXT NOT NULL,
    loai_thong_bao              ENUM('lich_hen','don_thuoc','hoa_don','he_thong','nhac_hen')
                                NOT NULL DEFAULT 'he_thong',
    da_doc                      TINYINT(1) NOT NULL DEFAULT 0,
    duong_dan_hanh_dong         VARCHAR(500) NULL,
    tao_luc                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ma_thong_bao),
    INDEX idx_thong_bao_tai_khoan (ma_tai_khoan, da_doc),
    INDEX idx_thong_bao_tao_luc (tao_luc),
    CONSTRAINT fk_thong_bao_tai_khoan
        FOREIGN KEY (ma_tai_khoan) REFERENCES tai_khoan(ma_tai_khoan) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DU LIEU MAU
-- ============================================================

INSERT IGNORE INTO tai_khoan (
    ma_tai_khoan, email, mat_khau, vai_tro, ho_ten, so_dien_thoai,
    dang_hoat_dong, email_xac_thuc_luc, tao_luc
) VALUES (
    1,
    'admin@qlpk.vn',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'quan_tri',
    'Quan tri vien',
    '0900000000',
    1,
    NOW(),
    NOW()
);

INSERT IGNORE INTO ngay_nghi_phong_kham (ngay_nghi, ten_ngay_nghi) VALUES
    ('2026-01-01', 'Tet Duong lich'),
    ('2026-02-19', 'Tet Nguyen Dan mung 1'),
    ('2026-02-20', 'Tet Nguyen Dan mung 2'),
    ('2026-02-21', 'Tet Nguyen Dan mung 3'),
    ('2026-04-30', 'Ngay Giai phong mien Nam'),
    ('2026-05-01', 'Ngay Quoc te Lao dong'),
    ('2026-09-02', 'Ngay Quoc khanh');

INSERT IGNORE INTO dich_vu (ten_dich_vu, nhom_dich_vu, gia_dich_vu, thoi_luong_phut, mo_ta) VALUES
    ('Kham da lieu tong quat', 'Kham tong quat', 200000, 30, 'Kham va tu van cac van de da lieu'),
    ('Dieu tri mun trung ca', 'Dieu tri mun', 350000, 45, 'Dieu tri mun chuyen sau'),
    ('Laser tri nam tan nhang', 'Laser tham my', 800000, 60, 'Dieu tri nam va tan nhang bang laser'),
    ('Cham soc da co ban', 'Cham soc da', 250000, 60, 'Lam sach sau va duong am da'),
    ('Dieu tri viem da co dia', 'Dieu tri benh da', 300000, 30, 'Theo doi va dieu tri viem da co dia');

INSERT IGNORE INTO nha_cung_cap (
    ten_nha_cung_cap, nguoi_lien_he, so_dien_thoai, email, dia_chi
) VALUES (
    'Cong ty duoc pham mau',
    'Nguyen Van A',
    '0911222333',
    'nhacungcap@example.com',
    'TP.HCM'
);


