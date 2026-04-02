import { useMemo, useState } from "react";
import { api } from "../../api/http";
import { EmptyState, Field, Panel } from "../../components/shared/UI";
import { fmtDate, fmtTime, STATUS_LABELS } from "../../utils/helpers";

export function DoctorPortal({ loading, data, reload, activeTab }) {
  const appointments = data["/api/v1/appointments"] || [];
  const medicines = data["/api/v1/medicines"] || [];
  const waitingAppointments = useMemo(
    () => appointments.filter((item) => ["pending", "confirmed", "checked_in", "in_progress"].includes(item.status)),
    [appointments],
  );
  const [selected, setSelected] = useState(null);
  const [proposal, setProposal] = useState({ proposed_date: "", proposed_time: "", note: "", discount_percent: 0, discount_note: "" });
  const [record, setRecord] = useState({ diagnosis: "", symptoms: "" });
  const [prescription, setPrescription] = useState({ medicine_id: "", quantity: 1, dosage: "1 viên", frequency: "2 lần/ngày" });

  const chooseAppointment = (appointment) => {
    setSelected(appointment);
    setRecord({ diagnosis: "", symptoms: appointment.chief_complaint || "" });
  };

  const approve = async () => {
    await api.patch(`/api/v1/appointments/${selected.id}/approve`, {});
    await reload();
  };

  const sendProposal = async () => {
    await api.patch(`/api/v1/appointments/${selected.id}/propose-reschedule`, {
      ...proposal,
      discount_percent: Number(proposal.discount_percent || 0),
    });
    await reload();
  };

  const start = async () => {
    await api.patch(`/api/v1/appointments/${selected.id}/start`);
    await reload();
  };

  const complete = async () => {
    await api.patch(`/api/v1/appointments/${selected.id}/complete`);
    await reload();
  };

  const saveRecord = async () => {
    const medicalRecord = await api.post("/api/v1/medical-records", {
      appointment_id: selected.id,
      patient_id: selected.patient_id,
      doctor_id: selected.doctor_id,
      diagnosis: record.diagnosis,
      symptoms: record.symptoms,
    });

    if (prescription.medicine_id) {
      await api.post("/api/v1/prescriptions", {
        medical_record_id: medicalRecord.data.id,
        patient_id: selected.patient_id,
        doctor_id: selected.doctor_id,
        items: [
          {
            medicine_id: Number(prescription.medicine_id),
            quantity: Number(prescription.quantity),
            dosage: prescription.dosage,
            frequency: prescription.frequency,
            unit_price: Number(medicines.find((item) => String(item.id) === String(prescription.medicine_id))?.price_per_unit || 0),
          },
        ],
      });
    }

    await reload();
  };

  return (
    <div className="dashboard-sections">
      {activeTab === "trangdieukhien" && (
        <Panel title="Lịch hẹn cần xử lý">
          {loading ? (
            <p>Đang tải...</p>
          ) : waitingAppointments.length === 0 ? (
            <EmptyState text="Không có lịch cần xử lý." />
          ) : (
            <div className="list-stack">
              {waitingAppointments.map((appointment) => (
                <button key={appointment.id} className={`list-row selectable ${selected?.id === appointment.id ? "active" : ""}`} onClick={() => chooseAppointment(appointment)}>
                  <div>
                    <strong>{appointment.patient_name}</strong>
                    <p>
                      {fmtDate(appointment.appointment_date)} lúc {fmtTime(appointment.appointment_time)}
                    </p>
                  </div>
                  <span>{STATUS_LABELS[appointment.status]}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      )}

      {["duyetlichhen", "khambenh", "kedonthuoc"].includes(activeTab) && (
        <div className="dashboard-sections two-columns">
          <Panel title="Duyệt lịch và đề nghị dời lịch">
            {!selected ? (
              <EmptyState text="Chưa chọn lịch hẹn từ Tổng quan." />
            ) : (
              <div className="form-stack">
                <p>
                  <strong>{selected.patient_name}</strong> - {selected.chief_complaint}
                </p>
                <div className="row-actions">
                  <button className="primary-button" onClick={approve}>
                    Chốt lịch
                  </button>
                  {selected.status === "checked_in" ? <button className="secondary-link button-link" onClick={start}>Bắt đầu khám</button> : null}
                  {selected.status === "in_progress" ? <button className="secondary-link button-link" onClick={complete}>Hoàn tất khám</button> : null}
                </div>
                <div className="form-columns">
                  <Field label="Ngày đề nghị mới">
                    <input type="date" value={proposal.proposed_date} onChange={(e) => setProposal((p) => ({ ...p, proposed_date: e.target.value }))} />
                  </Field>
                  <Field label="Giờ đề nghị mới">
                    <input type="time" value={proposal.proposed_time} onChange={(e) => setProposal((p) => ({ ...p, proposed_time: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Ghi chú cho bệnh nhân">
                  <textarea value={proposal.note} onChange={(e) => setProposal((p) => ({ ...p, note: e.target.value }))} />
                </Field>
                <div className="form-columns">
                  <Field label="Ưu đãi (%)">
                    <input type="number" value={proposal.discount_percent} onChange={(e) => setProposal((p) => ({ ...p, discount_percent: e.target.value }))} />
                  </Field>
                  <Field label="Ghi chú ưu đãi">
                    <input value={proposal.discount_note} onChange={(e) => setProposal((p) => ({ ...p, discount_note: e.target.value }))} />
                  </Field>
                </div>
                <button className="ghost-button" onClick={sendProposal}>
                  Gửi đề nghị đổi lịch
                </button>
              </div>
            )}
          </Panel>

          <Panel title="Khám bệnh và kê đơn">
            {!selected ? (
              <EmptyState text="Chưa chọn lịch hẹn từ Tổng quan." />
            ) : (
              <div className="form-stack">
                <Field label="Triệu chứng">
                  <textarea value={record.symptoms} onChange={(e) => setRecord((p) => ({ ...p, symptoms: e.target.value }))} />
                </Field>
                <Field label="Chẩn đoán">
                  <input value={record.diagnosis} onChange={(e) => setRecord((p) => ({ ...p, diagnosis: e.target.value }))} />
                </Field>
                <div className="form-columns">
                  <Field label="Thuốc">
                    <select value={prescription.medicine_id} onChange={(e) => setPrescription((p) => ({ ...p, medicine_id: e.target.value }))}>
                      <option value="">Không kê thuốc</option>
                      {medicines.map((medicine) => (
                        <option key={medicine.id} value={medicine.id}>
                          {medicine.name} - tồn {medicine.current_stock}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Số lượng">
                    <input type="number" value={prescription.quantity} onChange={(e) => setPrescription((p) => ({ ...p, quantity: e.target.value }))} />
                  </Field>
                </div>
                <button className="primary-button" onClick={saveRecord}>
                  Lưu bệnh án và gửi đơn thuốc
                </button>
              </div>
            )}
          </Panel>
        </div>
      )}

      {["benhnhan", "danhsachbenhnhanhomnay", "lichsubenhnhan", "lichlamviec"].includes(activeTab) && (
        <Panel title="Chức năng trống">
          <EmptyState text="Chức năng này đang được phát triển hoặc chưa có dữ liệu." />
        </Panel>
      )}
    </div>
  );
}
