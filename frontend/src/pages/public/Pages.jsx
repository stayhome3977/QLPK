import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/http";
import { useAuth } from "../../auth";
import { Field, Panel, Alert, EmptyState } from "../../components/shared/UI";
import { fmtDate, currency, STATUS_LABELS, statusClass } from "../../utils/helpers";

// ── Trang chủ public ────────────────────────────────────
export function HomePage() {
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    setLoaded(true);
    Promise.all([api.get("/api/v1/doctors"), api.get("/api/v1/services")])
      .then(([dr, sv]) => { setDoctors(dr.data.slice(0, 3)); setServices(sv.data.slice(0, 4)); })
      .catch(() => {});
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="panel headline">
          <span className="chip chip-blue">Hệ thống quản lý phòng khám · 2026</span>
          <h1>Quản lý phòng khám da liễu từ đặt lịch đến cấp thuốc</h1>
          <p className="muted">
            Hệ thống bao gồm 6 vai trò: Bệnh nhân, Bác sĩ, Lễ tân, Thu ngân, Dược sĩ và Admin. 
            Kết nối trực tiếp MySQL qua FastAPI.
          </p>
          <div className="cta-row">
            <Link className="btn btn-primary" to="/login">Đăng nhập hệ thống</Link>
            <Link className="btn btn-secondary" to="/dich-vu">Xem dịch vụ</Link>
          </div>
        </div>
        <div className="panel">
          <h3>Tài khoản demo</h3>
          {[
            ["🔐 Admin",      "admin@qlpk.vn",       "Admin@123"],
            ["👨‍⚕️ Bác sĩ",   "doctor@qlpk.vn",      "Doctor@123"],
            ["🧑‍💼 Lễ tân",   "reception@qlpk.vn",   "Demo@123"],
            ["💰 Thu ngân",   "cashier@qlpk.vn",     "Demo@123"],
            ["💊 Dược sĩ",    "pharmacist@qlpk.vn",  "Demo@123"],
            ["🧑‍🤒 Bệnh nhân","patient@qlpk.vn",     "Patient@123"],
          ].map(([role, email, pass]) => (
            <div key={email} style={{ display:"flex", justifyContent:"space-between", padding:"0.5rem 0", borderBottom:"1px solid var(--border)" }}>
              <span>{role}</span>
              <span className="muted" style={{ fontSize:"0.82rem" }}>{email} / {pass}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="content-grid">
        <div className="sidebar">
          <div className="panel">
            <div className="stats-grid" style={{ gridTemplateColumns:"1fr 1fr" }}>
              <div className="stat-card"><div className="label">Vai trò</div><div className="value">6</div></div>
              <div className="stat-card"><div className="label">Module</div><div className="value">8</div></div>
              <div className="stat-card"><div className="label">Bảng DB</div><div className="value">16</div></div>
              <div className="stat-card"><div className="label">API</div><div className="value small">60+</div></div>
            </div>
          </div>
        </div>
        <div className="main-content">
          <div className="panel">
            <h3>Bác sĩ nổi bật</h3>
            <div className="list-grid">
              {doctors.map((d) => (
                <div className="card" key={d.id}>
                  <h4>{d.user?.full_name}</h4>
                  <span className="chip chip-blue">{d.specialty}</span>
                  <p className="muted">{d.bio || "Chuyên khoa da liễu"}</p>
                  <span className="muted" style={{ fontSize:"0.8rem" }}>Phí khám: {currency(d.consultation_fee)}</span>
                </div>
              ))}
              {doctors.length === 0 && <p className="muted">Đang tải...</p>}
            </div>
          </div>
          <div className="panel">
            <h3>Dịch vụ phòng khám</h3>
            <div className="list-grid">
              {services.map((s) => (
                <div className="card" key={s.id}>
                  <h4>{s.name}</h4>
                  <span className="chip chip-purple">{s.category}</span>
                  <strong style={{ color:"var(--teal-1)" }}>{currency(s.price)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// ── Đăng nhập ────────────────────────────────────────────
export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ email: "admin@qlpk.vn", password: "Admin@123" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) { navigate("/app", { replace: true }); return null; }

  const onSubmit = async (e) => {
    e.preventDefault();
    try { setError(""); setLoading(true); await login(form.email, form.password); navigate("/app"); }
    catch (err) { setError(err.response?.data?.detail || "Đăng nhập thất bại. Kiểm tra lại email và mật khẩu."); }
    finally { setLoading(false); }
  };

  return (
    <main className="login-shell">
      <div className="login-card">
        <div style={{ marginBottom:"1.5rem" }}>
          <h2>Đăng nhập</h2>
          <p className="muted">Hệ thống Quản Lý Phòng Khám Da Liễu</p>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-grid" style={{ gridTemplateColumns:"1fr", gap:"0.85rem" }}>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@qlpk.vn" />
            </Field>
            <Field label="Mật khẩu">
              <input type="password" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
            </Field>
          </div>
          {error && <Alert type="error" style={{ marginTop:"0.75rem" }}>{error}</Alert>}
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width:"100%", marginTop:"1.25rem", padding:"0.8rem" }}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        <hr className="divider" />
        <p className="muted" style={{ textAlign:"center", fontSize:"0.85rem" }}>
          Chưa có tài khoản? <Link to="/dang-ky" style={{ color:"var(--teal-1)" }}>Đăng ký bệnh nhân</Link>
        </p>
      </div>
    </main>
  );
}

// ── Đăng ký bệnh nhân ───────────────────────────────────
export function RegisterPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ full_name:"", email:"", password:"", phone:"", gender:"", date_of_birth:"", address:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) { navigate("/app", { replace: true }); return null; }

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(""); setLoading(true);
      const payload = { ...form };
      if (!payload.date_of_birth) delete payload.date_of_birth;
      if (!payload.gender) delete payload.gender;
      await api.post("/api/v1/auth/register", payload);
      await login(form.email, form.password);
      navigate("/app");
    } catch (err) {
      setError(err.response?.data?.detail || "Đăng ký thất bại.");
    } finally { setLoading(false); }
  };

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <main className="login-shell">
      <div className="login-card" style={{ width:"min(560px,100%)" }}>
        <div style={{ marginBottom:"1.5rem" }}>
          <h2>Đăng ký bệnh nhân</h2>
          <p className="muted">Tạo tài khoản để đặt lịch khám trực tuyến</p>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <Field label="Họ và tên"><input required value={form.full_name} onChange={f("full_name")} placeholder="Nguyễn Văn A" /></Field>
            <Field label="Email"><input type="email" required value={form.email} onChange={f("email")} placeholder="email@gmail.com" /></Field>
            <Field label="Mật khẩu"><input type="password" required minLength={8} value={form.password} onChange={f("password")} placeholder="Tối thiểu 8 ký tự" /></Field>
            <Field label="Số điện thoại"><input value={form.phone} onChange={f("phone")} placeholder="09xxxxxxxx" /></Field>
            <Field label="Ngày sinh"><input type="date" value={form.date_of_birth} onChange={f("date_of_birth")} /></Field>
            <Field label="Giới tính">
              <select value={form.gender} onChange={f("gender")}>
                <option value="">-- Chọn --</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </Field>
          </div>
          <Field label="Địa chỉ">
            <input value={form.address} onChange={f("address")} placeholder="Số nhà, đường, quận, thành phố" />
          </Field>
          {error && <Alert type="error" style={{ marginTop:"0.75rem" }}>{error}</Alert>}
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width:"100%", marginTop:"1.25rem", padding:"0.8rem" }}>
            {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
          </button>
        </form>
        <hr className="divider" />
        <p className="muted" style={{ textAlign:"center", fontSize:"0.85rem" }}>
          Đã có tài khoản? <Link to="/login" style={{ color:"var(--teal-1)" }}>Đăng nhập</Link>
        </p>
      </div>
    </main>
  );
}

