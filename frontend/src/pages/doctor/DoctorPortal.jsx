import { useState } from "react";
import { api } from "../../api/http";
import { Field, Panel, AppointmentTable, Alert } from "../../components/shared/UI";

export function DoctorPortal({ data, reload, runAction }) {
  const appointments = data.appointments || [];
  const medicines = data.medicines || [];

  const [record, setRecord] = useState({ appointment_id: "", patient_id: "", doctor_id: "", diagnosis: "", symptoms: "" });
  const [rx, setRx] = useState({ medical_record_id: "", patient_id: "", doctor_id: "", medicine_id: "", quantity: 1, dosage: "1 viên", frequency: "2 lần/ngày", unit_price: 0 });

  const onStart = (item) => runAction(() => api.patch(`/api/v1/appointments/${item.id}/start`));
  const onComplete = (item) => runAction(() => api.patch(`/api/v1/appointments/${item.id}/complete`));

  const saveRecord = () => runAction(() => api.post("/api/v1/medical-records", {
    ...record,
    appointment_id: Number(record.appointment_id),
    patient_id: Number(record.patient_id),
    doctor_id: Number(record.doctor_id),
  }));

  const saveRx = () => runAction(() => api.post("/api/v1/prescriptions", {
    medical_record_id: Number(rx.medical_record_id),
    patient_id: Number(rx.patient_id),
    doctor_id: Number(rx.doctor_id),
    items: [{
      medicine_id: Number(rx.medicine_id),
      quantity: Number(rx.quantity),
      dosage: rx.dosage,
      frequency: rx.frequency,
      unit_price: Number(rx.unit_price)
    }]
  }));

  return (
    <>
      <Panel title="👨‍⚕️ Lịch khám của tôi hôm nay">
        <AppointmentTable
          items={appointments}
          actions={[
            { label: "Bắt đầu khám", cls: "btn-primary", show: (i) => i.status === "checked_in", run: onStart },
            { label: "Hoàn tất", cls: "btn-success", show: (i) => i.status === "in_progress", run: onComplete }
          ]}
        />
      </Panel>

      <div className="content-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 0 }}>
        <Panel title="📝 Ghi nhận Bệnh án">
          <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
            <Field label="Mã lịch hẹn (Appointment ID)"><input value={record.appointment_id} onChange={(e) => setRecord(p => ({ ...p, appointment_id: e.target.value }))} /></Field>
            <Field label="Mã bệnh nhân (Patient ID)"><input value={record.patient_id} onChange={(e) => setRecord(p => ({ ...p, patient_id: e.target.value }))} /></Field>
            <Field label="Mã bác sĩ (Doctor ID)"><input value={record.doctor_id} onChange={(e) => setRecord(p => ({ ...p, doctor_id: e.target.value }))} /></Field>
            <Field label="Chẩn đoán"><input value={record.diagnosis} onChange={(e) => setRecord(p => ({ ...p, diagnosis: e.target.value }))} placeholder="VD: Viêm da cơ địa..."/></Field>
            <Field label="Triệu chứng"><textarea value={record.symptoms} onChange={(e) => setRecord(p => ({ ...p, symptoms: e.target.value }))} /></Field>
          </div>
          <button className="btn btn-primary" onClick={saveRecord} style={{ marginTop: "1rem" }}>Lưu bệnh án</button>
        </Panel>

        <Panel title="💊 Kê đơn thuốc nhanh">
          <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
            <Field label="Mã bệnh án (Record ID)"><input value={rx.medical_record_id} onChange={(e) => setRx(p => ({ ...p, medical_record_id: e.target.value }))} /></Field>
            <Field label="Mã bệnh nhân (Patient ID)"><input value={rx.patient_id} onChange={(e) => setRx(p => ({ ...p, patient_id: e.target.value }))} /></Field>
            <Field label="Mã bác sĩ (Doctor ID)"><input value={rx.doctor_id} onChange={(e) => setRx(p => ({ ...p, doctor_id: e.target.value }))} /></Field>
            <Field label="Chọn thuốc">
              <select value={rx.medicine_id} onChange={(e) => {
                const mid = e.target.value;
                const m = medicines.find(x => String(x.id) === String(mid));
                setRx(p => ({ ...p, medicine_id: mid, unit_price: m ? m.price_per_unit : 0 }));
              }}>
                <option value="">-- Chọn thuốc --</option>
                {medicines.map(m => <option key={m.id} value={m.id}>{m.name} - Tồn: {m.current_stock}</option>)}
              </select>
            </Field>
            <div className="form-grid" style={{ marginBottom: 0 }}>
              <Field label="Số lượng"><input type="number" min="1" value={rx.quantity} onChange={(e) => setRx(p => ({ ...p, quantity: e.target.value }))} /></Field>
              <Field label="Đơn giá"><input type="number" value={rx.unit_price} readOnly style={{ background: "var(--bg-2)" }}/></Field>
            </div>
            <div className="form-grid" style={{ marginBottom: 0 }}>
              <Field label="Liều dùng"><input value={rx.dosage} onChange={(e) => setRx(p => ({ ...p, dosage: e.target.value }))} /></Field>
              <Field label="Tần suất"><input value={rx.frequency} onChange={(e) => setRx(p => ({ ...p, frequency: e.target.value }))} /></Field>
            </div>
          </div>
          <button className="btn btn-primary" onClick={saveRx} style={{ marginTop: "1rem" }}>Tạo đơn thuốc</button>
        </Panel>
      </div>
    </>
  );
}
