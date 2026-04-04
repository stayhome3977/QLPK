import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/http";
import { useAuth } from "../../auth";
import { EmptyState, Field, Panel } from "../../components/shared/UI";
import { currency, fmtDate, fmtDateTime, fmtTime, PAYMENT_STATUS_LABELS, STATUS_LABELS } from "../../utils/helpers";

const defaultRecord = { diagnosis: "", symptoms: "" };
const defaultPrescriptionDraft = { medicine_id: "", quantity: 1, dosage: "1 viên", frequency: "2 lần/ngày" };

function getErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (detail === "Invoice is locked for this appointment") {
    return "Lịch hẹn này đã có hóa đơn khóa, không thể sửa lại đơn thuốc.";
  }
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) return detail[0]?.msg || fallback;
  return error?.message || fallback;
}

function mapPrescriptionItem(item) {
  return {
    medicine_id: Number(item.medicine_id),
    quantity: Number(item.quantity || 0),
    dosage: item.dosage || defaultPrescriptionDraft.dosage,
    frequency: item.frequency || defaultPrescriptionDraft.frequency,
    duration_days: item.duration_days ?? null,
    instruction: item.instruction || "",
  };
}

function normalizePrescriptionItem(item) {
  return {
    medicine_id: Number(item.medicine_id),
    quantity: Number(item.quantity || 0),
    dosage: item.dosage || "",
    frequency: item.frequency || "",
    duration_days: item.duration_days ?? null,
    instruction: item.instruction || "",
  };
}

function prescriptionItemsEqual(left = [], right = []) {
  const normalizeList = (items) =>
    items
      .map((item) => normalizePrescriptionItem(item))
      .sort((a, b) => {
        if (a.medicine_id !== b.medicine_id) return a.medicine_id - b.medicine_id;
        if (a.dosage !== b.dosage) return a.dosage.localeCompare(b.dosage);
        if (a.frequency !== b.frequency) return a.frequency.localeCompare(b.frequency);
        return a.quantity - b.quantity;
      });
  return JSON.stringify(normalizeList(left)) === JSON.stringify(normalizeList(right));
}

