---
description: Cấu trúc React, routing, component pattern và UI layout rules. Load khi làm việc với frontend.
globs: ["frontend/**/*.jsx", "frontend/**/*.tsx", "frontend/**/*.js", "frontend/**/*.ts", "**/components/**", "**/pages/**"]
alwaysApply: false
---

# Frontend Rules

## Cấu trúc `frontend/src/`
```
pages/
  public/     Home, Login (tab Đăng nhập + Đăng ký), BookingByDoctor
  patient/    MyAppointments, History, Invoice, Profile
  doctor/     Dashboard, AppointmentApproval, Patients, TodayList,
              Examination, Prescription, PatientHistory, Schedule
  pharmacy/   PendingOrders, DispensePayment, Inventory,
              StockIn, Suppliers, StockHistory
  admin/      Dashboard, AccountManagement, ScheduleManagement,
              DoctorManagement, Reports
components/
  layout/     Navbar, Sidebar, Footer
  shared/     AppointmentCalendar, NotificationBell,
              LoadingSpinner, ProtectedRoute
  forms/      AppointmentForm, PrescriptionForm
utils/        formatDate.js · formatCurrency.js · constants.js
```

## Layout theo role
| Route | Layout | Ai truy cập |
|-------|--------|-------------|
| `/` | PublicLayout (Header+Footer) | Khách + benh_nhan |
| `/doctor/*` | InternalLayout (Sidebar) | bac_si |
| `/pharmacy/*` | InternalLayout (Sidebar) | duoc_si |
| `/admin/*` | InternalLayout (Sidebar) | quan_tri |

## Patterns bắt buộc
```jsx
// Server state — luôn dùng React Query
const { data } = useQuery({ queryKey: ['lich-hen'], queryFn: fetchAppointments })

// Form — luôn dùng React Hook Form + Zod
const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) })

// HTTP — luôn qua axiosInstance (có interceptor), không gọi fetch trực tiếp
```

## Auth flow FE
- Access token lưu trong JS memory (biến module-level), KHÔNG localStorage/sessionStorage
- Refresh token trong HttpOnly cookie — JS không đọc được
- `axiosInstance` tự động attach `Authorization: Bearer <token>` và gọi refresh khi 401

## Màu slot đặt lịch (bất biến)
```jsx
const SLOT_COLOR = {
  available: 'bg-green-500',  // 🟢 còn trống
  booked:    'bg-red-500',    // 🔴 đã đặt
  blocked:   'bg-yellow-400', // 🟡 bác sĩ bận
}
// Chỉ slot available được click đặt lịch
```

## Validate đăng ký (Zod schema)
```ts
z.object({
  full_name: z.string().min(2).max(100),
  email:     z.string().email(),
  password:  z.string().min(8).regex(/(?=.*[A-Z])(?=.*\d)/),
  phone:     z.string().regex(/^(0\d{9,10})$/).optional(),
})
```

## UI Design tokens
- Background: `#F7F9FC`
- Primary/Hero: xanh da trời (YouMed-style)
- Border radius card: `rounded-2xl`
- Ngôn ngữ: Tiếng Việt, giọng y tế chuyên nghiệp, tránh marketing
- Không đưa thao tác nội bộ (kê thuốc, thu tiền, in hóa đơn) lên trang public
