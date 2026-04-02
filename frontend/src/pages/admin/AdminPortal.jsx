import { useState } from "react";
import { api } from "../../api/http";
import { EmptyState, Field, Panel } from "../../components/shared/UI";
import { ROLE_LABELS } from "../../utils/helpers";

export function AdminPortal({ loading, data, reload, activeTab }) {
  const [customDashboard, setCustomDashboard] = useState(null);
  const [reportDate, setReportDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [isRefreshingReport, setIsRefreshingReport] = useState(false);

  const dashboard = customDashboard || data["/api/v1/reports/dashboard"] || {};
  const doctors = data["/api/v1/doctors"] || [];
  const medicines = data["/api/v1/medicines"] || [];
  const accounts = data["/api/v1/admin/accounts"] || [];
  const holidays = data["/api/v1/holidays"] || [];

  const [danhSachTab, setDanhSachTab] = useState("bacsi");
  const [lichTab, setLichTab] = useState("lichkhambacsi");

  // Account Form State
  const [accountForm, setAccountForm] = useState({
    role: "doctor",
    full_name: "",
    email: "",
    password: "",
    specialty: "Da liễu",
    license_number: "",
  });
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [searchAccount, setSearchAccount] = useState("");

  const [holidayForm, setHolidayForm] = useState({ holiday_date: "", name: "" });

  const handleRefreshReport = async () => {
    setIsRefreshingReport(true);
    try {
      const resp = await api.get(`/api/v1/reports/dashboard?target_date=${reportDate}`);
      setCustomDashboard(resp.data);
    } catch (e) {
      alert("Lỗi khi tải báo cáo.");
    } finally {
      setIsRefreshingReport(false);
    }
  };

  const handleAccountRowClick = (account) => {
    setSelectedAccountId(account.id);
    setAccountForm({
      role: account.role,
      full_name: account.full_name,
      email: account.email,
      password: "", // do not show password
      specialty: "", // optional handling for doctors 
      license_number: "", // optional handling
    });
  };

  const createAccount = async () => {
    try {
      await api.post(`/api/v1/admin/accounts/${accountForm.role}`, accountForm);
      await reload();
      setAccountForm({ ...accountForm, email: "", password: "", full_name: "" });
    } catch (e) {
      alert("Lỗi khi tạo tài khoản");
    }
  };

  // Delete/Reset PK functions Placeholder (assuming api endpoints if exist)
  const deleteAccount = async () => {
    if (!selectedAccountId) return;
    try {
      // await api.delete(`/api/v1/admin/accounts/${selectedAccountId}`);
      // await reload();
      alert("Chức năng xóa đang nâng cấp.");
    } catch(e) {}
  };

  const resetPassword = async () => {
     if (!selectedAccountId) return;
     alert("Chức năng reset mật khẩu đang nâng cấp.");
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

  const filteredAccounts = accounts.filter(a => 
      a.email.toLowerCase().includes(searchAccount.toLowerCase()) || 
      a.full_name.toLowerCase().includes(searchAccount.toLowerCase())
  );

  return (
    <div className="dashboard-sections">
      {activeTab === "trangdieukhien" && (
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

      {/* DANH SÁCH */}
      {activeTab === "danhsach" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
             <button style={{ 
               padding: "8px 16px", 
               borderRadius: "8px", 
               border: danhSachTab === "bacsi" ? "1px solid #1E40AF" : "1px solid #E5E7EB", 
               background: danhSachTab === "bacsi" ? "#EFF6FF" : "#F9FAFB",
               fontWeight: danhSachTab === "bacsi" ? "bold" : "normal",
               cursor: "pointer"
              }} 
              onClick={() => setDanhSachTab('bacsi')}
             >
                Danh sách bác sĩ
             </button>
             <button style={{ 
               padding: "8px 16px", 
               borderRadius: "8px", 
               border: danhSachTab === "thuoc" ? "1px solid #1E40AF" : "1px solid #E5E7EB", 
               background: danhSachTab === "thuoc" ? "#EFF6FF" : "#F9FAFB",
               fontWeight: danhSachTab === "thuoc" ? "bold" : "normal",
               cursor: "pointer"
              }} 
              onClick={() => setDanhSachTab('thuoc')}
             >
                Danh sách thuốc
             </button>
          </div>
          
          {danhSachTab === "bacsi" ? (
             <Panel title="Danh sách bác sĩ">
              <div className="list-stack">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="list-row" style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
                    <div>
                      <strong style={{ fontSize: '1rem', color: '#1E40AF' }}>{doctor.user?.full_name}</strong>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>Chuyên khoa: {doctor.specialty}</div>
                    </div>
                  </div>
                ))}
              </div>
             </Panel>
          ) : (
            <Panel title="Danh sách thuốc (Kho thuốc)">
              <div className="list-stack">
                {medicines.map((medicine) => (
                  <div key={medicine.id} className="list-row" style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
                    <div>
                      <strong style={{ fontSize: '1rem', color: '#059669' }}>{medicine.name}</strong>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                        Tồn kho: {medicine.current_stock}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
             </Panel>
          )}
        </div>
      )}

      {/* QUẢN LÝ LỊCH */}
      {activeTab === "quanlylich" && (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <aside style={{ width: '250px', flexShrink: 0, background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
             <h3 style={{ fontSize: '1rem', marginBottom: '8px', color: '#374151' }}>Menu lịch</h3>
             <button 
               className={`ghost-button left ${lichTab === 'lichkhambacsi' ? 'active' : ''}`} 
               style={{ background: lichTab === 'lichkhambacsi' ? '#F3F4F6' : 'transparent', textAlign: 'left', padding: '10px' }}
               onClick={() => setLichTab('lichkhambacsi')}>
                 Quản lý lịch khám bác sĩ
             </button>
             <button 
               className={`ghost-button left ${lichTab === 'ngaynghibacsi' ? 'active' : ''}`} 
               style={{ background: lichTab === 'ngaynghibacsi' ? '#F3F4F6' : 'transparent', textAlign: 'left', padding: '10px' }}
               onClick={() => setLichTab('ngaynghibacsi')}>
                 Quản lý ngày nghỉ bác sĩ
             </button>
             <button 
               className={`ghost-button left ${lichTab === 'ngaynghiphongkham' ? 'active' : ''}`} 
               style={{ background: lichTab === 'ngaynghiphongkham' ? '#F3F4F6' : 'transparent', textAlign: 'left', padding: '10px' }}
               onClick={() => setLichTab('ngaynghiphongkham')}>
                 Quản lý ngày nghỉ phòng khám
             </button>
          </aside>
          
          <div style={{ flex: 1 }}>
            {lichTab === "lichkhambacsi" && (
               <Panel title="Quản lý lịch khám bác sĩ">
                  <EmptyState text="Chức năng đang được phát triển..." />
               </Panel>
            )}
            {lichTab === "ngaynghibacsi" && (
               <Panel title="Quản lý ngày nghỉ bác sĩ">
                  <EmptyState text="Chức năng đang được phát triển..." />
               </Panel>
            )}
            {lichTab === "ngaynghiphongkham" && (
              <Panel title="Ngày nghỉ phòng khám">
                <div className="form-stack" style={{ maxWidth: '400px' }}>
                  <Field label="Ngày nghỉ">
                    <input type="date" value={holidayForm.holiday_date} onChange={(e) => setHolidayForm((p) => ({ ...p, holiday_date: e.target.value }))} />
                  </Field>
                  <Field label="Tên ngày nghỉ">
                    <input value={holidayForm.name} onChange={(e) => setHolidayForm((p) => ({ ...p, name: e.target.value }))} />
                  </Field>
                  <button className="primary-button" onClick={createHoliday}>
                    Lưu ngày nghỉ
                  </button>
                  <div className="list-stack compact-list" style={{ marginTop: '24px' }}>
                    {holidays.map((holiday) => (
                      <div key={holiday.id} className="list-row" style={{ background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px' }}>
                        <strong>{holiday.name}</strong>
                        <span>{holiday.holiday_date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}

      {/* QUẢN LÝ TÀI KHOẢN */}
      {activeTab === "taikhoan" && (
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Top Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="ghost-button" style={{ border: "1px solid #D1D5DB" }} onClick={createAccount}>Thêm</button>
              <button className="ghost-button" style={{ border: "1px solid #D1D5DB" }} onClick={() => alert("Chưa hỗ trợ sửa trực tiếp. Vui lòng thêm/khóa.")}>Sửa</button>
              <button className="ghost-button" style={{ border: "1px solid #D1D5DB" }} onClick={deleteAccount}>Xóa</button>
              <button className="ghost-button" style={{ border: "1px solid #D1D5DB" }} onClick={resetPassword}>Reset MK</button>
              <button className="ghost-button" style={{ border: "1px solid #D1D5DB" }} onClick={() => { setSelectedAccountId(null); setAccountForm({...accountForm, full_name:'', email:'', password:''}) }}>Làm mới</button>
            </div>
            <div>
              <input 
                placeholder="Tìm kiếm tài khoản..." 
                value={searchAccount} 
                onChange={(e) => setSearchAccount(e.target.value)} 
                style={{ padding: "8px", border: "1px solid #D1D5DB", borderRadius: "4px" }} 
              />
            </div>
          </div>

          {/* Table */}
          <div style={{ border: "1px solid #E5E7EB", borderRadius: "8px", overflow: "hidden" }}>
             <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                   <tr style={{ background: "#F3F4F6", textAlign: "left" }}>
                      <th style={{ padding: "12px", borderBottom: "1px solid #E5E7EB" }}>Tên đăng nhập (Email)</th>
                      <th style={{ padding: "12px", borderBottom: "1px solid #E5E7EB" }}>Nhân sự (Họ tên)</th>
                      <th style={{ padding: "12px", borderBottom: "1px solid #E5E7EB" }}>Quyền</th>
                      <th style={{ padding: "12px", borderBottom: "1px solid #E5E7EB" }}>Trạng thái</th>
                   </tr>
                </thead>
                <tbody>
                   {filteredAccounts.map(acc => (
                      <tr 
                        key={acc.id} 
                        style={{ background: selectedAccountId === acc.id ? "#EFF6FF" : "white", cursor: "pointer", borderBottom: "1px solid #F3F4F6" }}
                        onClick={() => handleAccountRowClick(acc)}
                      >
                         <td style={{ padding: "12px" }}>{acc.email}</td>
                         <td style={{ padding: "12px" }}>{acc.full_name}</td>
                         <td style={{ padding: "12px" }}>{ROLE_LABELS[acc.role] || acc.role}</td>
                         <td style={{ padding: "12px" }}>
                           {acc.is_active ? 
                              <span style={{ color: "green" }}>Hoạt động</span> : 
                              <span style={{ color: "red" }}>Đã khóa</span>
                           }
                           <button className="button-link" style={{ fontSize:"0.8rem", marginLeft:"8px" }} onClick={(e) => { e.stopPropagation(); lockAccount(acc.id, acc.is_active); }}>
                             ({acc.is_active ? "Khóa" : "Mở khóa"})
                           </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>

          {/* Bottom Form */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px", marginTop: "8px", alignItems: "start" }}>
             <Field label="Tên đăng nhập (Email)">
                <input value={accountForm.email} onChange={e => setAccountForm(p => ({...p, email: e.target.value}))} />
             </Field>
             <Field label="Mật khẩu">
                <input type="password" value={accountForm.password} onChange={e => setAccountForm(p => ({...p, password: e.target.value}))} />
             </Field>
             <Field label="Nhân sự (Họ tên)">
                <input value={accountForm.full_name} onChange={e => setAccountForm(p => ({...p, full_name: e.target.value}))} />
             </Field>
             <Field label="Quyền">
                <select value={accountForm.role} onChange={e => setAccountForm(p => ({...p, role: e.target.value}))}>
                   <option value="doctor">Bác sĩ</option>
                   <option value="pharmacist">Dược sĩ</option>
                   <option value="patient">Bệnh nhân</option>
                   <option value="admin">Quản trị viên</option>
                </select>
             </Field>
             
             {accountForm.role === "doctor" && (
                <>
                  <Field label="Chuyên khoa">
                    <input value={accountForm.specialty} onChange={(e) => setAccountForm((p) => ({ ...p, specialty: e.target.value }))} />
                  </Field>
                  <Field label="Số chứng chỉ">
                    <input value={accountForm.license_number} onChange={(e) => setAccountForm((p) => ({ ...p, license_number: e.target.value }))} />
                  </Field>
                </>
             )}
          </div>
        </div>
      )}

      {/* BÁO CÁO / THỐNG KÊ */}
      {activeTab === "baocao" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <h2 style={{ fontSize: "1.2rem", color: "#111827", marginBottom: 0 }}>Báo cáo tổng quan</h2>
             <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
               <span style={{ fontSize: "0.9rem", color: "#4B5563" }}>Xem báo cáo ngày:</span>
               <input
                 type="date"
                 value={reportDate}
                 onChange={(e) => setReportDate(e.target.value)}
                 style={{ padding: "8px", border: "1px solid #D1D5DB", borderRadius: "8px" }}
               />
               <button
                 className="primary-button"
                 onClick={handleRefreshReport}
                 disabled={isRefreshingReport}
                 style={{ minWidth: "100px" }}
               >
                 {isRefreshingReport ? "Đang tải..." : "Làm mới"}
               </button>
             </div>
           </div>
           
           <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
              <div style={{ background: "linear-gradient(135deg, #3B82F6 0%, #1E3A8A 100%)", color: "white", padding: "24px", borderRadius: "16px", display: "flex", flexDirection: "column" }}>
                 <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>Tổng lịch hẹn hôm nay</span>
                 <strong style={{ fontSize: "2rem", marginTop: "8px" }}>{dashboard.today_appointments || 0}</strong>
              </div>
              <div style={{ background: "linear-gradient(135deg, #10B981 0%, #047857 100%)", color: "white", padding: "24px", borderRadius: "16px", display: "flex", flexDirection: "column" }}>
                 <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>Số bệnh nhân đang chờ</span>
                 <strong style={{ fontSize: "2rem", marginTop: "8px" }}>{dashboard.waiting || 0}</strong>
              </div>
              <div style={{ background: "linear-gradient(135deg, #F59E0B 0%, #B45309 100%)", color: "white", padding: "24px", borderRadius: "16px", display: "flex", flexDirection: "column" }}>
                 <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>Thuốc sắp hết hạn/tồn thấp</span>
                 <strong style={{ fontSize: "2rem", marginTop: "8px" }}>{dashboard.low_stock_count || 0}</strong>
              </div>
              <div style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #5B21B6 100%)", color: "white", padding: "24px", borderRadius: "16px", display: "flex", flexDirection: "column" }}>
                 <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>Tổng bác sĩ trực</span>
                 <strong style={{ fontSize: "2rem", marginTop: "8px" }}>{doctors.length}</strong>
              </div>
           </div>

           <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
              <Panel title="Thống kê theo trạng thái khám">
                 <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "16px", padding: "16px 0", borderBottom: "1px solid #E5E7EB", borderLeft: "1px solid #E5E7EB" }}>
                    <div style={{ flex: 1, background: "#EFF6FF", height: "100%", margin: "0 8px", position: "relative" }}>
                       <div style={{ position: "absolute", bottom: "-24px", width: "100%", textAlign: "center", fontSize: "0.8rem", color: "#6B7280" }}>Hoàn thành</div>
                    </div>
                    <div style={{ flex: 1, background: "#FEF3C7", height: "60%", margin: "0 8px", position: "relative" }}>
                       <div style={{ position: "absolute", bottom: "-24px", width: "100%", textAlign: "center", fontSize: "0.8rem", color: "#6B7280" }}>Đang chờ</div>
                    </div>
                    <div style={{ flex: 1, background: "#FEE2E2", height: "20%", margin: "0 8px", position: "relative" }}>
                       <div style={{ position: "absolute", bottom: "-24px", width: "100%", textAlign: "center", fontSize: "0.8rem", color: "#6B7280" }}>Hủy bỏ</div>
                    </div>
                 </div>
              </Panel>
              <Panel title="Ghi chú hệ thống">
                 <ul style={{ paddingLeft: "16px", margin: 0, color: "#4B5563", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <li>Hệ thống đang hoạt động ổn định.</li>
                    <li>Đã cập nhật danh sách kho thuốc ngày {new Date().toLocaleDateString('vi-VN')}.</li>
                 </ul>
              </Panel>
           </div>
        </div>
      )}
    </div>
  );
}