export function DoctorPortal({ loading, data, reload, activeTab }) {
  const appointments = data["/api/v1/appointments"] || [];
  const medicines = data["/api/v1/medicines"] || [];
  const { user } = useAuth();
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
  const [record, setRecord] = useState(defaultRecord);
  const [prescriptionDraft, setPrescriptionDraft] = useState(defaultPrescriptionDraft);
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [historyQuery, setHistoryQuery] = useState("");
  const [debouncedHistoryQ, setDebouncedHistoryQ] = useState("");
  const [paidInvoices, setPaidInvoices] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedHistoryQ(historyQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [historyQuery]);

  useEffect(() => {
    if (activeTab !== "lichsubenhnhan") return;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      setHistoryError("");
      try {
        const params = debouncedHistoryQ ? { q: debouncedHistoryQ } : {};
        const { data } = await api.get("/api/v1/doctors/me/paid-invoices", { params });
        if (!cancelled) setPaidInvoices(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setPaidInvoices([]);
          setHistoryError(e.response?.data?.detail || "Không tải được danh sách.");
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, debouncedHistoryQ, historyRefreshKey]);

  useEffect(() => {
    const loadSchedule = async () => {
      if (!user?.id) return;
      try {
        setScheduleLoading(true);
        const { data: doctors } = await api.get("/api/v1/doctors");
        const me = doctors.find((item) => item.user?.id === user.id);
        if (!me) {
          setSchedule([]);
          return;
        }
        const { data } = await api.get(`/api/v1/doctors/${me.id}/schedule`);
        setSchedule(data || []);
      } catch {
        setSchedule([]);
      } finally {
        setScheduleLoading(false);
      }
    };

    loadSchedule();
  }, [user?.id]);

  const chooseAppointment = (appointment) => {
    setSelected(appointment);
  };

  const activeList = useMemo(() => {
    if (activeTab === "duyetlichhen") return approvalAppointments;
    if (["khambenh", "kedonthuoc"].includes(activeTab)) return examAppointments;
    return waitingAppointments;
  }, [activeTab, approvalAppointments, examAppointments, waitingAppointments]);

  useEffect(() => {
    if (activeList.length === 0) {
      setSelected(null);
      setRecord(defaultRecord);
      setPrescriptionDraft(defaultPrescriptionDraft);
      setPrescriptionItems([]);
      return;
    }
    if (!selected) {
      setSelected(activeList[0]);
      return;
    }
    const refreshedSelection = activeList.find((item) => item.id === selected.id);
    if (!refreshedSelection) {
      setSelected(activeList[0]);
      return;
    }
    if (refreshedSelection !== selected) {
      setSelected(refreshedSelection);
    }
  }, [activeList, selected]);

  useEffect(() => {
    if (!selected) {
      setRecord(defaultRecord);
      setPrescriptionDraft(defaultPrescriptionDraft);
      setPrescriptionItems([]);
      return;
    }

    const medicalRecord = selected.medical_record;
    const existingItems = Array.isArray(selected.prescription?.items) ? selected.prescription.items.map(mapPrescriptionItem) : [];
    setRecord({
      diagnosis: medicalRecord?.diagnosis || "",
      symptoms: medicalRecord?.symptoms ?? (selected.chief_complaint || ""),
    });
    setPrescriptionDraft(defaultPrescriptionDraft);
    setPrescriptionItems(existingItems);
  }, [selected]);

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

  const addMedicineToPrescription = () => {
    if (!prescriptionDraft.medicine_id) return;
    const medicineId = String(prescriptionDraft.medicine_id);
    const existingIndex = prescriptionItems.findIndex((item) => String(item.medicine_id) === medicineId);
    const parsedQuantity = Number(prescriptionDraft.quantity || 0);
    if (!parsedQuantity || parsedQuantity <= 0) {
      alert("Số lượng thuốc phải lớn hơn 0.");
      return;
    }
    const baseItem = {
      medicine_id: Number(medicineId),
      quantity: parsedQuantity,
      dosage: prescriptionDraft.dosage,
      frequency: prescriptionDraft.frequency,
    };
    if (existingIndex >= 0) {
      const next = [...prescriptionItems];
      next[existingIndex] = { ...next[existingIndex], ...baseItem, quantity: parsedQuantity };
      setPrescriptionItems(next);
    } else {
      setPrescriptionItems((prev) => [...prev, baseItem]);
    }
  };

  const updateItemQuantity = (medicineId, quantity) => {
    const parsed = Number(quantity || 0);
    if (!parsed || parsed <= 0) return;
    setPrescriptionItems((items) =>
      items.map((item) => (String(item.medicine_id) === String(medicineId) ? { ...item, quantity: parsed } : item)),
    );
  };

  const removeItem = (medicineId) => {
    setPrescriptionItems((items) => items.filter((item) => String(item.medicine_id) !== String(medicineId)));
  };

  const saveRecord = async () => {
    if (!selected) return;

    const diagnosis = record.diagnosis.trim();
    const symptoms = record.symptoms.trim();
    if (diagnosis.length < 3) {
      alert("Chẩn đoán cần ít nhất 3 ký tự.");
      return;
    }

    const itemsPayload =
      prescriptionItems.length > 0
        ? prescriptionItems
        : prescriptionDraft.medicine_id
        ? [
            {
              medicine_id: Number(prescriptionDraft.medicine_id),
              quantity: Number(prescriptionDraft.quantity),
              dosage: prescriptionDraft.dosage,
              frequency: prescriptionDraft.frequency,
            },
          ]
        : [];
    const existingPrescriptionItems = Array.isArray(selected.prescription?.items) ? selected.prescription.items : [];
    const shouldSavePrescription = itemsPayload.length > 0 && (!selected.prescription || !prescriptionItemsEqual(existingPrescriptionItems, itemsPayload));

    try {
      const medicalRecord = await api.post("/api/v1/medical-records", {
        appointment_id: selected.id,
        patient_id: selected.patient_id,
        doctor_id: selected.doctor_id,
        diagnosis,
        symptoms,
      });

      let prescriptionMessage = "";
      if (shouldSavePrescription) {
        const prescription = await api.post("/api/v1/prescriptions", {
          medical_record_id: medicalRecord.data.id,
          patient_id: selected.patient_id,
          doctor_id: selected.doctor_id,
          items: itemsPayload.map((item) => ({
            ...item,
            unit_price: Number(medicines.find((m) => String(m.id) === String(item.medicine_id))?.price_per_unit || 0),
          })),
        });
        prescriptionMessage = prescription.data?.message || "";
      }

      await reload();
      const messages = [medicalRecord.data?.message, prescriptionMessage].filter(Boolean);
      alert(messages.join(" / ") || "Đã lưu bệnh án.");
    } catch (error) {
      alert(getErrorMessage(error, "Không thể lưu bệnh án và gửi đơn thuốc."));
    }
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
                {Array.isArray(selected.services) && selected.services.length > 0 && (
                  <div className="list-stack">
                    <strong>Dịch vụ đã chọn</strong>
                    <ul>
                      {selected.services.map((service) => (
                        <li key={service.service_id}>
                          {service.name}
                          {service.quantity > 1 ? ` × ${service.quantity}` : ""}
                          {service.unit_price ? ` - ${currency(service.line_total || service.unit_price)}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="row-actions">
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
                  <Field label="Danh sách thuốc">
                    <select
                      value={prescriptionDraft.medicine_id}
                      onChange={(e) => setPrescriptionDraft((p) => ({ ...p, medicine_id: e.target.value }))}
                    >
                      <option value="">Chọn thuốc để thêm</option>
                      {medicines.map((medicine) => (
                        <option key={medicine.id} value={medicine.id}>
                          {medicine.name} - tồn {medicine.current_stock}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Số lượng">
                    <input
                      type="number"
                      value={prescriptionDraft.quantity}
                      onChange={(e) => setPrescriptionDraft((p) => ({ ...p, quantity: e.target.value }))}
                    />
                  </Field>
                  <Field label=" ">
                    <button type="button" className="primary-button" onClick={addMedicineToPrescription}>
                      Nhập thuốc vào đơn
                    </button>
                  </Field>
                </div>
                {prescriptionItems.length > 0 && (
                  <div className="list-stack">
                    <strong>Thuốc đã thêm ({prescriptionItems.length})</strong>
                    <ul>
                      {prescriptionItems.map((item) => {
                        const medicine = medicines.find((m) => String(m.id) === String(item.medicine_id));
                        return (
                          <li key={item.medicine_id} className="list-row">
                            <div>
                              <strong>{medicine?.name || `Thuốc #${item.medicine_id}`}</strong>
                              <p>Tồn kho: {medicine?.current_stock ?? "—"}</p>
                            </div>
                            <div className="row-actions">
                              <input
                                type="number"
                                value={item.quantity}
                                min={1}
                                onChange={(e) => updateItemQuantity(item.medicine_id, e.target.value)}
                                style={{ width: 80, marginRight: 8 }}
                              />
                              <button type="button" className="secondary-link button-link" onClick={() => removeItem(item.medicine_id)}>
                                Xóa
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <button className="primary-button" onClick={saveRecord}>
                  Lưu bệnh án và gửi đơn thuốc
                </button>
              </div>
            )}
          </Panel>
        </div>
      )}

      {activeTab === "lichsubenhnhan" && (
        <Panel title="Lịch sử bệnh nhân — phiếu đã thanh toán (dược sĩ)">
          <p style={{ marginTop: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
            Danh sách hóa đơn đã thanh toán đủ do dược sĩ xử lý, liên quan lịch hẹn của bạn. Chỉ xem.
          </p>
          <div className="form-columns" style={{ alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <Field label="Tìm kiếm">
              <input
                type="search"
                placeholder="Tên BN, SĐT, mã BN, số hóa đơn..."
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                style={{ minWidth: 240 }}
              />
            </Field>
            <Field label=" ">
              <button type="button" className="ghost-button" onClick={() => setHistoryRefreshKey((k) => k + 1)}>
                Làm mới
              </button>
            </Field>
          </div>
          {historyError ? <p className="error">{historyError}</p> : null}
          {historyLoading ? (
            <p>Đang tải...</p>
          ) : paidInvoices.length === 0 ? (
            <EmptyState text="Chưa có phiếu nào đã thanh toán qua dược sĩ, hoặc không khớp tìm kiếm." />
          ) : (
            <div className="pharm-table-wrap">
              <table className="pharm-table">
                <thead>
                  <tr>
                    <th>Số hóa đơn</th>
                    <th>Bệnh nhân</th>
                    <th>Ngày khám</th>
                    <th>Tổng tiền</th>
                    <th>Thanh toán lúc</th>
                    <th>TT thanh toán</th>
                    <th>Dược sĩ</th>
                  </tr>
                </thead>
                <tbody>
                  {paidInvoices.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.invoice_number}</strong>
                      </td>
                      <td>
                        <div>{row.patient_name}</div>
                        <small style={{ color: "var(--muted)" }}>
                          {[row.patient_code, row.patient_phone].filter(Boolean).join(" · ") || "—"}
                        </small>
                      </td>
                      <td>
                        {row.appointment_date ? (
                          <>
                            {fmtDate(row.appointment_date)}
                            {row.appointment_time ? ` · ${fmtTime(row.appointment_time)}` : ""}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{currency(row.total_amount)}</td>
                      <td>{fmtDateTime(row.paid_at)}</td>
                      <td>
                        <span className={`badge badge-${row.payment_status}`}>
                          {PAYMENT_STATUS_LABELS[row.payment_status] || row.payment_status}
                        </span>
                      </td>
                      <td>{row.pharmacist_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {["benhnhan", "danhsachbenhnhanhomnay"].includes(activeTab) && (
        <Panel title="Chức năng trống">
          <EmptyState text="Chức năng này đang được phát triển hoặc chưa có dữ liệu." />
        </Panel>
      )}

      {activeTab === "lichlamviec" && (
        <Panel title="Lịch làm việc của tôi">
          {scheduleLoading ? (
            <p>Đang tải lịch làm việc...</p>
          ) : schedule.length === 0 ? (
            <EmptyState text="Chưa có lịch làm việc nào được cấu hình. Vui lòng liên hệ quản trị." />
          ) : (
            <div className="list-stack">
              {schedule.map((item) => (
                <div key={item.id} className="list-row">
                  <div>
                    <strong>Thứ {item.day_of_week}</strong>
                    <p>
                      {item.start_time} - {item.end_time} · Slot {item.slot_duration} phút · Tối đa {item.max_patients} bệnh nhân
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