// ── Danh sách bác sĩ ────────────────────────────────────
export function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loaded, setLoaded] = useState(false);
  if (!loaded) { setLoaded(true); api.get("/api/v1/doctors").then((r) => setDoctors(r.data)).catch(() => {}); }
  return (
    <main className="page">
      <div className="panel">
        <h2 style={{ marginBottom:"1.25rem" }}>Đội ngũ bác sĩ</h2>
        <div className="list-grid">
          {doctors.map((d) => (
            <div className="card" key={d.id}>
              <div style={{ display:"flex", gap:"0.75rem", alignItems:"flex-start" }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,var(--teal-2),var(--teal-3))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem", flexShrink:0 }}>👨‍⚕️</div>
                <div>
                  <h4>{d.user?.full_name}</h4>
                  <span className="chip chip-blue" style={{ marginTop:"0.25rem" }}>{d.specialty}</span>
                </div>
              </div>
              <p className="muted">{d.bio || "Chuyên khoa da liễu và thẩm mỹ da."}</p>
              <div style={{ display:"flex", justifyContent:"space-between", paddingTop:"0.5rem", borderTop:"1px solid var(--border)" }}>
                <span className="muted" style={{ fontSize:"0.82rem" }}>{d.degree} · {d.experience_years} năm KN</span>
                <strong style={{ color:"var(--teal-1)", fontSize:"0.9rem" }}>{currency(d.consultation_fee)}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// ── Danh sách dịch vụ ────────────────────────────────────
export function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loaded, setLoaded] = useState(false);
  if (!loaded) { setLoaded(true); api.get("/api/v1/services").then((r) => setServices(r.data)).catch(() => {}); }
  return (
    <main className="page">
      <div className="panel">
        <h2 style={{ marginBottom:"1.25rem" }}>Dịch vụ phòng khám</h2>
        <div className="list-grid">
          {services.map((s) => (
            <div className="card" key={s.id}>
              <h4>{s.name}</h4>
              <span className="chip chip-purple">{s.category}</span>
              <p className="muted">{s.description || "Dịch vụ chuyên khoa da liễu."}</p>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:"0.5rem", borderTop:"1px solid var(--border)" }}>
                <span className="muted" style={{ fontSize:"0.82rem" }}>⏱ {s.duration} phút</span>
                <strong style={{ color:"var(--teal-1)" }}>{currency(s.price)}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
