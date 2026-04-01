import { useState, useMemo, useRef, useEffect } from "react";
import { api } from "../../api/http";
import { Field, AppointmentTable, Tabs } from "../../components/shared/UI";
import { fmtDate, fmtDateTime, currency, STATUS_LABELS } from "../../utils/helpers";

function useSplitter(initialTopHeight = 350) {
  const [topHeight, setTopHeight] = useState(initialTopHeight);
  const isDragging = useRef(false);

  const startDrag = (e) => {
    isDragging.current = true;
    document.body.style.cursor = "row-resize";
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      // We assume split-pane container has a known pos, but simplest is taking clientY relative offset
      // Since header and other layout is above, just bounded delta is fine
      // Simple absolute height based on Y coord (rough estimate, 120 is topbar + padding spacing):
      let h = e.clientY - 140; 
      if (h < 150) h = 150;
      if (h > 800) h = 800;
      setTopHeight(h);
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "default";
    };
    
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return { topHeight, startDrag };
}

export function ReceptionistPortal({ data, reload, runAction }) {
  const appointments = data.appointments || [];
  const doctors = data.doctors || [];
  const services = data.services || [];

  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("general");
  
  // Lọc dữ liệu
  const [filter, setFilter] = useState({ date: "", doctor_id: "", status: "", search: "" });
  
  const { topHeight, startDrag } = useSplitter(300);

  // States for Quick Actions
  const [walkIn, setWalkIn] = useState({ patient_name: "", patient_phone: "", doctor_id: "", primary_service_id: "", appointment_date: "", appointment_time: "" });
  const [quickPatient, setQuickPatient] = useState({ full_name: "", phone: "", gender: "", address: "" });

  const selectedAppt = useMemo(() => appointments.find(a => a.id === selectedId), [appointments, selectedId]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      if (filter.date && !a.appointment_date?.startsWith(filter.date)) return false;
      if (filter.doctor_id && a.doctor_id !== Number(filter.doctor_id)) return false;
      if (filter.status && a.status !== filter.status) return false;
      if (filter.search) {
        const query = filter.search.toLowerCase();
        const pt = (a.patient_name || "").toLowerCase();
        return pt.includes(query);
      }
      return true;
    });
  }, [appointments, filter]);

  // Actions
  const handleAction = (urlLabel, urlAction, id = selectedId) => {
    if (!id) return;
    runAction(() => api.patch(`/api/v1/appointments/${id}/${urlAction}`));
  };

  const addWalkIn = () => runAction(() => api.post("/api/v1/appointments/walk-in", {
    ...walkIn,
    doctor_id: Number(walkIn.doctor_id),
    primary_service_id: Number(walkIn.primary_service_id) || null,
  }).then(() => {
    setWalkIn({ patient_name: "", patient_phone: "", doctor_id: "", primary_service_id: "", appointment_date: "", appointment_time: "" });
  }));

  const addQuickPatient = () => runAction(() => api.post("/api/v1/patients/quick-create", quickPatient).then(() => {
    setQuickPatient({ full_name: "", phone: "", gender: "", address: "" });
  }));

  // Enable/Disable Rules
  const canConfirm = selectedAppt?.status === "pending";
  const canCheckIn = selectedAppt?.status === "confirmed";
  const canStart = selectedAppt?.status === "checked_in";
  // Complete is usually done by doctor, but keeping it per spec
  const canComplete = selectedAppt?.status === "in_progress"; 
  const canReschedule = ["pending", "confirmed"].includes(selectedAppt?.status);
  const canCancel = ["pending", "confirmed", "checked_in"].includes(selectedAppt?.status);

  // Tabs Configuration
  const tabs = [
    {
      id: "general",
      label: "📋 Thông tin chung",
      content: selectedAppt ? (
        <div className="form-grid" style={{ maxWidth: 800 }}>
          <Field label="Mã lịch"><input value={`#${selectedAppt.id}`} readOnly disabled/></Field>
          <Field label="Bệnh nhân"><input value={selectedAppt.patient_name || ""} readOnly disabled/></Field>
          <Field label="Bác sĩ"><input value={selectedAppt.doctor_name || ""} readOnly disabled/></Field>
          <Field label="Trạng thái"><input value={STATUS_LABELS[selectedAppt.status] || selectedAppt.status} readOnly disabled/></Field>
          <Field label="Ngày khám"><input type="date" value={selectedAppt.appointment_date || ""} readOnly disabled/></Field>
          <Field label="Giờ khám"><input type="time" value={(selectedAppt.appointment_time || "").slice(0,5)} readOnly disabled/></Field>
        </div>
      ) : (
        <p className="muted">Vui lòng chọn một lịch hẹn từ bảng phía trên để xem chi tiết.</p>
      )
    },
    {
      id: "create_walkin",
      label: "🚶 Kê Lịch Walk-in",
      content: (
        <div style={{ maxWidth: 900 }}>
          <div className="form-grid">
            <Field label="Tên bệnh nhân"><input value={walkIn.patient_name} onChange={e => setWalkIn(p => ({...p, patient_name: e.target.value}))}/></Field>
            <Field label="SĐT bệnh nhân"><input value={walkIn.patient_phone} onChange={e => setWalkIn(p => ({...p, patient_phone: e.target.value}))}/></Field>
            <Field label="Bác sĩ">
              <select value={walkIn.doctor_id} onChange={e => setWalkIn(p => ({...p, doctor_id: e.target.value}))}>
                <option value="">-- Chọn bác sĩ --</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.user?.full_name}</option>)}
              </select>
            </Field>
            <Field label="Dịch vụ">
              <select value={walkIn.primary_service_id} onChange={e => setWalkIn(p => ({...p, primary_service_id: e.target.value}))}>
                <option value="">-- Chọn dịch vụ --</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Ngày"><input type="date" value={walkIn.appointment_date} onChange={e => setWalkIn(p => ({...p, appointment_date: e.target.value}))}/></Field>
            <Field label="Giờ"><input type="time" value={walkIn.appointment_time} onChange={e => setWalkIn(p => ({...p, appointment_time: e.target.value}))}/></Field>
          </div>
          <button className="btn btn-primary" onClick={addWalkIn} style={{ marginTop: "1rem" }}>Lưu Lịch Mới</button>
        </div>
      )
    },
    {
      id: "create_patient",
      label: "🆕 Hồ Sơ Nhanh",
      content: (
        <div style={{ maxWidth: 900 }}>
          <div className="form-grid">
            <Field label="Họ tên"><input value={quickPatient.full_name} onChange={e => setQuickPatient(p => ({...p, full_name: e.target.value}))}/></Field>
            <Field label="Số điện thoại"><input value={quickPatient.phone} onChange={e => setQuickPatient(p => ({...p, phone: e.target.value}))}/></Field>
            <Field label="Giới tính">
              <select value={quickPatient.gender} onChange={e => setQuickPatient(p => ({...p, gender: e.target.value}))}>
                <option value="">-- Chọn --</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
              </select>
            </Field>
            <Field label="Địa chỉ"><input value={quickPatient.address} onChange={e => setQuickPatient(p => ({...p, address: e.target.value}))}/></Field>
          </div>
          <button className="btn btn-primary" onClick={addQuickPatient} style={{ marginTop: "1rem" }}>Tạo hồ sơ bệnh nhân</button>
        </div>
      )
    }
  ];

  return (
    <div className="panel split-pane" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* ── Top Pane: Data Grid & Actions ── */}
      <div className="split-top" style={{ height: topHeight }}>
        
        {/* Actions Toolbar */}
        <div className="toolbar" style={{ padding: "1rem", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.15)" }}>
          <div className="cta-row">
            <button className="btn btn-sm btn-secondary" onClick={() => { setActiveTab("create_walkin"); setSelectedId(null); }}>✨ Tạo lịch</button>
            <button className="btn btn-sm btn-primary" disabled={!canConfirm} onClick={() => handleAction("Xác nhận", "confirm")}>✅ Xác nhận</button>
            <button className="btn btn-sm btn-primary" disabled={!canCheckIn} onClick={() => handleAction("Check-in", "check-in")}>📍 Check-in</button>
            <button className="btn btn-sm btn-secondary" disabled={!canStart} onClick={() => handleAction("Bắt đầu khám", "start")}>🩺 Khám</button>
            <button className="btn btn-sm btn-secondary" disabled={!canComplete} onClick={() => handleAction("Hoàn thành", "complete")}>🏁 Hoàn thành</button>
            <button className="btn btn-sm btn-danger" disabled={!canCancel} onClick={() => handleAction("Hủy lịch", "cancel")}>❌ Hủy lịch</button>
            <span style={{ borderLeft: "1px solid var(--border)", height: 20, margin: "0 0.5rem" }}></span>
            <button className="btn btn-sm btn-secondary" onClick={reload}>🔄 Làm mới</button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="toolbar" style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", gap: "0.75rem" }}>
          <div className="cta-row">
            <input type="date" value={filter.date} onChange={e => setFilter({ ...filter, date: e.target.value })} style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)" }}/>
            <select value={filter.doctor_id} onChange={e => setFilter({ ...filter, doctor_id: e.target.value })} style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)" }}>
              <option value="">-- Tất cả bác sĩ --</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.user?.full_name}</option>)}
            </select>
            <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })} style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)" }}>
              <option value="">-- Trạng thái --</option>
              {Object.keys(STATUS_LABELS).map(k => <option key={k} value={k}>{STATUS_LABELS[k]}</option>)}
            </select>
            <input type="text" placeholder="🔍 Tìm tên / SĐT..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} style={{ minWidth: 200, padding: "0.4rem 0.6rem", fontSize: "0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)" }}/>
          </div>
        </div>

        {/* DataGrid */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <AppointmentTable
            items={filteredAppointments}
            selectedId={selectedId}
            onRowClick={(item) => {
              setSelectedId(item.id);
              if(["create_walkin", "create_patient"].includes(activeTab)) {
                setActiveTab("general");
              }
            }}
          />
        </div>

      </div>

      {/* ── Splitter Resizer ── */}
      <div className="split-resizer" onMouseDown={startDrag}></div>

      {/* ── Bottom Pane: Tabs Area ── */}
      <div className="split-bottom">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

    </div>
  );
}
