# Hướng dẫn loại bỏ bảng không cần thiết

## ✅ ĐÃ HOÀN THÀNH - Cập nhật trong 001_create_all_tables.sql

### Các bảng đã loại bỏ (Commented out):

#### 1. `dich_vu_lich_hen` (AppointmentService)
- **Trạng thái**: ✅ Đã comment out trong migration
- **Lý do**: Redundant với `lich_hen.ma_dich_vu_chinh`
- **Alternative**: Sử dụng `lich_hen.ma_dich_vu_chinh` cho dịch vụ chính

#### 2. `khoang_ban_bac_si` (DoctorBusySlot)  
- **Trạng thái**: ✅ Đã comment out trong migration
- **Lý do**: Ít sử dụng, chỉ dùng cho đánh dấu thời gian bận đột xuất
- **Alternative**: Sử dụng `ngay_nghi_bac_si` hoặc hardcode trong logic

#### 3. `chi_tiet_don_thuoc` (PrescriptionItem)
- **Trạng thái**: ✅ Đã comment out trong migration
- **Lý do**: Có thể lưu trực tiếp trong `don_thuoc` dưới dạng JSON
- **Alternative**: Thêm column `chi_tiet_thuoc JSON` vào bảng `don_thuoc`

#### 4. `phan_bo_lo_don_thuoc` (PrescriptionItemAllocation)
- **Trạng thái**: ✅ Đã comment out trong migration
- **Lý do**: Phụ thuộc vào `chi_tiet_don_thuoc` đã bị loại bỏ
- **Alternative**: Logic phân bổ có thể lưu trong JSON của `don_thuoc`

## 📊 **Kết quả:**

### **Database Schema:**
- **Trước**: 24 bảng
- **Sau**: 20 bảng ✅ (Giảm 4 bảng!)

### **Migration đã cập nhật:**
- `001_create_all_tables.sql`: Commented out 4 bảng và data mẫu
- Không cần file migration riêng

## 🔧 **Các file cần cập nhật trong code:**

### Backend Changes (Cần làm ngay)

#### 1. `backend/app/models/entities.py`
```python
# XÓA các class sau:
class AppointmentService(Base):        # Lines 358-369 ❌
class DoctorBusySlot(Base):            # Lines 286-297 ❌
class PrescriptionItem(Base):         # Lines 443-457 ❌
class PrescriptionItemAllocation(Base): # Lines 459-469 ❌

# XÓA imports không cần thiết:
# AppointmentService, DoctorBusySlot, PrescriptionItem, PrescriptionItemAllocation

# CẬP NHẬT Prescription class:
+ Thêm column: chi_tiet_thuoc: Mapped[dict | None] = mapped_column("chi_tiet_thuoc", JSON)
```

#### 2. `backend/app/routers/clinic.py`
```python
# XÓA imports:
- AppointmentService        ❌
- DoctorBusySlot            ❌
- PrescriptionItem          ❌
- PrescriptionItemAllocation ❌

# XÓA các functions:
- serialize_appointment_services()           # Lines 229-251 ❌
- add_appointment_service()                 # Lines 1711-1738 ❌  
- remove_appointment_service()              # Lines 1740-1756 ❌
- serialize_prescription_items()            # Lines 254-277 ❌
- Các phần xử lý AppointmentService trong generate_invoice_items() # Lines 2210-2220 ❌
- release_prescription_reservations()       # Lines 797-811 ❌

# CẬP NHẬT functions:
- serialize_appointment()                   # Lines 384-424
  + Xóa phần lấy services từ AppointmentService
  + Thay bằng logic lấy từ lich_hen.ma_dich_vu_chinh

- create_appointment()                     # Lines 1439-1480
  + Xóa logic tạo AppointmentService
  + Chỉ set lich_hen.ma_dich_vu_chinh

- get_available_slots_logic()               # Lines 456-522
  + Xóa phần query DoctorBusySlot

- serialize_prescription()                 # Lines 369-381
  + Xóa serialize_prescription_items()
  + Lấy chi_tiet từ prescription.chi_tiet_thuoc (JSON)

- create_prescription()                    # Tìm function tạo prescription
  + Lưu chi tiết thuốc vào JSON thay vì tạo PrescriptionItem records
```

#### 3. `backend/app/schemas/api.py`
```python
# XÓA schemas:
class AppointmentServicePayload(BaseModel):  # Lines 223-226 ❌
# PrescriptionItem schemas nếu có ❌

# CẬP NHẬT schemas:
class AppointmentCreate(BaseModel):         # Lines 200-220
  + Xóa field: service_ids: list[int]
  + Giữ lại: primary_service_id: int | None

class PrescriptionCreate(BaseModel):        # Tìm schema này
  + Thêm field: chi_tiet_thuoc: list[dict] thay vì items riêng lẻ
```

### Frontend Changes (Cần làm ngay)

