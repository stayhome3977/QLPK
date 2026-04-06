---
description: Xử lý lỗi backend và frontend, format response lỗi chuẩn. Load khi làm việc với exception handler, error boundary, API response.
globs: ["**/exception*", "**/error*", "**/handler*", "**/interceptor*", "**/middleware*"]
alwaysApply: false
---

# Error Handling Rules

## Backend — FastAPI response lỗi chuẩn

### Format bắt buộc
```python
# Mọi lỗi phải trả về cùng shape
{
  "detail": "Mô tả lỗi rõ ràng bằng tiếng Việt",
  "code": "ERROR_CODE_SCREAMING_SNAKE",   # optional, cho FE xử lý logic
  "field": "ten_truong"                   # optional, chỉ dùng cho validation error
}
```

### HTTP status chuẩn
| Tình huống | Status |
|-----------|--------|
| Validate thất bại (Pydantic) | 422 |
| Chưa đăng nhập | 401 |
| Sai role / không có quyền | 403 |
| Không tìm thấy resource | 404 |
| Logic nghiệp vụ thất bại (slot đã đặt, thiếu thuốc...) | 400 |
| Lỗi server không mong đợi | 500 |

### Exception handler mẫu
```python
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": getattr(exc, "code", None)},
    )

# Bắt lỗi chưa handle — KHÔNG expose stack trace ra production
@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    logger.error(f"Unhandled: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Lỗi hệ thống, vui lòng thử lại."})
```

## Frontend — React xử lý lỗi API

### Axios interceptor response
```js
axiosInstance.interceptors.response.use(
  res => res,
  async error => {
    if (error.response?.status === 401) {
      // Thử refresh token trước khi báo lỗi
      try {
        await refreshToken();
        return axiosInstance(error.config); // retry
      } catch {
        logout(); // hết hạn thật sự → về /login
      }
    }
    return Promise.reject(error);
  }
);
```

### React Query error handling
```jsx
const { error } = useQuery({ ... })
// Hiển thị error.response?.data?.detail hoặc fallback message
// Dùng toast (ShadcnUI) cho lỗi không blocking
// Dùng inline form error cho lỗi validation field
```

### Error Boundary
- Wrap từng trang với `<ErrorBoundary>` — tránh crash toàn app
- Trang nội bộ (bác sĩ, dược sĩ) cần boundary riêng per-section

## Logging
- Backend: log mọi 4xx/5xx kèm `request_id`, `user_id`, route, timestamp
- Không log sensitive data (password, token, số thẻ)
- Production: dùng structured logging (JSON) để dễ query
