import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "./api/http";
import { useAuth } from "./auth";

const roleLabels = {
  admin: "Quan tri",
  doctor: "Bac si",
  receptionist: "Le tan",
  cashier: "Thu ngan",
  pharmacist: "Duoc si",
  patient: "Benh nhan"
};

function currency(value) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value || 0));
}

function AppShell({ children }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <strong>QLPK Da Lieu</strong>
          <span>FastAPI + React cho phong kham da lieu</span>
        </div>
        <nav className="nav-links">
          <Link to="/">Trang chu</Link>
          <Link to="/doctors">Bac si</Link>
          <Link to="/services">Dich vu</Link>
          {isAuthenticated ? (
            <>
              <Link to="/app">Cong {roleLabels[user.role]}</Link>
              <button onClick={logout}>Dang xuat</button>
            </>
          ) : (
            <Link to="/login">Dang nhap</Link>
          )}
        </nav>
      </header>
      {children}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="muted">{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function EntitySection({ title, items, actions = [], onAction }) {
  return (
    <div className="panel">
      <h3>{title}</h3>
      <div className="list-grid">
        {items.length === 0 ? <p className="muted">Chua co du lieu.</p> : null}
        {items.map((item) => (
          <div className="card" key={item.id}>
            <h4>{item.name || item.full_name || item.invoice_number || item.patient_name || item.title || `#${item.id}`}</h4>
            {Object.entries(item)
              .filter(([key]) => !["id", "items", "transactions", "name"].includes(key))
              .slice(0, 6)
              .map(([key, value]) => (
                <p key={key} className="muted">
                  <strong>{key}</strong>: {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </p>
              ))}
            {actions.length > 0 ? (
              <div className="cta-row">
                {actions.map((action) => (
                  <button key={action.label} className="btn btn-secondary" onClick={() => onAction(() => action.run(item))}>
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PublicHome() {
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    Promise.all([api.get("/api/v1/doctors"), api.get("/api/v1/services")])
      .then(([doctorRes, serviceRes]) => {
        setDoctors(doctorRes.data.slice(0, 3));
        setServices(serviceRes.data.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <div className="panel headline">
          <span className="chip">Van hanh noi bo + cong benh nhan</span>
          <h1>He thong quan ly phong kham da lieu tu dat lich den thu tien va cap thuoc.</h1>
          <p className="muted">
            Frontend nay ket noi truc tiep vao backend FastAPI, ho tro luong benh nhan, bac si, le tan, thu ngan, duoc si va admin.
          </p>
          <div className="cta-row">
            <Link className="btn btn-primary" to="/login">
              Dang nhap he thong
            </Link>
            <Link className="btn btn-secondary" to="/services">
              Xem dich vu
            </Link>
          </div>
        </div>
        <div className="panel">
          <div className="stats-grid">
            <StatCard label="Vai tro he thong" value="6" />
            <StatCard label="Module chinh" value="Dat lich, kham, kho, hoa don" />
            <StatCard label="Kien truc" value="React + FastAPI + SQLAlchemy" />
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="sidebar">
          <div className="panel">
            <h3>Tai khoan demo</h3>
            <p className="muted">Admin: {`admin@qlpk.vn / Admin@123`}</p>
            <p className="muted">Doctor: {`doctor@qlpk.vn / Doctor@123`}</p>
            <p className="muted">Patient: {`patient@qlpk.vn / Patient@123`}</p>
            <p className="muted">Reception/Cashier/Pharmacist: {`... / Demo@123`}</p>
          </div>
        </div>
        <div className="main-content">
          <div className="panel">
            <h3>Bac si noi bat</h3>
            <div className="list-grid">
              {doctors.map((doctor) => (
                <div className="card" key={doctor.id}>
                  <h4>{doctor.user?.full_name}</h4>
                  <span className="chip">{doctor.specialty}</span>
                  <p className="muted">{doctor.bio || "Chua cap nhat gioi thieu"}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <h3>Dich vu</h3>
            <div className="list-grid">
              {services.map((service) => (
                <div className="card" key={service.id}>
                  <h4>{service.name}</h4>
                  <p className="muted">{service.category}</p>
                  <strong>{currency(service.price)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    api.get("/api/v1/doctors").then((res) => setDoctors(res.data));
  }, []);

  return (
    <main className="page">
      <div className="panel">
        <h2>Danh sach bac si</h2>
        <div className="list-grid">
          {doctors.map((doctor) => (
            <div className="card" key={doctor.id}>
              <h3>{doctor.user?.full_name}</h3>
              <span className="chip">{doctor.specialty}</span>
              <p className="muted">Phi kham: {currency(doctor.consultation_fee)}</p>
              <p>{doctor.bio || "Chua co mo ta."}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function ServicesPage() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    api.get("/api/v1/services").then((res) => setServices(res.data));
  }, []);

  return (
    <main className="page">
      <div className="panel">
        <h2>Danh sach dich vu</h2>
        <div className="list-grid">
          {services.map((service) => (
            <div className="card" key={service.id}>
              <h3>{service.name}</h3>
              <p className="muted">{service.category}</p>
              <p>{service.description || "Dich vu chuyen khoa da lieu."}</p>
              <strong>{currency(service.price)}</strong>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ email: "admin@qlpk.vn", password: "Admin@123" });
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      setError("");
      await login(form.email, form.password);
      navigate("/app");
    } catch (err) {
      setError(err.response?.data?.detail || "Dang nhap that bai");
    }
  };

  return (
    <main className="login-shell">
      <form className="panel" style={{ width: "min(460px, 92vw)" }} onSubmit={onSubmit}>
        <h2>Dang nhap he thong</h2>
        <p className="muted">Dang nhap bang tai khoan demo hoac tai khoan do ban tao.</p>
        <div className="form-grid">
          <Field label="Email">
            <input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          </Field>
          <Field label="Mat khau">
            <input type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
          </Field>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <div className="cta-row">
          <button className="btn btn-primary" type="submit">
            Dang nhap
          </button>
        </div>
      </form>
    </main>
  );
}

function usePortalData(user) {
  const [state, setState] = useState({ loading: true, error: "", data: {} });

  const reload = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: "" }));
      const requests = [
        api.get("/api/v1/reports/dashboard"),
        api.get("/api/v1/appointments"),
        api.get("/api/v1/doctors"),
        api.get("/api/v1/services"),
        api.get("/api/v1/patients").catch(() => ({ data: [] })),
        api.get("/api/v1/medicines").catch(() => ({ data: [] })),
        api.get("/api/v1/prescriptions").catch(() => ({ data: [] })),
        api.get("/api/v1/invoices").catch(() => ({ data: [] })),
        api.get("/api/v1/notifications").catch(() => ({ data: [] }))
      ];
      const [dashboard, appointments, doctors, services, patients, medicines, prescriptions, invoices, notifications] = await Promise.all(requests);
      setState({
        loading: false,
        error: "",
        data: {
          dashboard: dashboard.data,
          appointments: appointments.data,
          doctors: doctors.data,
          services: services.data,
          patients: patients.data,
          medicines: medicines.data,
          prescriptions: prescriptions.data,
          invoices: invoices.data,
          notifications: notifications.data
        }
      });
    } catch (err) {
      setState({ loading: false, error: err.response?.data?.detail || "Khong tai duoc du lieu", data: {} });
    }
  };

  useEffect(() => {
    if (user) {
      reload();
    }
  }, [user]);

  return { ...state, reload };
}

function PortalPage() {
  const { user, logout } = useAuth();
  const { loading, error, data, reload } = usePortalData(user);
  const [message, setMessage] = useState("");

  const dashboard = data.dashboard || {};
  const appointments = data.appointments || [];
  const doctors = data.doctors || [];
  const services = data.services || [];
  const patients = data.patients || [];
  const medicines = data.medicines || [];
  const prescriptions = data.prescriptions || [];
  const invoices = data.invoices || [];

  const [patientBooking, setPatientBooking] = useState({
    doctor_id: "",
    primary_service_id: "",
    appointment_date: "",
    appointment_time: "",
    chief_complaint: ""
  });
  const [quickPatient, setQuickPatient] = useState({ full_name: "", phone: "", gender: "", address: "" });
  const [walkIn, setWalkIn] = useState({ patient_name: "", patient_phone: "", doctor_id: "", primary_service_id: "", appointment_date: "", appointment_time: "" });
  const [recordForm, setRecordForm] = useState({ appointment_id: "", patient_id: "", doctor_id: "", diagnosis: "", symptoms: "" });
  const [prescriptionForm, setPrescriptionForm] = useState({ medical_record_id: "", patient_id: "", doctor_id: "", medicine_id: "", quantity: 1, dosage: "1 vien", frequency: "2 lan/ngay", unit_price: 0 });
  const [invoiceForm, setInvoiceForm] = useState({ appointment_id: "", discount_amount: 0, insurance_support_amount: 0 });
  const [paymentForm, setPaymentForm] = useState({ invoice_id: "", payment_method: "cash", amount: "" });
  const [doctorForm, setDoctorForm] = useState({ full_name: "", email: "", password: "Doctor@123", specialty: "Da lieu", license_number: "" });
  const [medicineForm, setMedicineForm] = useState({ name: "", unit: "hop", price_per_unit: 0, reorder_level: 50 });

  const roleSummary = useMemo(() => {
    switch (user.role) {
      case "patient":
        return "Dat lich, theo doi lich kham va xem thong bao.";
      case "doctor":
        return "Quan ly luong kham, benh an va don thuoc.";
      case "receptionist":
        return "Xac nhan lich, tao benh nhan moi, check-in va walk-in.";
      case "cashier":
        return "Lap hoa don, ghi nhan thanh toan, xu ly doi soat.";
      case "pharmacist":
        return "Chuan bi thuoc, cap phat va theo doi ton kho.";
      default:
        return "Quan tri toan bo he thong phong kham.";
    }
  }, [user.role]);

  const runAction = async (callback) => {
    try {
      setMessage("");
      await callback();
      setMessage("Da cap nhat thanh cong.");
      await reload();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Thao tac that bai.");
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="page">
      <section className="panel">
        <div className="toolbar">
          <div>
            <h2>Cong van hanh {roleLabels[user.role]}</h2>
            <p className="muted">{roleSummary}</p>
          </div>
          <div className="cta-row">
            <button className="btn btn-secondary" onClick={reload}>Tai lai</button>
            <button className="btn btn-primary" onClick={logout}>Dang xuat</button>
          </div>
        </div>
        <div className="stats-grid">
          <StatCard label="Lich hom nay" value={dashboard.today_appointments ?? "-"} />
          <StatCard label="Dang cho" value={dashboard.waiting ?? "-"} />
          <StatCard label="Dang kham" value={dashboard.in_progress ?? "-"} />
          <StatCard label="Thu trong ngay" value={dashboard.paid_today ? currency(dashboard.paid_today) : "-"} />
        </div>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className={message.includes("thanh cong") ? "success" : "error"}>{message}</p> : null}
      {loading ? <p className="muted">Dang tai du lieu...</p> : null}

      <section className="content-grid">
        <aside className="sidebar">
          <div className="panel">
            <h3>Thong bao</h3>
            <div className="list-grid" style={{ gridTemplateColumns: "1fr" }}>
              {(data.notifications || []).slice(0, 5).map((item) => (
                <div className="card" key={item.id}>
                  <strong>{item.title}</strong>
                  <p className="muted">{item.message}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
        <div className="main-content">
          {renderRoleContent({
            user,
            appointments,
            doctors,
            services,
            patients,
            medicines,
            prescriptions,
            invoices,
            patientBooking,
            setPatientBooking,
            quickPatient,
            setQuickPatient,
            walkIn,
            setWalkIn,
            recordForm,
            setRecordForm,
            prescriptionForm,
            setPrescriptionForm,
            invoiceForm,
            setInvoiceForm,
            paymentForm,
            setPaymentForm,
            doctorForm,
            setDoctorForm,
            medicineForm,
            setMedicineForm,
            runAction
          })}
        </div>
      </section>
    </main>
  );
}

function renderRoleContent(ctx) {
  const {
    user,
    appointments,
    doctors,
    services,
    patients,
    medicines,
    prescriptions,
    invoices,
    patientBooking,
    setPatientBooking,
    quickPatient,
    setQuickPatient,
    walkIn,
    setWalkIn,
    recordForm,
    setRecordForm,
    prescriptionForm,
    setPrescriptionForm,
    invoiceForm,
    setInvoiceForm,
    paymentForm,
    setPaymentForm,
    doctorForm,
    setDoctorForm,
    medicineForm,
    setMedicineForm,
    runAction
  } = ctx;

  if (user.role === "patient") {
    return (
      <>
        <div className="panel">
          <h3>Dat lich moi</h3>
          <div className="form-grid">
            <Field label="Bac si">
              <select value={patientBooking.doctor_id} onChange={(e) => setPatientBooking((prev) => ({ ...prev, doctor_id: e.target.value }))}>
                <option value="">Chon bac si</option>
                {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.user?.full_name}</option>)}
              </select>
            </Field>
            <Field label="Dich vu">
              <select value={patientBooking.primary_service_id} onChange={(e) => setPatientBooking((prev) => ({ ...prev, primary_service_id: e.target.value }))}>
                <option value="">Chon dich vu</option>
                {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
              </select>
            </Field>
            <Field label="Ngay"><input type="date" value={patientBooking.appointment_date} onChange={(e) => setPatientBooking((prev) => ({ ...prev, appointment_date: e.target.value }))} /></Field>
            <Field label="Gio"><input type="time" value={patientBooking.appointment_time} onChange={(e) => setPatientBooking((prev) => ({ ...prev, appointment_time: e.target.value }))} /></Field>
          </div>
          <Field label="Ly do kham">
            <textarea value={patientBooking.chief_complaint} onChange={(e) => setPatientBooking((prev) => ({ ...prev, chief_complaint: e.target.value }))} />
          </Field>
          <div className="cta-row">
            <button className="btn btn-primary" onClick={() => runAction(() => api.post("/api/v1/appointments", { ...patientBooking, doctor_id: Number(patientBooking.doctor_id), primary_service_id: Number(patientBooking.primary_service_id) || null }))}>Dat lich</button>
          </div>
        </div>
        <EntitySection title="Lich hen cua toi" items={appointments} />
      </>
    );
  }

  if (user.role === "doctor") {
    return (
      <>
        <EntitySection title="Danh sach lich kham" items={appointments} />
        <div className="panel">
          <h3>Tao benh an</h3>
          <div className="form-grid">
            <Field label="Appointment ID"><input value={recordForm.appointment_id} onChange={(e) => setRecordForm((p) => ({ ...p, appointment_id: e.target.value }))} /></Field>
            <Field label="Patient ID"><input value={recordForm.patient_id} onChange={(e) => setRecordForm((p) => ({ ...p, patient_id: e.target.value }))} /></Field>
            <Field label="Doctor ID"><input value={recordForm.doctor_id} onChange={(e) => setRecordForm((p) => ({ ...p, doctor_id: e.target.value }))} /></Field>
          </div>
          <Field label="Chan doan"><input value={recordForm.diagnosis} onChange={(e) => setRecordForm((p) => ({ ...p, diagnosis: e.target.value }))} /></Field>
          <Field label="Trieu chung"><textarea value={recordForm.symptoms} onChange={(e) => setRecordForm((p) => ({ ...p, symptoms: e.target.value }))} /></Field>
          <button className="btn btn-primary" onClick={() => runAction(() => api.post("/api/v1/medical-records", { ...recordForm, appointment_id: Number(recordForm.appointment_id), patient_id: Number(recordForm.patient_id), doctor_id: Number(recordForm.doctor_id) }))}>Luu benh an</button>
        </div>
        <div className="panel">
          <h3>Tao don thuoc nhanh</h3>
          <div className="form-grid">
            <Field label="Medical record ID"><input value={prescriptionForm.medical_record_id} onChange={(e) => setPrescriptionForm((p) => ({ ...p, medical_record_id: e.target.value }))} /></Field>
            <Field label="Patient ID"><input value={prescriptionForm.patient_id} onChange={(e) => setPrescriptionForm((p) => ({ ...p, patient_id: e.target.value }))} /></Field>
            <Field label="Doctor ID"><input value={prescriptionForm.doctor_id} onChange={(e) => setPrescriptionForm((p) => ({ ...p, doctor_id: e.target.value }))} /></Field>
            <Field label="Thuoc">
              <select value={prescriptionForm.medicine_id} onChange={(e) => setPrescriptionForm((p) => ({ ...p, medicine_id: e.target.value }))}>
                <option value="">Chon thuoc</option>
                {medicines.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="form-grid">
            <Field label="So luong"><input type="number" value={prescriptionForm.quantity} onChange={(e) => setPrescriptionForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></Field>
            <Field label="Lieu dung"><input value={prescriptionForm.dosage} onChange={(e) => setPrescriptionForm((p) => ({ ...p, dosage: e.target.value }))} /></Field>
            <Field label="Tan suat"><input value={prescriptionForm.frequency} onChange={(e) => setPrescriptionForm((p) => ({ ...p, frequency: e.target.value }))} /></Field>
            <Field label="Don gia"><input type="number" value={prescriptionForm.unit_price} onChange={(e) => setPrescriptionForm((p) => ({ ...p, unit_price: Number(e.target.value) }))} /></Field>
          </div>
          <button className="btn btn-primary" onClick={() => runAction(() => api.post("/api/v1/prescriptions", { medical_record_id: Number(prescriptionForm.medical_record_id), patient_id: Number(prescriptionForm.patient_id), doctor_id: Number(prescriptionForm.doctor_id), items: [{ medicine_id: Number(prescriptionForm.medicine_id), quantity: Number(prescriptionForm.quantity), dosage: prescriptionForm.dosage, frequency: prescriptionForm.frequency, unit_price: Number(prescriptionForm.unit_price) }] }))}>Tao don thuoc</button>
        </div>
      </>
    );
  }

  if (user.role === "receptionist") {
    return (
      <>
        <EntitySection title="Hang doi lich kham" items={appointments} actions={[{ label: "Confirm", run: (item) => api.patch(`/api/v1/appointments/${item.id}/confirm`) }, { label: "Check-in", run: (item) => api.patch(`/api/v1/appointments/${item.id}/check-in`) }, { label: "No-show", run: (item) => api.patch(`/api/v1/appointments/${item.id}/no-show`) }]} onAction={runAction} />
        <div className="panel">
          <h3>Tao nhanh benh nhan</h3>
          <div className="form-grid">
            <Field label="Ho ten"><input value={quickPatient.full_name} onChange={(e) => setQuickPatient((p) => ({ ...p, full_name: e.target.value }))} /></Field>
            <Field label="So dien thoai"><input value={quickPatient.phone} onChange={(e) => setQuickPatient((p) => ({ ...p, phone: e.target.value }))} /></Field>
            <Field label="Gioi tinh"><input value={quickPatient.gender} onChange={(e) => setQuickPatient((p) => ({ ...p, gender: e.target.value }))} /></Field>
            <Field label="Dia chi"><input value={quickPatient.address} onChange={(e) => setQuickPatient((p) => ({ ...p, address: e.target.value }))} /></Field>
          </div>
          <button className="btn btn-primary" onClick={() => runAction(() => api.post("/api/v1/patients/quick-create", quickPatient))}>Tao benh nhan</button>
        </div>
        <div className="panel">
          <h3>Tao lich walk-in</h3>
          <div className="form-grid">
            <Field label="Ho ten"><input value={walkIn.patient_name} onChange={(e) => setWalkIn((p) => ({ ...p, patient_name: e.target.value }))} /></Field>
            <Field label="Dien thoai"><input value={walkIn.patient_phone} onChange={(e) => setWalkIn((p) => ({ ...p, patient_phone: e.target.value }))} /></Field>
            <Field label="Bac si"><select value={walkIn.doctor_id} onChange={(e) => setWalkIn((p) => ({ ...p, doctor_id: e.target.value }))}><option value="">Chon bac si</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.user?.full_name}</option>)}</select></Field>
            <Field label="Dich vu"><select value={walkIn.primary_service_id} onChange={(e) => setWalkIn((p) => ({ ...p, primary_service_id: e.target.value }))}><option value="">Chon dich vu</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></Field>
            <Field label="Ngay"><input type="date" value={walkIn.appointment_date} onChange={(e) => setWalkIn((p) => ({ ...p, appointment_date: e.target.value }))} /></Field>
            <Field label="Gio"><input type="time" value={walkIn.appointment_time} onChange={(e) => setWalkIn((p) => ({ ...p, appointment_time: e.target.value }))} /></Field>
          </div>
          <button className="btn btn-primary" onClick={() => runAction(() => api.post("/api/v1/appointments/walk-in", { ...walkIn, doctor_id: Number(walkIn.doctor_id), primary_service_id: Number(walkIn.primary_service_id) || null }))}>Tao walk-in</button>
        </div>
      </>
    );
  }

  if (user.role === "cashier") {
    return (
      <>
        <EntitySection title="Hoa don" items={invoices} />
        <div className="panel">
          <h3>Lap hoa don</h3>
          <div className="form-grid">
            <Field label="Appointment ID"><input value={invoiceForm.appointment_id} onChange={(e) => setInvoiceForm((p) => ({ ...p, appointment_id: e.target.value }))} /></Field>
            <Field label="Giam gia"><input type="number" value={invoiceForm.discount_amount} onChange={(e) => setInvoiceForm((p) => ({ ...p, discount_amount: Number(e.target.value) }))} /></Field>
            <Field label="Ho tro"><input type="number" value={invoiceForm.insurance_support_amount} onChange={(e) => setInvoiceForm((p) => ({ ...p, insurance_support_amount: Number(e.target.value) }))} /></Field>
          </div>
          <button className="btn btn-primary" onClick={() => runAction(() => api.post(`/api/v1/invoices/generate/${invoiceForm.appointment_id}`, { discount_amount: Number(invoiceForm.discount_amount), insurance_support_amount: Number(invoiceForm.insurance_support_amount) }))}>Tao hoa don</button>
        </div>
        <div className="panel">
          <h3>Thanh toan</h3>
          <div className="form-grid">
            <Field label="Invoice ID"><input value={paymentForm.invoice_id} onChange={(e) => setPaymentForm((p) => ({ ...p, invoice_id: e.target.value }))} /></Field>
            <Field label="Phuong thuc"><select value={paymentForm.payment_method} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_method: e.target.value }))}><option value="cash">Tien mat</option><option value="card">The</option><option value="transfer">Chuyen khoan</option><option value="insurance_support">Ho tro noi bo</option></select></Field>
            <Field label="So tien"><input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} /></Field>
          </div>
          <button className="btn btn-primary" onClick={() => runAction(() => api.patch(`/api/v1/invoices/${paymentForm.invoice_id}/pay`, { payment_method: paymentForm.payment_method, amount: Number(paymentForm.amount) }))}>Ghi nhan thanh toan</button>
        </div>
      </>
    );
  }

  if (user.role === "pharmacist") {
    return (
      <>
        <EntitySection title="Don thuoc" items={prescriptions} actions={[{ label: "Prepare", run: (item) => api.patch(`/api/v1/prescriptions/${item.id}/prepare`) }, { label: "Release", run: (item) => api.patch(`/api/v1/prescriptions/${item.id}/release`) }, { label: "Dispense", run: (item) => api.patch(`/api/v1/prescriptions/${item.id}/dispense`) }]} onAction={runAction} />
        <EntitySection title="Ton kho thuoc" items={medicines} />
      </>
    );
  }

  return (
    <>
      <EntitySection title="Bac si" items={doctors} />
      <EntitySection title="Benh nhan" items={patients} />
      <EntitySection title="Thuoc" items={medicines} />
      <div className="panel">
        <h3>Tao bac si</h3>
        <div className="form-grid">
          <Field label="Ho ten"><input value={doctorForm.full_name} onChange={(e) => setDoctorForm((p) => ({ ...p, full_name: e.target.value }))} /></Field>
          <Field label="Email"><input value={doctorForm.email} onChange={(e) => setDoctorForm((p) => ({ ...p, email: e.target.value }))} /></Field>
          <Field label="Mat khau"><input value={doctorForm.password} onChange={(e) => setDoctorForm((p) => ({ ...p, password: e.target.value }))} /></Field>
          <Field label="Chuyen khoa"><input value={doctorForm.specialty} onChange={(e) => setDoctorForm((p) => ({ ...p, specialty: e.target.value }))} /></Field>
          <Field label="So chung chi"><input value={doctorForm.license_number} onChange={(e) => setDoctorForm((p) => ({ ...p, license_number: e.target.value }))} /></Field>
        </div>
        <button className="btn btn-primary" onClick={() => runAction(() => api.post("/api/v1/doctors", doctorForm))}>Them bac si</button>
      </div>
      <div className="panel">
        <h3>Tao thuoc</h3>
        <div className="form-grid">
          <Field label="Ten thuoc"><input value={medicineForm.name} onChange={(e) => setMedicineForm((p) => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Don vi"><input value={medicineForm.unit} onChange={(e) => setMedicineForm((p) => ({ ...p, unit: e.target.value }))} /></Field>
          <Field label="Gia"><input type="number" value={medicineForm.price_per_unit} onChange={(e) => setMedicineForm((p) => ({ ...p, price_per_unit: Number(e.target.value) }))} /></Field>
          <Field label="Muc canh bao"><input type="number" value={medicineForm.reorder_level} onChange={(e) => setMedicineForm((p) => ({ ...p, reorder_level: Number(e.target.value) }))} /></Field>
        </div>
        <button className="btn btn-primary" onClick={() => runAction(() => api.post("/api/v1/medicines", medicineForm))}>Them thuoc</button>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/doctors" element={<DoctorsPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app" element={<ProtectedRoute><PortalPage /></ProtectedRoute>} />
      </Routes>
    </AppShell>
  );
}
