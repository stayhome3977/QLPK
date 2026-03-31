import { useState } from "react";
import { api } from "../../api/http";
import { Field, Panel, StatCard, AppointmentTable, EmptyState, Alert } from "../../components/shared/UI";
import { currency, fmtDate, PRESCRIPTION_STATUS_LABELS, INVOICE_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "../../utils/helpers";

export function PatientPortal({ data, reload, runAction }) {
  const { appointments = [], doctors = [], services = [] } = data;
  const [form, setForm] = useState({
    doctor_id: "", primary_service_id: "",
    appointment_date: "", appointment_time: "",
    chief_complaint: "",
  });
  const [slots, setSlots] = useState([]);

  const loadSlots = async () => {
    if (!form.doctor_id || !form.appointment_date) return;
    try {
      const r = await api.get("/api/v1/appointments/available-slots", {
        params: { doctor_id: form.doctor_id, date: form.appointment_date }
      });
      setSlots(r.data.slots || []);
    } catch { setSlots([]); }
  };

  const book = () => runAction(() => api.post("/api/v1/appointments", {
    ...form,
    doctor_id: Number(form.doctor_id),
    primary_service_id: Number(form.primary_service_id) || null,
  }));

  const cancelApp = (item) => runAction(() =>
    api.delete(`/api/v1/appointments/${item.id}`)
  );

  const myApps = appointments;
  const invoices = data.invoices || [];
  const records = data.medical_records || [];

  return (
    <>
      <Panel title="📅 Đặt lịch khám mới">
        <div className="form-grid">
          <Field label="Bác sĩ">
            <select value={form.doctor_id} onChange={(e) => setForm(p => ({ ...p, doctor_id: e.target.value }))}>
              <option value="">-- Chọn bác sĩ --</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.user?.full_name} · {d.specialty}</option>)}
            </select>
          </Field>
          <Field label="Dịch vụ chính">
            <select value={form.primary_service_id} onChange={(e) => setForm(p => ({ ...p, primary_service_id: e.target.value }))}>
              <option value="">-- Chọn dịch vụ --</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} ({currency(s.price)})</option>)}
            </select>
          </Field>
          <Field label="Ngày khám">
            <input type="date" value={form.appointment_date}
              onChange={(e) => { setForm(p => ({ ...p, appointment_date: e.target.value, appointment_time: "" })); setSlots([]); }}
              onBlur={loadSlots} />
          </Field>
          <Field label="Giờ khám">
            {slots.length > 0 ? (
              <select value={form.appointment_time} onChange={(e) => setForm(p => ({ ...p, appointment_time: e.target.value }))}>
                <option value="">-- Chọn giờ --</option>
                {slots.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input type="time" value={form.appointment_time}
                onChange={(e) => setForm(p => ({ ...p, appointment_time: e.target.value }))}
                placeholder="Chọn ngày và bác sĩ để xem slot" />
            )}
          </Field>
        </div>
        <Field label="Lý do khám / triệu chứng">
          <textarea value={form.chief_complaint}
            onChange={(e) => setForm(p => ({ ...p, chief_complaint: e.target.value }))}
            placeholder="Mô tả triệu chứng, tình trạng da hiện tại..." />
        </Field>
        <div className="cta-row" style={{ marginTop: "0.75rem" }}>
          {form.doctor_id && form.appointment_date && (
            <button className="btn btn-secondary" onClick={loadSlots}>🔄 Xem slot trống</button>
          )}
          <button className="btn btn-primary" onClick={book}>Đặt lịch</button>
        </div>
      </Panel>

      <Panel title="📋 Lịch hẹn của tôi">
        <AppointmentTable
          items={myApps}
          actions={[{
            label: "Hủy lịch", cls: "btn-danger",
            show: (item) => ["pending", "confirmed"].includes(item.status),
            run: cancelApp,
          }]}
        />
      </Panel>

      {invoices.length > 0 && (
        <Panel title="🧾 Hóa đơn của tôi">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Số HĐ</th><th>Trạng thái</th><th>Tổng tiền</th><th>Đã trả</th><th>Ngày</th><th>PDF</th></tr></thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td><strong>{inv.invoice_number}</strong></td>
                    <td>{INVOICE_STATUS_LABELS[inv.invoice_status] || inv.invoice_status}</td>
                    <td>{currency(inv.total_amount)}</td>
                    <td>{currency(inv.paid_amount)}</td>
                    <td className="muted">{fmtDate(inv.created_at)}</td>
                    <td>
                      <a href={`http://127.0.0.1:8000/api/v1/invoices/${inv.id}/pdf`}
                        target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary">PDF</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}
