---
description: Bảo mật backend, frontend và database. Load khi làm việc với auth, middleware, CORS, input validation.
globs: ["**/auth*", "**/middleware*", "**/security*", "**/dependencies*", "**/interceptor*"]
alwaysApply: false
---

# Security Rules

## Backend (FastAPI)

### Auth
```python
# JWT — python-jose
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS   = 7

# Password — passlib bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed = pwd_context.hash(plain_password)
```

### CORS — chỉ whitelist domain FE
```python
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://phongkhamdalieu.vn"],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=True,
)
```

### Rate limiting đăng nhập
- 5 lần sai liên tiếp → khóa tài khoản 15 phút
- Log IP + thời gian mỗi lần thất bại

### Input validation
- Tất cả request body đi qua Pydantic v2 schema
- Không tin tưởng bất kỳ dữ liệu nào từ client

### DB user permissions
```sql
-- Chỉ cấp quyền tối thiểu cho app user
GRANT SELECT, INSERT, UPDATE, DELETE
  ON phong_kham_da_lieu.* TO 'pkdl_user'@'localhost';
-- KHÔNG GRANT: DROP, ALTER, CREATE, TRUNCATE
```

## Frontend (React)

### Token storage
```js
// ✅ Access token — JS memory (module-level variable)
let accessToken = null;

// ✅ Refresh token — HttpOnly cookie (server set)
// ❌ KHÔNG localStorage / sessionStorage / cookie JS-accessible
```

### Axios interceptor
```js
axiosInstance.interceptors.request.use(config => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
// Response interceptor: nếu 401 → gọi /auth/refresh → retry request gốc
```

### Route protection
- `<ProtectedRoute>` wrap mọi trang nội bộ
- Kiểm tra `vai_tro` trước khi render — redirect về `/login` nếu sai role

## Checklist bảo mật
- [ ] Không lưu plaintext password
- [ ] Không lưu số thẻ ngân hàng đầy đủ
- [ ] Không expose thông tin hệ thống trong error response production
- [ ] Backup DB định kỳ mỗi ngày
- [ ] Refresh token rotation khi dùng
