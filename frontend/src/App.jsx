import { useEffect, useState, useMemo } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { api } from "./api/http";
import { ROLE_LABELS, currency } from "./utils/helpers";
import { StatCard, Alert } from "./components/shared/UI";

// Pages
import { HomePage, LoginPage, RegisterPage, DoctorsPage, ServicesPage } from "./pages/public/Pages";
import { PatientPortal } from "./pages/patient/PatientPortal";
import { DoctorPortal } from "./pages/doctor/DoctorPortal";
import { ReceptionistPortal } from "./pages/receptionist/ReceptionistPortal";
import { CashierPortal } from "./pages/cashier/CashierPortal";
import { PharmacistPortal } from "./pages/pharmacist/PharmacistPortal";
import { AdminPortal } from "./pages/admin/AdminPortal";

// ── App Shell ──────────────────────────────────────────
function AppShell({ children }) {
  const { user, isAuthenticated, logout } = useAuth();
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <div className="brand-logo">🏥</div>
          <div className="brand-text">
            <strong>QLPK Da Liễu</strong>
            <span>Hệ thống thông minh 2026</span>
          </div>
        </Link>
        <nav className="nav-links">
          <Link to="/">Trang chủ</Link>
          <Link to="/bac-si">Bác sĩ</Link>
          <Link to="/dich-vu">Dịch vụ</Link>
          {isAuthenticated ? (
             <>
               <Link to="/app" style={{ color: "var(--teal-1)" }}>
                  {user.role === 'admin' ? "Quản trị viên" : `Cổng ${ROLE_LABELS[user.role] || user.role}`}
               </Link>
               <button onClick={logout}>Đăng xuất</button>
             </>
          ) : (
            <Link to="/login" style={{ background: "rgba(99,179,237,0.1)", color: "var(--teal-1)" }}>Đăng nhập</Link>
          )}
        </nav>
      </header>
      {children}
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// ── Data Loader Custom Hook ────────────────────────────
function usePortalData(user) {
  const [state, setState] = useState({ loading: true, error: "", data: {} });

  const reload = async () => {
    try {
      setState(p => ({ ...p, loading: true, error: "" }));
      // Optimize data fetching based on roles
      const endpoints = ["/api/v1/reports/dashboard"];
      
      // Admin gets everything. Others get specific sets.
      if (user.role === "admin") {
         endpoints.push("/api/v1/appointments", "/api/v1/doctors", "/api/v1/services", "/api/v1/patients", "/api/v1/medicines", "/api/v1/prescriptions", "/api/v1/invoices", "/api/v1/notifications");
      } else if (user.role === "patient") {
         endpoints.push("/api/v1/appointments", "/api/v1/doctors", "/api/v1/services", "/api/v1/invoices", "/api/v1/notifications");
      } else if (user.role === "doctor") {
         endpoints.push("/api/v1/appointments", "/api/v1/medicines", "/api/v1/services", "/api/v1/notifications");
      } else if (user.role === "receptionist") {
         endpoints.push("/api/v1/appointments", "/api/v1/doctors", "/api/v1/services", "/api/v1/patients");
      } else if (user.role === "cashier") {
         endpoints.push("/api/v1/invoices");
      } else if (user.role === "pharmacist") {
         endpoints.push("/api/v1/medicines", "/api/v1/prescriptions");
      }

      const res = await Promise.all(endpoints.map(ep => api.get(ep).catch(() => ({ data: Array.isArray(ep.includes('dashboard') ? {} : []) ? [] : {} }))));
      
      const mapped = {};
      endpoints.forEach((ep, idx) => {
         const key = ep.split('/').pop();
         mapped[key === "dashboard" ? "dashboard" : key] = res[idx].data;
      });

      setState({ loading: false, error: "", data: mapped });
    } catch (err) {
      setState({ loading: false, error: err.message, data: {} });
    }
  };

  useEffect(() => { if (user) reload(); }, [user]);
  return { ...state, reload };
}

// ── Main Portal Component ──────────────────────────────
function PortalPage() {
  const { user } = useAuth();
  const { loading, error, data, reload } = usePortalData(user);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const runAction = async (cb) => {
    try {
      setMsg({ type: "", text: "" });
      await cb();
      setMsg({ type: "success", text: "Thao tác thành công! Đang tải lại dữ liệu..." });
      await reload();
      setTimeout(() => setMsg({ type:"", text:"" }), 3000);
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.detail || "Thất bại, có lỗi xảy ra." });
    }
  };

  if (!user) return <Navigate to="/login" replace />;

  const dash = data.dashboard || {};
  const notifs = data.notifications || [];

  return (
    <main className="page">
      <section className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="toolbar" style={{ marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.4rem" }}>Bảng điều khiển - Cổng {ROLE_LABELS[user.role]}</h2>
            <p className="muted">Xin chào, <strong>{user.full_name || user.email}</strong>. Chúc bạn một ngày làm việc hiệu quả.</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={reload} disabled={loading}>🔄 Tải lại dữ liệu</button>
        </div>
        
        {loading ? (
           <p className="muted">🔄 Đang tải các phân hệ...</p>
        ) : (
          <div className="stats-grid">
            <StatCard label="Lịch hôm nay" value={dash.today_appointments ?? "-"} />
            <StatCard label="Đang chờ" value={dash.waiting ?? "-"} />
            <StatCard label="Đang khám" value={dash.in_progress ?? "-"} />
            <StatCard label="Thu trong ngày" value={dash.paid_today != null ? currency(dash.paid_today) : "-"} />
          </div>
        )}
      </section>

      {msg.text && <Alert type={msg.type} style={{ marginBottom: "1.5rem" }}>{msg.text}</Alert>}

      <section className="content-grid" style={{ marginTop: 0 }}>
        {/* Sidebar Thông báo / Tiện ích */}
        <aside className="sidebar">
          <div className="panel">
            <div className="toolbar" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem", marginBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>🔔 Thông báo</h3>
              {notifs.some(n => !n.is_read) && (
                <button className="btn btn-sm btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                  onClick={() => runAction(() => api.patch("/api/v1/notifications/read-all"))}>Đã đọc hết</button>
              )}
            </div>
            {notifs.length === 0 ? <p className="muted" style={{ fontSize: "0.85rem" }}>Không có thông báo mới.</p> : (
              <div className="list-grid" style={{ gridTemplateColumns: "1fr", gap: "0.6rem" }}>
                {notifs.slice(0, 5).map(n => (
                  <div className="notif-item" key={n.id} onClick={() => !n.is_read && runAction(() => api.patch(`/api/v1/notifications/${n.id}/read`))} style={{ cursor: n.is_read ? 'default' : 'pointer' }}>
                    <div className={`notif-dot ${n.is_read ? 'read' : ''}`}></div>
                    <div>
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-msg">{n.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Nội dung chính theo Role */}
        <div className="main-content">
          {user.role === "patient" && <PatientPortal data={data} reload={reload} runAction={runAction} />}
          {user.role === "doctor" && <DoctorPortal data={data} reload={reload} runAction={runAction} />}
          {user.role === "receptionist" && <ReceptionistPortal data={data} reload={reload} runAction={runAction} />}
          {user.role === "cashier" && <CashierPortal data={data} reload={reload} runAction={runAction} />}
          {user.role === "pharmacist" && <PharmacistPortal data={data} reload={reload} runAction={runAction} />}
          {user.role === "admin" && <AdminPortal data={data} reload={reload} runAction={runAction} />}
        </div>
      </section>
    </main>
  );
}

// ── Root App ───────────────────────────────────────────
export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dich-vu" element={<ServicesPage />} />
        <Route path="/bac-si" element={<DoctorsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dang-ky" element={<RegisterPage />} />
        <Route path="/app" element={<ProtectedRoute><PortalPage /></ProtectedRoute>} />
      </Routes>
    </AppShell>
  );
}
