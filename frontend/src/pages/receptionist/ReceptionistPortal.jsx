import { useState } from "react";
import { api } from "../../api/http";
import { Field, Panel, AppointmentTable, Alert } from "../../components/shared/UI";

export function ReceptionistPortal({ data, reload, runAction }) {
  const appointments = data.appointments || [];
  const doctors = data.doctors || [];
  const services = data.services || [];

  const [walkIn, setWalkIn] = useState({ patient_name: "", patient_phone: "", doctor_id: "", primary_service_id: "", appointment_date: "", appointment_time: "" });
  const [quick, setQuick] = useState({ full_name: "", phone: "", gender: "", address: "" });

  const onConfirm = (item) => runAction(() => api.patch(`/api/v1/appointments/${item.id}/confirm`));
  const onCheckIn = (item) => runAction(() => api.patch(`/api/v1/appointments/${item.id}/check-in`));
  const onNoShow = (item) => runAction(() => api.patch(`/api/v1/appointments/${item.id}/no-show`));

  const addWalkIn = () => runAction(() => api.post("/api/v1/appointments/walk-in", {
    ...walkIn,
    doctor_id: Number(walkIn.doctor_id),
    primary_service_id: Number(walkIn.primary_service_id) || null,
  }));

  const addQuick = () => runAction(() => api.post("/api/v1/patients/quick-create", quick));

  return (
    <>
      <Panel title="📝 Quản lý Hàng Đợi Bệnh Nhân">
        <AppointmentTable
          items={appointments}
          actions={[
            { label: "✅ Xác Nhận", cls: "btn-success", show: (i) => i.status === "pending", run: onConfirm },
            { label: "📍 Check-in", cls: "btn-primary", show: (i) => i.status === "confirmed", run: onCheckIn },
            { label: "❌ Vắng mặt", cls: "btn-danger", show: (i) => i.status === "confirmed", run: onNoShow }
          ]}
        />
      </Panel>

      <div className="content-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 0 }}>
        <Panel title="🚶 Kê Lịch Khám Nhanh Trực Tiếp (Walk-in)">
          <div className="form-grid" style={{ gridTemplateColumns: "1fr", marginBottom: 0 }}>
            <Field label="Tên bệnh nhân"><input value={walkIn.patient_name} onChange={(e) => setWalkIn(p => ({ ...p, patient_name: e.target.value }))} /></Field>
            <Field label="SĐT bệnh nhân"><input value={walkIn.patient_phone} onChange={(e) => setWalkIn(p => ({ ...p, patient_phone: e.target.value }))} /></Field>
            <Field label="Bác sĩ">
              <select value={walkIn.doctor_id} onChange={(e) => setWalkIn(p => ({ ...p, doctor_id: e.target.value }))}>
                <option value="">-- Chọn bác sĩ --</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.user?.full_name}</option>)}
              </select>
            </Field>
            <Field label="Dịch vụ">
              <select value={walkIn.primary_service_id} onChange={(e) => setWalkIn(p => ({ ...p, primary_service_id: e.target.value }))}>
                <option value="">-- Chọn dịch vụ --</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="form-grid" style={{ marginTop: "1rem" }}>
            <Field label="Ngày"><input type="date" value={walkIn.appointment_date} onChange={(e) => setWalkIn(p => ({ ...p, appointment_date: e.target.value }))} /></Field>
            <Field label="Giờ"><input type="time" value={walkIn.appointment_time} onChange={(e) => setWalkIn(p => ({ ...p, appointment_time: e.target.value }))} /></Field>
          </div>
          <button className="btn btn-primary" onClick={addWalkIn} style={{ marginTop: "1rem" }}>Tạo lịch Walk-in</button>
        </Panel>

        <Panel title="🆕 Thêm Mới Hồ Sơ Bệnh Nhân">
          <div className="form-grid" style={{ gridTemplateColumns: "1fr", marginBottom: 0 }}>
            <Field label="Họ tên"><input value={quick.full_name} onChange={(e) => setQuick(p => ({ ...p, full_name: e.target.value }))} /></Field>
            <Field label="Số điện thoại"><input value={quick.phone} onChange={(e) => setQuick(p => ({ ...p, phone: e.target.value }))} /></Field>
            <Field label="Giới tính">
              <select value={quick.gender} onChange={(e) => setQuick(p => ({ ...p, gender: e.target.value }))}>
                <option value="">-- Chọn --</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
              </select>
            </Field>
            <Field label="Địa chỉ"><input value={quick.address} onChange={(e) => setQuick(p => ({ ...p, address: e.target.value }))} /></Field>
          </div>
          <button className="btn btn-primary" onClick={addQuick} style={{ marginTop: "1rem" }}>Tạo hồ sơ</button>
        </Panel>
      </div>
    </>
  );
}