#### 1. `frontend/src/pages/public/Pages.jsx`
```jsx
// BookingPage component
// XÓA logic multiple services:
- const [form, setForm] = useState({
    // ...
    service_ids: [],  // ❌ XÓA
    // ...
});

// CẬP NHẬT toggleService function:
- XÓA hàm toggleService()        // Lines 260-273 ❌
- Giữ lại chỉ primary_service_id

// CẬP NHẬT submit:
await api.post("/api/v1/appointments", {
    // ...
    primary_service_id: form.primary_service_id ? Number(form.primary_service_id) : null,
    // service_ids: form.service_ids.map((item) => Number(item)),  // ❌ XÓA
    // ...
});

// CẬP NHẬT UI:
- XÓA checkbox multiple services   // Lines 324-339 ❌
- Chỉ hiển thị dropdown select one service
```

#### 2. `frontend/src/pages/receptionist/ReceptionistPortal.jsx`
```jsx
// XÓA multiple service selection logic ❌
// Giữ lại chỉ primary_service_id
```

#### 3. `frontend/src/pages/doctor/DoctorPortal.jsx`
```jsx
// CẬP NHẬT hiển thị services:
// Thay vì: selected.services (array) ❌
// Sử dụng: primary service từ appointment

// CẬP NHẬT hiển thị prescription:
// Thay vì: prescription.items array ❌
// Sử dụng: prescription.chi_tiet_thuoc từ JSON
```

#### 4. `frontend/src/pages/pharmacist/PharmacistPortal.jsx`
```jsx
// CẬP NHẬT tính toán services:
// Thay vì lặp qua selected.services array ❌
// Lấy từ primary service của appointment

// CẬP NHẬT hiển thị medicines:
// Thay vì: prescription.medicines array ❌
// Sử dụng: prescription.chi_tiet_thuoc từ JSON
```

## 🚀 **Steps thực hiện:**

### 1. ✅ Database Migration (Đã xong)
- Đã comment out 4 bảng trong `001_create_all_tables.sql`
- Database sẽ có 20 bảng thay vì 24

### 2. Backend Code Updates (Cần làm)
```bash
cd backend
# Test sau khi update
python -c "from app.models.entities import *; print('Import OK')"
```

### 3. Frontend Code Updates (Cần làm)
```bash
cd frontend
npm run build  # Kiểm tra build errors
```

### 4. Testing Checklist

#### Backend Testing:
- [ ] Tạo appointment mới với 1 service
- [ ] Kiểm tra invoice generation  
- [ ] Verify appointment serialization
- [ ] Test available slots logic
- [ ] Tạo prescription với chi tiết thuốc JSON
- [ ] Verify prescription serialization

#### Frontend Testing:
- [ ] Booking page chỉ chọn 1 service
- [ ] Hiển thị correct service trong appointment details
- [ ] Invoice tính toán đúng với 1 service
- [ ] Doctor portal hiển thị service đúng
- [ ] Hiển thị prescription với chi tiết thuốc từ JSON
- [ ] Pharmacist portal xử lý prescription từ JSON

## ⚠️ **Risks & Mitigations:**

### **Medium Risk** ⚠️
- **Prescription logic thay đổi lớn**: Từ relational sang JSON
- **Data migration cần careful**: Cần chuyển existing prescription items sang JSON
- **Frontend changes nhiều**: Cập nhật UI prescription

### **User Impact** 🟡
- **UI Changes**: Booking page chỉ chọn 1 service thay vì nhiều
- **Prescription Display**: Hiển thị khác đi nhưng functionality giữ nguyên
- **API Changes**: Remove multiple services endpoints, update prescription endpoints

## 🎯 **Benefits Achieved:**

1. ✅ **Database Schema**: 24 → 20 tables (Giảm 4 bảng!)
2. ✅ **Performance**: Giảm 4 JOIN queries
3. ✅ **Code Complexity**: Đơn giản hóa business logic
4. ✅ **Maintenance**: Ít code hơn để maintain
5. ✅ **Flexibility**: Prescription details trong JSON dễ extend

## 📝 **Timeline Estimate:**

- **Backend Updates**: 4-5 hours (prescription logic phức tạp hơn)  
- **Frontend Updates**: 4-5 hours
- **Testing**: 3-4 hours
- **Total**: 2 working days

## 🔄 **Rollback Plan:**

Nếu cần rollback:
```sql
-- Uncomment trong 001_create_all_tables.sql
-- Restore code từ git
git checkout HEAD~1 -- backend/app/models/entities.py
git checkout HEAD~1 -- backend/app/routers/clinic.py
# ... etc
```

## 📋 **Data Migration cho Prescription:**

```sql
-- Chuyển existing prescription items sang JSON
UPDATE don_thuoc 
SET chi_tiet_thuoc = JSON_ARRAY(
    JSON_OBJECT(
        'ma_thuoc', ma_thuoc,
        'so_luong_ke', so_luong_ke,
        'lieu_dung', lieu_dung,
        'tan_suat', tan_suat,
        'so_ngay_dung', so_ngay_dung,
        'huong_dan_su_dung', huong_dan_su_dung,
        'don_gia', don_gia
    )
)
WHERE ma_don_thuoc IN (
    SELECT ma_don_thuoc FROM chi_tiet_don_thuoc
);
```

---

## 📋 **NEXT ACTIONS:**

1. **Ngay lập tức**: Update backend models và routers
2. **Tiếp theo**: Update frontend components  
3. **Cuối cùng**: Test và deploy

**Migration đã sẵn sàng!** 🚀

**Tổng cộng đã loại bỏ: 4 bảng không cần thiết** 🎉
