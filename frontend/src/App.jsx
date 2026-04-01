import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api/http";
import { useAuth } from "./auth";
import { Alert } from "./components/shared/UI";
import { ROLE_LABELS, roleHome } from "./utils/helpers";
import {
  BookingPage,
  DoctorsPage,
  LoginPage,
  ServicesPage,
} from "./pages/public/Pages";
import { Header } from "./components/Home/Header/Header";
import { Body as HomePageObj } from "./components/Home/Body/Body";
import { Footer } from "./components/Home/Footer/Footer";
import { PatientPortal } from "./pages/patient/PatientPortal";
import { DoctorPortal } from "./pages/doctor/DoctorPortal";
import { PharmacistPortal } from "./pages/pharmacist/PharmacistPortal";
import { AdminPortal } from "./pages/admin/AdminPortal";

function PublicLayout({ children }) {
  return (
    <div className="public-shell">
      <Header />
      {children}
      <Footer />
    </div>
  );
}

function DashboardLayout({ title, subtitle, tabs, activeTab, onActiveTabChange, children }) {
  const { user, logout } = useAuth();

  const renderNav = () => {
    if (tabs && tabs.length > 0) {
      return (
        <>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-link ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => onActiveTabChange?.(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          {user.role === "patient" && (
            <Link to="/" className="tab-link" style={{ marginTop: "16px" }}>
              Quay lại trang chủ
            </Link>
          )}
        </>
      );
    }
    return (
      <>
        <Link to={roleHome(user.role)}>Tổng quan</Link>
      </>
    );
  };

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <strong>{ROLE_LABELS[user.role]}</strong>
          <span>{user.full_name}</span>
        </div>
        <nav className="dashboard-nav">
          {renderNav()}
          <button type="button" className="ghost-button left logout-btn" onClick={logout}>
            Đăng xuất
          </button>
        </nav>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function ProtectedRoleRoute({ role, children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}

function AppRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(user.role)} replace />;
}

function useDashboardData(role) {
  const [state, setState] = useState({ loading: true, error: "", data: {} });

  const load = async () => {
    try {
      const requests = {
        patient: ["/api/v1/appointments", "/api/v1/doctors", "/api/v1/services", "/api/v1/invoices"],
        doctor: ["/api/v1/appointments", "/api/v1/patients", "/api/v1/medicines"],
        pharmacist: ["/api/v1/medicines", "/api/v1/prescriptions", "/api/v1/invoices", "/api/v1/suppliers", "/api/v1/appointments/completed-no-invoice"],
        admin: ["/api/v1/reports/dashboard", "/api/v1/doctors", "/api/v1/medicines", "/api/v1/admin/accounts", "/api/v1/holidays"],
      }[role] || [];

      const results = await Promise.all(requests.map((path) => api.get(path)));
      const data = {};
      requests.forEach((path, index) => {
        data[path] = results[index].data;
      });
      setState({ loading: false, error: "", data });
    } catch (error) {
      const detail = error.response?.data?.detail;
      const errStr = typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : error.message || "Không thể tải dữ liệu";
      setState({
        loading: false,
        error: errStr,
        data: {},
      });
    }
  };

  useEffect(() => {
    load();
  }, [role]);

  return { ...state, reload: load };
}

function PortalScreen({ role, title, subtitle, render }) {
  const { loading, error, data, reload } = useDashboardData(role);

  const TABS = {
    admin: [
      { id: "nhansu", label: "Nhân sự" },
      { id: "phongban", label: "Phòng ban" },
      { id: "luong", label: "Lương" },
      { id: "hopdong", label: "Hợp đồng" },
      { id: "danhmuc", label: "Danh mục" },
      { id: "nghiepvu", label: "Nghiệp vụ" },
      { id: "taikhoan", label: "Tài khoản" },
      { id: "thongke", label: "Thống kê" },
    ],
    doctor: [
      { id: "tongquan", label: "Tổng quan" },
      { id: "lichkham", label: "Lịch duyệt và khám" },
    ],
    pharmacist: [
      { id: "tongquan", label: "Tổng quan" },
      { id: "khothuoc", label: "Kho thuốc" },
      { id: "nhacungcap", label: "Nhà cung cấp" },
      { id: "hoadon", label: "Hóa đơn" },
      { id: "thanhtoan", label: "Thanh toán" },
    ],
    patient: [
      { id: "tongquan", label: "Tổng quan" },
    ],
  };

  const [activeTab, setActiveTab] = useState(TABS[role]?.[0]?.id || "tongquan");

  return (
    <ProtectedRoleRoute role={role}>
      <DashboardLayout
        title={title}
        subtitle={subtitle}
        tabs={TABS[role] || []}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
      >
        {error ? <Alert type="error">{error}</Alert> : null}
        {render({ loading, data, reload, activeTab, setActiveTab })}
      </DashboardLayout>
    </ProtectedRoleRoute>
  );
}

function LoginRoute() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (isAuthenticated) {
    const redirectTo = location.state?.redirectTo || roleHome(user.role);
    return <Navigate to={redirectTo} replace />;
  }
  return <LoginPage />;
}

export default function App() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (window.location.pathname === "/login") {
      navigate(roleHome(user.role), { replace: true });
    }
  }, [navigate, user]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicLayout>
            <HomePageObj />
          </PublicLayout>
        }
      />
      <Route
        path="/doctors"
        element={
          <PublicLayout>
            <DoctorsPage />
          </PublicLayout>
        }
      />
      <Route
        path="/services"
        element={
          <PublicLayout>
            <ServicesPage />
          </PublicLayout>
        }
      />
      <Route
        path="/booking"
        element={
          <PublicLayout>
            <BookingPage />
          </PublicLayout>
        }
      />
      <Route
        path="/booking/:doctorId"
        element={
          <PublicLayout>
            <BookingPage />
          </PublicLayout>
        }
      />
      <Route
        path="/login"
        element={
          <PublicLayout>
            <LoginRoute />
          </PublicLayout>
        }
      />
      <Route path="/app" element={<AppRedirect />} />
      <Route
        path="/patient"
        element={
          <PortalScreen
            role="patient"
            title="Khu bệnh nhân"
            subtitle="Theo dõi lịch hẹn, phản hồi từ bác sĩ và hóa đơn của bạn."
            render={({ loading, data, reload }) => <PatientPortal loading={loading} data={data} reload={reload} />}
          />
        }
      />
      <Route
        path="/doctor"
        element={
          <PortalScreen
            role="doctor"
            title="Điều khiển bác sĩ"
            subtitle="Duyệt lịch, khám bệnh, lập bệnh án và kê đơn."
            render={({ loading, data, reload, activeTab }) => <DoctorPortal loading={loading} data={data} reload={reload} activeTab={activeTab} />}
          />
        }
      />
      <Route
        path="/pharmacist"
        element={
          <PortalScreen
            role="pharmacist"
            title="Điều khiển dược sĩ"
            subtitle="Quản lý đơn thuốc, tồn kho, nhà cung cấp và thanh toán."
            render={({ loading, data, reload, activeTab }) => <PharmacistPortal loading={loading} data={data} reload={reload} activeTab={activeTab} />}
          />
        }
      />
      <Route
        path="/admin"
        element={
          <PortalScreen
            role="admin"
            title="Điều khiển quản trị"
            subtitle="Quản lý tài khoản, lịch khám và cấu hình vận hành."
            render={({ loading, data, reload, activeTab }) => <AdminPortal loading={loading} data={data} reload={reload} activeTab={activeTab} />}
          />
        }
      />
    </Routes>
  );
}
