import { Link } from "react-router-dom";
import { useState } from "react";
import { api } from "../../api/http";
import { Alert, EmptyState, Panel } from "../../components/shared/UI";
import { currency, fmtDate, fmtTime, STATUS_LABELS, INVOICE_STATUS_LABELS } from "../../utils/helpers";

export function PatientPortal({ loading, data, reload, activeTab }) {
  const appointments = data["/api/v1/appointments"] || [];
  const invoices = data["/api/v1/invoices"] || [];
  const [submittingProposalId, setSubmittingProposalId] = useState(null);
  const rescheduleProposals = appointments.filter(
    (appointment) => appointment.proposal && appointment.status === "pending"
  );

  const cancelAppointment = async (id) => {
    await api.delete(`/api/v1/appointments/${id}`);
    await reload();
  };

  const confirmRescheduleProposal = async (appointment) => {
    if (!appointment?.proposal) return;
    setSubmittingProposalId(appointment.id);
    try {
      await api.patch(`/api/v1/appointments/${appointment.id}/reschedule`, {
        appointment_date: appointment.proposal.proposed_date,
        appointment_time: appointment.proposal.proposed_time,
        reason: "Bệnh nhân đã chốt lịch mới từ đề nghị dời lịch của bác sĩ.",
      });
      await reload();
    } finally {
      setSubmittingProposalId(null);
    }
  };

  return (
    <div className="dashboard-sections">
      {(!activeTab || activeTab === "lichhencuatoi") && (
      <Panel title="Lịch hẹn của tôi">
        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : appointments.length === 0 ? (
          <EmptyState text="Bạn chưa có lịch hẹn nào." />
        ) : (
          <div className="list-stack">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="list-row">
                <div>
                  <strong>{appointment.doctor_name}</strong>
                  <p>
                    {fmtDate(appointment.appointment_date)} lúc {fmtTime(appointment.appointment_time)} - {STATUS_LABELS[appointment.status]}
                  </p>
                  {appointment.proposal?.note ? <span>Đề nghị từ bác sĩ: {appointment.proposal.note}</span> : null}
                </div>
                <div className="row-actions">
                  <Link to={`/booking/${appointment.doctor_id}`} className="secondary-link button-link">
                    Đặt lại
                  </Link>
                  {["pending", "confirmed"].includes(appointment.status) ? (
                    <button className="ghost-button danger" onClick={() => cancelAppointment(appointment.id)}>
                      Hủy lịch
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      )}

      {activeTab === "denghidichuyenlich" && (
      <Panel title="Đề nghị dời lịch từ bác sĩ">
        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : rescheduleProposals.length === 0 ? (
          <EmptyState text="Chưa có đề nghị dời lịch nào từ bác sĩ." />
        ) : (
          <div className="list-stack">
            {rescheduleProposals.map((appointment) => (
              <div key={appointment.id} className="list-row">
                <div>
                  <strong>{appointment.doctor_name}</strong>
                  <p>
                    Lịch cũ: {fmtDate(appointment.appointment_date)} lúc {fmtTime(appointment.appointment_time)}
                  </p>
                  <p>
                    Đề nghị mới: {fmtDate(appointment.proposal.proposed_date)} lúc {fmtTime(appointment.proposal.proposed_time)}
                  </p>
                  <p>Ghi chú: {appointment.proposal.note}</p>
                  {appointment.proposal.discount_percent > 0 ? (
                    <p>
                      Ưu đãi: {appointment.proposal.discount_percent}%
                      {appointment.proposal.discount_note ? ` - ${appointment.proposal.discount_note}` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="row-actions">
                  <button
                    className="primary-button"
                    disabled={submittingProposalId === appointment.id}
                    onClick={() => confirmRescheduleProposal(appointment)}
                  >
                    {submittingProposalId === appointment.id ? "Đang chốt..." : "Chốt lịch"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      )}

      {activeTab === "hoadon" && (
      <Panel title="Hóa đơn của tôi">
        {invoices.length === 0 ? (
          <EmptyState text="Chưa có hóa đơn nào." />
        ) : (
          <div className="list-stack">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="list-row">
                <div>
                  <strong>{invoice.invoice_number}</strong>
                  <p>
                    {INVOICE_STATUS_LABELS[invoice.invoice_status]} - {currency(invoice.total_amount)}
                  </p>
                </div>
                <a className="secondary-link button-link" href={`${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}/api/v1/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                  PDF
                </a>
              </div>
            ))}
          </div>
        )}
      </Panel>
      )}

      {["lichsukham", "hoso"].includes(activeTab) && (
        <Panel title="Chức năng trống">
          <EmptyState text="Chức năng này đang được phát triển hoặc chưa có dữ liệu." />
        </Panel>
      )}

      {(!activeTab || activeTab === "lichhencuatoi") && (
      <Alert type="success">
        Bệnh nhân vẫn đi theo luồng public: chọn bác sĩ, chọn giờ còn trống, gửi yêu cầu và chờ bác sĩ duyệt.
      </Alert>
      )}
    </div>
  );
}
