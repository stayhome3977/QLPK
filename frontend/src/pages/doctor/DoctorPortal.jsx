import { useEffect, useMemo, useState } from "react";
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
  const approvalAppointments = useMemo(
    () => appointments.filter((item) => ["pending", "confirmed"].includes(item.status)),
    [appointments],
  );
  const examAppointments = useMemo(
    () => appointments.filter((item) => ["checked_in", "in_progress", "confirmed"].includes(item.status)),
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

  const activeList = useMemo(() => {
    if (activeTab === "duyetlichhen") return approvalAppointments;
    if (["khambenh", "kedonthuoc"].includes(activeTab)) return examAppointments;
    return waitingAppointments;
  }, [activeTab, approvalAppointments, examAppointments, waitingAppointments]);

  useEffect(() => {
    if (activeList.length === 0) {
      setSelected(null);
      return;
    }
    if (!selected || !activeList.some((item) => item.id === selected.id)) {
      setSelected(activeList[0]);
    }
  }, [activeList, selected]);

  const approve = async () => {
    await api.patch(`/api/v1/appointments/${selected.id}/approve`, {});
    await reload();
  };

  const sendProposal = async () => {
    const note = proposal.note.trim();
    const discountPercent = Number(proposal.discount_percent || 0);
    if (!proposal.proposed_date || !proposal.proposed_time) {
      alert("Vui lòng chọn ngày và giờ đề nghị mới.");
      return;
    }
    if (note.length < 5) {
      alert("Ghi chú cho bệnh nhân cần ít nhất 5 ký tự.");
      return;
    }
    if (Number.isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      alert("Ưu đãi phải nằm trong khoảng từ 0 đến 100.");
      return;
    }

    try {
      await api.patch(`/api/v1/appointments/${selected.id}/propose-reschedule`, {
        proposed_date: proposal.proposed_date,
        proposed_time: proposal.proposed_time,
        note,
        discount_percent: discountPercent,
        discount_note: proposal.discount_note.trim() || null,
      });
      await reload();
      alert("Đã gửi đề nghị đổi lịch.");
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (typeof detail === "string") {
        alert(detail);
        return;
      }
      if (Array.isArray(detail) && detail.length > 0) {
        alert(detail[0]?.msg || "Không thể gửi đề nghị đổi lịch.");
        return;
      }
      alert("Không thể gửi đề nghị đổi lịch.");
    }
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

      {activeTab === "duyetlichhen" && (
        <div className="dashboard-sections two-columns">
          <Panel title="Danh sách lịch cần duyệt">
            {loading ? (
              <p>Đang tải...</p>
            ) : approvalAppointments.length === 0 ? (
              <EmptyState text="Không có lịch cần duyệt." />
            ) : (
              <div className="list-stack">
                {approvalAppointments.map((appointment) => (
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

          <Panel title="Duyệt lịch và đề nghị dời lịch">
            {!selected ? (
              <EmptyState text="Chọn lịch hẹn ở danh sách bên trái." />
            ) : (
              <div className="form-stack">
                <p>
                  <strong>{selected.patient_name}</strong> - {selected.chief_complaint}
                </p>
                <div className="row-actions">
                  <button className="primary-button" onClick={approve}>
                    Chốt lịch
                  </button>
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
        </div>
      )}

      {["khambenh", "kedonthuoc"].includes(activeTab) && (
        <div className="dashboard-sections two-columns">
          <Panel title="Danh sách bệnh nhân chờ khám">
            {loading ? (
              <p>Đang tải...</p>
            ) : examAppointments.length === 0 ? (
              <EmptyState text="Không có bệnh nhân cần khám." />
            ) : (
              <div className="list-stack">
                {examAppointments.map((appointment) => (
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

          <Panel title="Khám bệnh và kê đơn">
            {!selected ? (
              <EmptyState text="Chọn bệnh nhân ở danh sách bên trái." />
            ) : (
              <div className="form-stack">
                <p>
                  <strong>{selected.patient_name}</strong> - {selected.chief_complaint}
                </p>
                <div className="row-actions">
                  {selected.status === "confirmed" || selected.status === "checked_in" ? (
                    <button className="secondary-link button-link" onClick={start}>
                      Bắt đầu khám
                    </button>
                  ) : null}
                  {selected.status === "in_progress" ? (
                    <button className="secondary-link button-link" onClick={complete}>
                      Hoàn tất khám
                    </button>
                  ) : null}
                </div>
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
