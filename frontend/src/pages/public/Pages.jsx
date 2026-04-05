import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../api/http";
import { useAuth } from "../../auth";
import { Alert, Field } from "../../components/shared/UI";
import { currency, ROLE_LABELS, SLOT_STATUS } from "../../utils/helpers";

function getErrorMessage(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.msg) return item.msg;
        return JSON.stringify(item);
      })
      .join("; ");
  }
  try {
    return JSON.stringify(detail);
  } catch {
    return fallback;
  }
}

function useLoad(path, initialValue = []) {
  const [data, setData] = useState(initialValue);
  useEffect(() => {
    api.get(path).then((response) => setData(response.data)).catch(() => setData(initialValue));
  }, [path]);
  return data;
}



export function LoginPage() {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "patient@qlpk.vn", password: "Patient@123" });
  const [registerForm, setRegisterForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const submitLogin = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      const user = await login(loginForm.email, loginForm.password);
      navigate(location.state?.redirectTo || (user.role === "patient" ? "/patient" : `/${user.role}`), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Đăng nhập thất bại"));
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      await api.post("/api/v1/auth/register", registerForm);
      
      // Redirect to verification page instead of trying to login immediately
      navigate(`/verify-email?email=${encodeURIComponent(registerForm.email)}`, { replace: true });
      
    } catch (err) {
      setError(getErrorMessage(err, "Đăng ký thất bại"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <span className="eyebrow">Đăng nhập hệ thống</span>
        <h1>Trang công khai cho bệnh nhân, dashboard riêng cho bác sĩ, dược sĩ và quản trị.</h1>
        <p>Luồng mới bỏ lễ tân và thu ngân, toàn bộ thanh toán chuyển sang dược sĩ.</p>
        <div className="demo-accounts-popup">
          <strong>Tài khoản mẫu (Mật khẩu theo quyền):</strong>
          <ul>
            <li>
              <span>Quản trị viên:</span>
              <div style={{ textAlign: "right" }}>
                <code>admin@qlpk.vn</code> <br/>
                <small>MK:</small> <code>Admin@123</code>
              </div>
            </li>
            <li>
              <span>Bác sĩ:</span>
              <div style={{ textAlign: "right" }}>
                <code>doctor@qlpk.vn</code> <br/>
                <small>MK:</small> <code>Doctor@123</code>
              </div>
            </li>
            <li>
              <span>Dược sĩ:</span>
              <div style={{ textAlign: "right" }}>
                <code>pharmacist@qlpk.vn</code> <br/>
                <small>MK:</small> <code>Pharmacist@123</code>
              </div>
            </li>
            <li>
              <span>Bệnh nhân:</span>
              <div style={{ textAlign: "right" }}>
                <code>patient@qlpk.vn</code> <br/>
                <small>MK:</small> <code>Patient@123</code>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
            Đăng nhập
          </button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">
            Đăng ký
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={submitLogin} className="auth-form">
            <Field label="Email">
              <input value={loginForm.email} onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))} />
            </Field>
            <Field label="Mật khẩu">
              <input type="password" value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} />
            </Field>
            {error ? <Alert type="error">{error}</Alert> : null}
            <button className="primary-button" disabled={loading}>
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </button>
            
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <Link to="/reset-password" className="ghost-button">
                Quên mật khẩu?
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={submitRegister} className="auth-form">
            <Field label="Họ và tên">
              <input value={registerForm.full_name} onChange={(e) => setRegisterForm((p) => ({ ...p, full_name: e.target.value }))} />
            </Field>
            <Field label="Email">
              <input type="email" value={registerForm.email} onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))} />
            </Field>
            <Field label="Mật khẩu">
              <input type="password" value={registerForm.password} onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))} />
            </Field>
            <Field label="Số điện thoại">
              <input value={registerForm.phone} onChange={(e) => setRegisterForm((p) => ({ ...p, phone: e.target.value }))} />
            </Field>
            {error ? <Alert type="error">{error}</Alert> : null}
            <button className="primary-button" disabled={loading}>
              {loading ? "Đang xử lý..." : "Tạo tài khoản bệnh nhân"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export function DoctorsPage() {
  const doctors = useLoad("/api/v1/doctors");

  return (
    <main className="public-page">
      <section className="section-card">
        <h2>Đội ngũ bác sĩ</h2>
        <div className="tile-grid">
          {doctors.map((doctor) => (
            <Link key={doctor.id} to={`/booking/${doctor.id}`} className="doctor-card">
              <div className="doctor-avatar">{doctor.user?.full_name?.slice(0, 1) || "B"}</div>
              <div>
                <strong>{doctor.user?.full_name}</strong>
                <p>{doctor.specialty}</p>
                <span>{doctor.degree || "Bác sĩ da liễu"}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export function ServicesPage() {
  const services = useLoad("/api/v1/services");

  return (
    <main className="public-page">
      <section className="section-card">
        <h2>Dịch vụ da liễu</h2>
        <div className="tile-grid">
          {services.map((service) => (
            <Link key={service.id} to={`/booking?service=${service.id}`} className="tile service-tile">
              <strong>{service.name}</strong>
              <p>{service.description}</p>
              <span>{currency(service.price)}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [form, setForm] = useState({ email, code: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submitVerification = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      await api.post("/api/v1/auth/verify-email", {
        email: form.email,
        code: form.code
      });
      
      setSuccess("Xác thực email thành công! Đang chuyển hướng...");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
      
    } catch (err) {
      setError(getErrorMessage(err, "Xác thực thất bại"));
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      await api.post("/api/v1/auth/send-verification", {
        email: form.email,
        full_name: "" // Backend sẽ lấy từ database
      });
      
      setSuccess("Mã xác thực mới đã được gửi! Vui lòng kiểm tra email.");
      
    } catch (err) {
      setError(getErrorMessage(err, "Không thể gửi lại mã xác thực"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <span className="eyebrow">Xác thực tài khoản</span>
        <h1>Xác thực email của bạn</h1>
        <p>Nhập mã 6 số đã được gửi đến email của bạn để hoàn tất đăng ký tài khoản.</p>
        <div className="verification-info">
          <strong>Email:</strong> {form.email}
        </div>
      </section>

      <section className="auth-card">
        <form onSubmit={submitVerification} className="auth-form">
          <Field label="Mã xác thực (6 số)">
            <input 
              type="text" 
              value={form.code} 
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))} 
              placeholder="Nhập 6 số"
              maxLength={6}
              style={{ fontSize: "1.5rem", textAlign: "center", letterSpacing: "0.5em" }}
            />
          </Field>
          
          {error ? <Alert type="error">{error}</Alert> : null}
          {success ? <Alert type="success">{success}</Alert> : null}
          
          <button className="primary-button" disabled={loading || form.code.length !== 6}>
            {loading ? "Đang xử lý..." : "Xác thực"}
          </button>
          
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <p style={{ marginBottom: "0.5rem", color: "#667085" }}>
              Không nhận được mã?
            </p>
            <button 
              type="button" 
              className="ghost-button" 
              onClick={resendCode}
              disabled={loading}
            >
              Gửi lại mã
            </button>
          </div>
          
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <Link to="/login" className="ghost-button">
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export function PasswordResetPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [form, setForm] = useState({ email, code: "", new_password: "", confirm_password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(email ? "reset" : "request"); // "request" or "reset"
  const navigate = useNavigate();

  const submitRequest = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      
      await api.post("/api/v1/auth/forgot-password", {
        email: form.email
      });
      
      setSuccess("Mã đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra email.");
      setStep("reset");
      
    } catch (err) {
      setError(getErrorMessage(err, "Không thể gửi mã đặt lại mật khẩu"));
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    
    if (form.new_password !== form.confirm_password) {
      setError("Mật khẩu mới và xác nhận mật khẩu không khớp!");
      return;
    }
    
    if (form.new_password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự!");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      await api.post("/api/v1/auth/reset-password", {
        email: form.email,
        code: form.code,
        new_password: form.new_password
      });
      
      setSuccess("Đặt lại mật khẩu thành công! Đang chuyển hướng...");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
      
    } catch (err) {
      setError(getErrorMessage(err, "Đặt lại mật khẩu thất bại"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <span className="eyebrow">Đặt lại mật khẩu</span>
        <h1>{step === "request" ? "Quên mật khẩu?" : "Nhập mã xác thực"}</h1>
        {step === "request" ? (
          <p>Nhập email của bạn để nhận mã đặt lại mật khẩu.</p>
        ) : (
          <p>Nhập mã 6 số đã được gửi đến email của bạn để đặt lại mật khẩu.</p>
        )}
        {step === "reset" && (
          <div className="verification-info">
            <strong>Email:</strong> {form.email}
          </div>
        )}
      </section>

      <section className="auth-card">
        {step === "request" ? (
          <form onSubmit={submitRequest} className="auth-form">
            <Field label="Email">
              <input 
                type="email" 
                value={form.email} 
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} 
                placeholder="Nhập email của bạn"
                required
              />
            </Field>
            
            {error ? <Alert type="error">{error}</Alert> : null}
            {success ? <Alert type="success">{success}</Alert> : null}
            
            <button className="primary-button" disabled={loading}>
              {loading ? "Đang xử lý..." : "Gửi mã đặt lại"}
            </button>
            
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <Link to="/login" className="ghost-button">
                Quay lại đăng nhập
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={submitReset} className="auth-form">
            <Field label="Mã xác thực (6 số)">
              <input 
                type="text" 
                value={form.code} 
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))} 
                placeholder="Nhập 6 số"
                maxLength={6}
                style={{ fontSize: "1.5rem", textAlign: "center", letterSpacing: "0.5em" }}
                required
              />
            </Field>
            
            <Field label="Mật khẩu mới">
              <input 
                type="password" 
                value={form.new_password} 
                onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))} 
                placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                required
              />
            </Field>
            
            <Field label="Xác nhận mật khẩu">
              <input 
                type="password" 
                value={form.confirm_password} 
                onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))} 
                placeholder="Nhập lại mật khẩu mới"
                required
              />
            </Field>
            
            {error ? <Alert type="error">{error}</Alert> : null}
            {success ? <Alert type="success">{success}</Alert> : null}
            
            <button className="primary-button" disabled={loading || form.code.length !== 6}>
              {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </button>
            
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button 
                type="button" 
                className="ghost-button" 
                onClick={() => setStep("request")}
                disabled={loading}
              >
                Gửi lại mã
              </button>
            </div>
            
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <Link to="/login" className="ghost-button">
                Quay lại đăng nhập
              </Link>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

export function BookingPage() {
  const doctors = useLoad("/api/v1/doctors");
  const services = useLoad("/api/v1/services");
  const { doctorId } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    doctor_id: doctorId || "",
    primary_service_id: "",
    service_ids: [],
    appointment_date: "",
    appointment_time: "",
    chief_complaint: "",
  });
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState("");
  const location = useLocation();

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const service = query.get("service");
    if (service) {
      setForm((prev) => ({ ...prev, primary_service_id: service, service_ids: [service] }));
    }
  }, [location.search]);

  useEffect(() => {
    if (doctorId) {
      setForm((prev) => ({ ...prev, doctor_id: doctorId }));
    }
  }, [doctorId]);

  useEffect(() => {
    if (!form.doctor_id || !form.appointment_date) return;
    api
      .get("/api/v1/appointments/available-slots", { params: { doctor_id: form.doctor_id, date: form.appointment_date } })
      .then((response) => setSlots(response.data.slots || []))
      .catch(() => setSlots([]));
  }, [form.doctor_id, form.appointment_date]);

  const selectedDoctor = doctors.find((item) => String(item.id) === String(form.doctor_id));
  const selectedServices = services.filter((item) => form.service_ids.includes(String(item.id)));
  const selectedServicesTotal = selectedServices.reduce((sum, item) => sum + Number(item.price || 0), 0);

  const toggleService = (serviceId) => {
    setForm((prev) => {
      const serviceKey = String(serviceId);
      const exists = prev.service_ids.includes(serviceKey);
      const service_ids = exists
        ? prev.service_ids.filter((item) => item !== serviceKey)
        : [...prev.service_ids, serviceKey];
      return {
        ...prev,
        service_ids,
        primary_service_id: service_ids[0] || "",
      };
    });
  };

  const submitBooking = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      navigate("/login", { state: { redirectTo: `/booking/${form.doctor_id}` } });
      return;
    }
    try {
      setError("");
      await api.post("/api/v1/appointments", {
        doctor_id: Number(form.doctor_id),
        primary_service_id: form.primary_service_id ? Number(form.primary_service_id) : null,
        service_ids: form.service_ids.map((item) => Number(item)),
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        duration_minutes: 30,
        chief_complaint: form.chief_complaint,
      });
      navigate("/patient");
    } catch (err) {
      setError(getErrorMessage(err, "Không thể tạo lịch hẹn"));
    }
  };

  return (
    <main className="public-page booking-page-bg">
      <div className="booking-split-card">
        <div className="booking-left-col">
          <h2>Bác sĩ: {selectedDoctor?.user?.full_name || "Vui lòng chọn"}</h2>
          <div className="doctor-details-text">
            <p><strong>Bác sĩ:</strong> {selectedDoctor?.user?.full_name || "—"}</p>
            <p><strong>Chuyên khoa:</strong> {selectedDoctor?.specialty || "—"}</p>
            <p><strong>Số điện thoại:</strong> {selectedDoctor?.user?.phone || "—"}</p>
            <p><strong>Email:</strong> {selectedDoctor?.user?.email || "—"}</p>
          </div>
        </div>

        <div className="booking-right-col">
          <h2>Đặt khám</h2>
          <form className="booking-form" onSubmit={submitBooking}>
            <Field label="Bác sĩ">
              <select value={form.doctor_id} onChange={(e) => setForm((p) => ({ ...p, doctor_id: e.target.value, appointment_time: "" }))}>
                <option value="">Chọn bác sĩ</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.user?.full_name} - {doctor.specialty}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Gói dịch vụ đăng ký">
              <div className="list-stack" style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #dbe4f0", borderRadius: 12, padding: 8 }}>
                {services.map((service) => {
                  const checked = form.service_ids.includes(String(service.id));
                  return (
                    <label key={service.id} style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", padding: "4px 0" }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleService(service.id)} />
                      <span style={{ fontSize: "0.9rem", lineHeight: "1.3", flex: 1 }}>
                        <strong style={{ fontSize: "0.9rem" }}>{service.name}</strong>
                        <div style={{ fontSize: "0.8rem", color: "#667085", margin: "2px 0" }}>{service.description}</div>
                        <small style={{ fontSize: "0.8rem" }}>{currency(service.price)}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </Field>

            <div className="doctor-details-text">
              <p><strong>Số dịch vụ đã chọn:</strong> {selectedServices.length}</p>
              <p><strong>Tổng tiền dịch vụ:</strong> {currency(selectedServicesTotal)}</p>
            </div>

            <Field label="Ngày khám:">
              <input type="date" value={form.appointment_date} onChange={(e) => setForm((p) => ({ ...p, appointment_date: e.target.value }))} />
            </Field>

            <p className="hint-text">Chỉ hiển thị các khung giờ chưa qua thời gian hiện tại.</p>

            <Field label="Giờ khám:">
              <select value={form.appointment_time} onChange={(e) => setForm((p) => ({ ...p, appointment_time: e.target.value }))}>
                 <option value="">Chọn giờ khám</option>
                 {slots.map(slot => (
                   <option key={slot.time} value={slot.time} disabled={!slot.available}>
                     {slot.time} - {slot.end_time} ({slot.label})
                   </option>
                 ))}
              </select>
            </Field>

            <Field label="Ghi chú (nếu có):">
              <textarea
                value={form.chief_complaint}
                onChange={(e) => setForm((p) => ({ ...p, chief_complaint: e.target.value }))}
                rows={4}
              />
            </Field>

            <button className="primary-button fill-btn" disabled={!form.appointment_time}>
              Đặt lịch
            </button>

            <div className="slot-legend custom-legend">
              <span className="legend-item"><span className="dot green"></span>Còn trống</span>
              <span className="legend-item"><span className="dot red"></span>Đã đặt</span>
            </div>

            {error ? <Alert type="error">{error}</Alert> : null}
          </form>
        </div>
      </div>
    </main>
  );
}
