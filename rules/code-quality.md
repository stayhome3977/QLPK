---
description: Coding conventions, naming, structure chuẩn cho BE và FE. Load khi viết hoặc review code mới.
globs: ["backend/**/*.py", "frontend/**/*.jsx", "frontend/**/*.tsx", "frontend/**/*.ts"]
alwaysApply: false
---

# Code Quality Rules

## Python / FastAPI

### Naming
```python
# File & module: snake_case
# Class: PascalCase
# Function/variable: snake_case
# Constant: SCREAMING_SNAKE

# Model SQLAlchemy — tên bảng Việt hóa không dấu
class LichHen(Base):
    __tablename__ = "lich_hen"

# Pydantic schema — suffix In/Out/Update
class LichHenCreate(BaseModel): ...
class LichHenOut(BaseModel): ...
```

### Cấu trúc router
```python
# Mỗi domain = 1 router file
# Logic nghiệp vụ vào services/, không viết trong router
# Dependency injection qua Depends()

@router.post("/", response_model=LichHenOut, status_code=201)
async def create_appointment(
    body: LichHenCreate,
    db: Session = Depends(get_db),
    current_user: TaiKhoan = Depends(require_role("benh_nhan")),
):
    return appointment_service.create(db, body, current_user.id)
```

### Quy tắc bắt buộc
- Không business logic trong router — chỉ validate + gọi service
- Không raw SQL string — chỉ ORM
- Mọi endpoint cần auth phải có `Depends(require_role(...))`
- Type hint đầy đủ trên function signature

## React / TypeScript

### Naming
```tsx
// Component: PascalCase, file trùng tên component
// Hook custom: camelCase prefix use
// Constant: SCREAMING_SNAKE
// Util function: camelCase

// ✅
export default function AppointmentForm() { ... }
export function useAppointmentSlots(doctorId: number) { ... }
```

### Component rules
```tsx
// 1 file = 1 component chính
// Props interface khai báo rõ ràng
interface AppointmentCardProps {
  appointment: AppointmentOut;
  onCancel: (id: number) => void;
}

// Không viết logic fetch trực tiếp trong component
// Tách vào custom hook hoặc React Query
```

### Import order (auto-sort với Prettier)
1. React core
2. Third-party (react-router, react-query, axios...)
3. Internal components
4. Internal utils/constants
5. Types

### Quy tắc bắt buộc
- Zod schema validate mọi form trước khi submit
- React Query cho mọi server state — không useState + useEffect để fetch
- Không hardcode URL API — dùng `constants.js`
- Không `any` type trong TypeScript nếu không giải thích lý do
