import { useState } from "react";
import { api } from "../../api/http";
import { EmptyState, Field, Panel } from "../../components/shared/UI";
import { ROLE_LABELS } from "../../utils/helpers";

export function AdminPortal({ loading, data, reload, activeTab }) {
  const dashboard = data["/api/v1/reports/dashboard"] || {};
  const doctors = data["/api/v1/doctors"] || [];
  const medicines = data["/api/v1/medicines"] || [];
  const accounts = data["/api/v1/admin/accounts"] || [];
  const holidays = data["/api/v1/holidays"] || [];
  const [accountForm, setAccountForm] = useState({
    role: "doctor",
    full_name: "",
    email: "",
    password: "Doctor@123",
    specialty: "Da liễu",
    license_number: "",
  });
  const [holidayForm, setHolidayForm] = useState({ holiday_date: "", name: "" });

  const createAccount = async () => {
    await api.post(`/api/v1/admin/accounts/${accountForm.role}`, accountForm);
    await reload();
  };

  const createHoliday = async () => {
    await api.post("/api/v1/holidays", holidayForm);
    setHolidayForm({ holiday_date: "", name: "" });
    await reload();
  };

  const lockAccount = async (id, active) => {
    await api.patch(`/api/v1/admin/accounts/${id}/${active ? "lock" : "unlock"}`);
    await reload();
  };

  return (
    <div className="dashboard-sections">
      {activeTab === "thongke" && (
        <section className="summary-strip">
          <div className="summary-card">
            <strong>{dashboard.today_appointments || 0}</strong>
            <span>Lịch hôm nay</span>
          </div>
          <div className="summary-card">
            <strong>{dashboard.waiting || 0}</strong>
            <span>Đang chờ</span>
          </div>
          <div className="summary-card">
            <strong>{dashboard.low_stock_count || 0}</strong>
            <span>Cảnh báo tồn kho</span>
          </div>
        </section>
      )}

      {activeTab === "taikhoan" && (
        <div className="dashboard-sections two-columns">
          <Panel title="Tạo tài khoản vận hành">
            <div className="form-stack">
              <Field label="Vai trò">
                <select value={accountForm.role} onChange={(e) => setAccountForm((p) => ({ ...p, role: e.target.value }))}>
                  <option value="doctor">Bác sĩ</option>
                  <option value="pharmacist">Dược sĩ</option>
                  <option value="patient">Bệnh nhân</option>
                </select>
              </Field>
              <Field label="Họ tên">
                <input value={accountForm.full_name} onChange={(e) => setAccountForm((p) => ({ ...p, full_name: e.target.value }))} />
              </Field>
              <Field label="Email">
                <input value={accountForm.email} onChange={(e) => setAccountForm((p) => ({ ...p, email: e.target.value }))} />
              </Field>
              <Field label="Mật khẩu">
                <input value={accountForm.password} onChange={(e) => setAccountForm((p) => ({ ...p, password: e.target.value }))} />
              </Field>
              {accountForm.role === "doctor" ? (
                <>
                  <Field label="Chuyên khoa">
                    <input value={accountForm.specialty} onChange={(e) => setAccountForm((p) => ({ ...p, specialty: e.target.value }))} />
                  </Field>
                  <Field label="Số chứng chỉ">
                    <input value={accountForm.license_number} onChange={(e) => setAccountForm((p) => ({ ...p, license_number: e.target.value }))} />
                  </Field>
                </>
              ) : null}
              <button className="primary-button" onClick={createAccount}>
                Tạo tài khoản
              </button>
            </div>
          </Panel>

          <Panel title="Tài khoản hệ thống">
            {loading ? (
              <p>Đang tải...</p>
            ) : accounts.length === 0 ? (
              <EmptyState text="Chưa có tài khoản nào." />
            ) : (
              <div className="list-stack">
                {accounts.map((account) => (
                  <div className="list-row" key={account.id}>
                    <div>
                      <strong>{account.full_name}</strong>
                      <p>{account.email} - {ROLE_LABELS[account.role] || account.role}</p>
                    </div>
                    <button className="ghost-button" onClick={() => lockAccount(account.id, account.is_active)}>
                      {account.is_active ? "Khóa" : "Mở khóa"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {activeTab === "danhmuc" && (
        <div className="dashboard-sections two-columns">
          <Panel title="Ngày nghỉ phòng khám">
            <div className="form-stack">
              <Field label="Ngày nghỉ">
                <input type="date" value={holidayForm.holiday_date} onChange={(e) => setHolidayForm((p) => ({ ...p, holiday_date: e.target.value }))} />
              </Field>
              <Field label="Tên ngày nghỉ">
                <input value={holidayForm.name} onChange={(e) => setHolidayForm((p) => ({ ...p, name: e.target.value }))} />
              </Field>
              <button className="secondary-link button-link" onClick={createHoliday}>
                Lưu ngày nghỉ
              </button>
              <div className="list-stack compact-list">
                {holidays.map((holiday) => (
                  <div key={holiday.id} className="list-row">
                    <strong>{holiday.name}</strong>
                    <span>{holiday.holiday_date}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Bác sĩ và kho thuốc">
            <div className="list-stack compact-list">
              {doctors.map((doctor) => (
                <div key={doctor.id} className="list-row">
                  <strong>{doctor.user?.full_name}</strong>
                  <span>{doctor.specialty}</span>
                </div>
              ))}
              {medicines.slice(0, 5).map((medicine) => (
                <div key={medicine.id} className="list-row">
                  <strong>{medicine.name}</strong>
                  <span>{medicine.current_stock}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {["nhansu", "phongban", "luong", "hopdong", "nghiepvu"].includes(activeTab) && (
        <Panel title="Chức năng trống">
          <EmptyState text="Chức năng này đang được phát triển hoặc chưa có dữ liệu." />
        </Panel>
      )}
    </div>
  );
}
