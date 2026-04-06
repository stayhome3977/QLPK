---
description: Chiến lược test, naming convention và pattern test chuẩn. Load khi viết test file.
globs: ["**/test*", "**/*.test.*", "**/*.spec.*", "**/tests/**", "**/__tests__/**"]
alwaysApply: false
---

# Testing Rules

## Backend — pytest

### Cấu trúc
```
backend/tests/
├── conftest.py          # fixtures: db session, test client, mock users
├── test_auth.py
├── test_appointments.py
├── test_prescriptions.py
├── test_pharmacy.py
└── test_admin.py
```

### Naming convention
```python
# test_<module>.py
# def test_<hành động>_<điều kiện>_<kết quả mong đợi>()

def test_create_appointment_valid_slot_returns_201(): ...
def test_create_appointment_taken_slot_returns_400(): ...
def test_login_wrong_password_returns_401(): ...
def test_login_5_failures_locks_account(): ...
```

### Pattern chuẩn
```python
# Fixtures cơ bản trong conftest.py
@pytest.fixture
def db():
    # SQLite in-memory cho test — không đụng MySQL dev
    ...

@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app)

@pytest.fixture
def benh_nhan_token(client): ...
@pytest.fixture
def bac_si_token(client): ...

# Test role boundary — bắt buộc
def test_benh_nhan_cannot_access_doctor_route(client, benh_nhan_token):
    res = client.get("/api/v1/doctor/patients",
                     headers={"Authorization": f"Bearer {benh_nhan_token}"})
    assert res.status_code == 403
```

### Độ phủ tối thiểu
| Module | Cần test |
|--------|---------|
| Auth | register, login, refresh, logout, rate limit, role redirect |
| Lịch hẹn | tạo pending, duyệt, hủy, slot conflict, trạng thái transition |
| Đơn thuốc | kê đơn, kiểm tra tồn kho, trừ lô |
| Thanh toán | lập hóa đơn, ghi giao dịch, in hóa đơn |
| Phân quyền | mọi endpoint — test sai role phải trả 403 |

## Frontend — Vitest + React Testing Library

### Naming
```
frontend/src/__tests__/
├── components/    unit test component
├── hooks/         test custom hooks
└── pages/         integration test per page
```

```tsx
// Mỗi test file tương ứng component/hook
// AppointmentForm.test.tsx
describe('AppointmentForm', () => {
  it('hiển thị lỗi khi submit thiếu lý do khám', async () => { ... })
  it('disable nút Đặt lịch khi slot màu đỏ', () => { ... })
  it('gọi POST /appointments với đúng payload', async () => { ... })
})
```

### Rules
- Mock axiosInstance — không gọi API thật trong test
- Test màu slot: `available` → click được; `booked`/`blocked` → disabled
- Test ProtectedRoute: redirect về `/login` khi không có token
