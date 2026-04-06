import { Link } from "react-router-dom";
import { useState } from "react";
import { api, downloadAuthenticatedFile } from "../../api/http";
import { Alert, EmptyState, Panel } from "../../components/shared/UI";
import { currency, fmtDate, fmtTime, STATUS_LABELS, INVOICE_STATUS_LABELS } from "../../utils/helpers";

export function PatientPortal({ loading, data, reload, activeTab }) {
  const appointments = data["/api/v1/appointments"] || [];
  const invoices = data["/api/v1/invoices"] || [];
  const patientProfile = data["/api/v1/patients/me"] || null;
  const [submittingProposalId, setSubmittingProposalId] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
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

  const startEditProfile = () => {
    if (!patientProfile) return;
    setProfileForm({
      full_name: patientProfile.full_name || patientProfile.user?.full_name || "",
      phone: patientProfile.phone || patientProfile.user?.phone || "",
      date_of_birth: patientProfile.date_of_birth ? patientProfile.date_of_birth : "",
      gender: patientProfile.gender || "",
      address: patientProfile.address || "",
      insurance_number: patientProfile.insurance_number || "",
      allergy_notes: patientProfile.allergy_notes || "",
      occupation: patientProfile.occupation || "",
      emergency_contact_name: patientProfile.emergency_contact_name || "",
      emergency_contact_phone: patientProfile.emergency_contact_phone || "",
    });
    setIsEditingProfile(true);
  };

  const cancelEditProfile = () => {
    setIsEditingProfile(false);
    setProfileForm(null);
  };

  const handleProfileChange = (field, value) => {
    setProfileForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    if (!patientProfile || !profileForm) return;
    setSavingProfile(true);
    try {
      await api.put(`/api/v1/patients/${patientProfile.id}`, profileForm);
      await reload();
      setIsEditingProfile(false);
      setProfileForm(null);
    } finally {
      setSavingProfile(false);
    }
  };

  const downloadInvoicePdf = async (invoiceId) => {
    try {
      await downloadAuthenticatedFile(`/api/v1/invoices/${invoiceId}/pdf`, `hoa-don-${invoiceId}.pdf`);
    } catch (error) {
      alert(error.response?.data?.detail || "Không thể tải PDF hóa đơn");
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
                  {appointment.status !== "confirmed" && !appointment.proposal ? (
                    <Link to={`/booking/${appointment.doctor_id}`} className="secondary-link button-link">
                      Đặt lại
                    </Link>
                  ) : null}
                  {appointment.status === "pending" && !appointment.proposal ? (
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
                  <button className="ghost-button danger" onClick={() => cancelAppointment(appointment.id)}>
                    Hủy lịch
                  </button>
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
                    {invoice.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"} - {currency(invoice.total_amount)}
                  </p>
                </div>
                <button type="button" className="secondary-link button-link" onClick={() => void downloadInvoicePdf(invoice.id)}>
                  PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>
      )}

      {activeTab === "hoso" && (
        <Panel title="Hồ sơ bệnh nhân">
          {loading ? (
            <p>Đang tải dữ liệu...</p>
          ) : !patientProfile ? (
            <EmptyState text="Chưa tìm thấy hồ sơ bệnh nhân cho tài khoản này." />
          ) : (
            <div className="patient-profile-grid">
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                {isEditingProfile ? (
                  <button type="button" className="ghost-button" onClick={cancelEditProfile} disabled={savingProfile}>
                    Hủy
                  </button>
                ) : (
                  <button type="button" className="primary-button" onClick={startEditProfile}>
                    Sửa hồ sơ
                  </button>
                )}
              </div>

              {!isEditingProfile ? (
                <>
                  <div>
                    <strong>Mã bệnh nhân</strong>
                    <p>{patientProfile.patient_code || "—"}</p>
                  </div>
                  <div>
                    <strong>Họ và tên</strong>
                    <p>{patientProfile.full_name || patientProfile.user?.full_name || "—"}</p>
                  </div>
                  <div>
                    <strong>Số điện thoại</strong>
                    <p>{patientProfile.phone || patientProfile.user?.phone || "—"}</p>
                  </div>
                  <div>
                    <strong>Ngày sinh</strong>
                    <p>{fmtDate(patientProfile.date_of_birth)}</p>
                  </div>
                  <div>
                    <strong>Giới tính</strong>
                    <p>{patientProfile.gender || "—"}</p>
                  </div>
                  <div>
                    <strong>Địa chỉ</strong>
                    <p>{patientProfile.address || "—"}</p>
                  </div>
                  <div>
                    <strong>Số BHYT</strong>
                    <p>{patientProfile.insurance_number || "—"}</p>
                  </div>
                  <div>
                    <strong>Nghề nghiệp</strong>
                    <p>{patientProfile.occupation || "—"}</p>
                  </div>
                </>
              ) : (
                <form
                  onSubmit={submitProfile}
                  style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}
                >
                  <div>
                    <strong>Mã bệnh nhân</strong>
                    <p>{patientProfile.patient_code || "—"}</p>
                  </div>
                  <div>
                    <strong>Họ và tên</strong>
                    <input
                      type="text"
                      className="input"
                      value={profileForm?.full_name || ""}
                      onChange={(e) => handleProfileChange("full_name", e.target.value)}
                    />
                  </div>
                  <div>
                    <strong>Số điện thoại</strong>
                    <input
                      type="tel"
                      className="input"
                      value={profileForm?.phone || ""}
                      onChange={(e) => handleProfileChange("phone", e.target.value)}
                    />
                  </div>
                  <div>
                    <strong>Ngày sinh</strong>
                    <input
                      type="date"
                      className="input"
                      value={profileForm?.date_of_birth || ""}
                      onChange={(e) => handleProfileChange("date_of_birth", e.target.value)}
                    />
                  </div>
                  <div>
                    <strong>Giới tính</strong>
                    <select
                      className="input"
                      value={profileForm?.gender || ""}
                      onChange={(e) => handleProfileChange("gender", e.target.value)}
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div>
                    <strong>Địa chỉ</strong>
                    <input
                      type="text"
                      className="input"
                      value={profileForm?.address || ""}
                      onChange={(e) => handleProfileChange("address", e.target.value)}
                    />
                  </div>
                  <div>
                    <strong>Số BHYT</strong>
                    <input
                      type="text"
                      className="input"
                      value={profileForm?.insurance_number || ""}
                      onChange={(e) => handleProfileChange("insurance_number", e.target.value)}
                    />
                  </div>
                  <div>
                    <strong>Nghề nghiệp</strong>
                    <input
                      type="text"
                      className="input"
                      value={profileForm?.occupation || ""}
                      onChange={(e) => handleProfileChange("occupation", e.target.value)}
                    />
                  </div>
                  <div>
                    <strong>Dị ứng thuốc / lưu ý</strong>
                    <textarea
                      className="input"
                      rows={3}
                      value={profileForm?.allergy_notes || ""}
                      onChange={(e) => handleProfileChange("allergy_notes", e.target.value)}
                    />
                  </div>
                  <div>
                    <strong>Người liên hệ khẩn cấp</strong>
                    <input
                      type="text"
                      className="input"
                      value={profileForm?.emergency_contact_name || ""}
                      onChange={(e) => handleProfileChange("emergency_contact_name", e.target.value)}
                    />
                  </div>
                  <div>
                    <strong>SĐT liên hệ khẩn cấp</strong>
                    <input
                      type="tel"
                      className="input"
                      value={profileForm?.emergency_contact_phone || ""}
                      onChange={(e) => handleProfileChange("emergency_contact_phone", e.target.value)}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button type="button" className="ghost-button" onClick={cancelEditProfile} disabled={savingProfile}>
                      Hủy
                    </button>
                    <button type="submit" className="primary-button" disabled={savingProfile}>
                      {savingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
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
