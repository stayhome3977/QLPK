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
  const [selectedLichDoctorId, setSelectedLichDoctorId] = useState("");
  
  const [doctorScheduleForm, setDoctorScheduleForm] = useState({
    day_of_week: 1,
    start_time: "08:00",
    end_time: "17:00",
    slot_duration: 30,
    max_patients: 2,
  });
  
  const [doctorLeaveForm, setDoctorLeaveForm] = useState({ leave_date: "", reason: "" });
  const [doctorLeaves, setDoctorLeaves] = useState([]);
  const [doctorSchedules, setDoctorSchedules] = useState([]);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editingLeaveId, setEditingLeaveId] = useState(null);
  const [editingHolidayId, setEditingHolidayId] = useState(null);

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

  const deleteAccount = async () => {
    if (!selectedAccountId) return alert("Vui lòng chọn tài khoản");
    if (window.confirm("Bạn có chắc chắn muốn xóa tài khoản này vĩnh viễn?")) {
      try {
        await api.delete(`/api/v1/admin/accounts/${selectedAccountId}`);
        await reload();
        setSelectedAccountId(null);
        alert("Đã xóa tài khoản.");
      } catch(e) {
        alert("Lỗi khi xóa tài khoản");
      }
    }
  };

  const resetPassword = async () => {
     if (!selectedAccountId) return alert("Vui lòng chọn tài khoản");
     const newPwd = window.prompt("Nhập mật khẩu mới cho tài khoản:");
     if (newPwd) {
       try {
         await api.patch(`/api/v1/admin/accounts/${selectedAccountId}/reset-password`, { new_password: newPwd });
         alert("Đã đặt lại mật khẩu thành công.");
       } catch (e) {
         alert("Lỗi khi đặt lại mật khẩu");
       }
     }
  };

  const saveHoliday = async () => {
    if (!holidayForm.holiday_date || !holidayForm.name) return alert("Vui lòng nhập đủ thông tin ngày nghỉ");
    try {
      if (editingHolidayId) {
        await api.put(`/api/v1/holidays/${editingHolidayId}`, holidayForm);
      } else {
        await api.post("/api/v1/holidays", holidayForm);
      }
      setHolidayForm({ holiday_date: "", name: "" });
      setEditingHolidayId(null);
      await reload();
      alert(editingHolidayId ? "Đã cập nhật ngày nghỉ phòng khám" : "Đã thêm ngày nghỉ phòng khám");
    } catch (e) {
      alert("Lỗi khi lưu ngày nghỉ phòng khám");
    }
  };

  const fetchDoctorDetails = async (doctorId) => {
    if (!doctorId) {
      setDoctorSchedules([]);
      setDoctorLeaves([]);
      return;
    }
    try {
      const schResp = await api.get(`/api/v1/doctors/${doctorId}/schedule`);
      setDoctorSchedules(schResp.data || []);
      const leaveResp = await api.get(`/api/v1/doctors/${doctorId}/leaves`);
      setDoctorLeaves(leaveResp.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLichDoctorChange = (e) => {
    const id = e.target.value;
    setSelectedLichDoctorId(id);
    fetchDoctorDetails(id);
  };

  const saveSchedule = async () => {
    if (!selectedLichDoctorId) return alert("Vui lòng chọn bác sĩ");
    try {
      const payload = { 
        ...doctorScheduleForm, 
        is_active: true,
        day_of_week: Number(doctorScheduleForm.day_of_week),
        slot_duration: Number(doctorScheduleForm.slot_duration),
        max_patients: Number(doctorScheduleForm.max_patients)
      };
      if (editingScheduleId) {
        await api.put(`/api/v1/admin/doctors/${selectedLichDoctorId}/schedule/${editingScheduleId}`, payload);
      } else {
        await api.post(`/api/v1/admin/doctors/${selectedLichDoctorId}/schedule`, payload);
      }
      await fetchDoctorDetails(selectedLichDoctorId);
      setDoctorScheduleForm({
        day_of_week: 1,
        start_time: "08:00",
        end_time: "17:00",
        slot_duration: 30,
        max_patients: 2,
      });
      setEditingScheduleId(null);
      alert("Đã lưu lịch làm việc");
    } catch(e) {
      alert("Lỗi khi lưu lịch làm việc");
    }
  };

  const saveLeave = async () => {
    if (!selectedLichDoctorId) return alert("Vui lòng chọn bác sĩ");
    if (!doctorLeaveForm.leave_date) return alert("Vui lòng chọn ngày nghỉ");
    try {
      if (editingLeaveId) {
        await api.put(`/api/v1/admin/doctors/${selectedLichDoctorId}/leave/${editingLeaveId}`, doctorLeaveForm);
      } else {
        await api.post(`/api/v1/admin/doctors/${selectedLichDoctorId}/leave`, doctorLeaveForm);
      }
      await fetchDoctorDetails(selectedLichDoctorId);
      setDoctorLeaveForm({ leave_date: "", reason: "" });
      setEditingLeaveId(null);
      alert(editingLeaveId ? "Đã cập nhật ngày nghỉ" : "Đã thêm ngày nghỉ");
    } catch(e) {
      alert("Lỗi khi thêm ngày nghỉ");
    }
  };
  
  const deleteLeave = async (leave_date) => {
    if (!selectedLichDoctorId) return;
    try {
      if(window.confirm("Bạn muốn xóa ngày nghỉ này?")) {
        await api.delete(`/api/v1/admin/doctors/${selectedLichDoctorId}/leave/${leave_date}`);
        await fetchDoctorDetails(selectedLichDoctorId);
      }
    } catch(e) {
      alert("Lỗi khi xóa ngày nghỉ");
    }
  };

  const editSchedule = (schedule) => {
    setEditingScheduleId(schedule.id);
    setDoctorScheduleForm({
      day_of_week: schedule.day_of_week,
      start_time: String(schedule.start_time).slice(0, 5),
      end_time: String(schedule.end_time).slice(0, 5),
      slot_duration: schedule.slot_duration,
      max_patients: schedule.max_patients,
    });
  };

  const deleteSchedule = async (scheduleId) => {
    if (!selectedLichDoctorId) return;
    try {
      if (window.confirm("Bạn muốn xóa lịch khám này?")) {
        await api.delete(`/api/v1/admin/doctors/${selectedLichDoctorId}/schedule/${scheduleId}`);
        await fetchDoctorDetails(selectedLichDoctorId);
      }
    } catch (e) {
      alert("Lỗi khi xóa lịch khám");
    }
  };

  const editLeave = (leave) => {
    setEditingLeaveId(leave.id);
    setDoctorLeaveForm({
      leave_date: String(leave.leave_date),
      reason: leave.reason || "",
    });
  };

  const editHoliday = (holiday) => {
    setEditingHolidayId(holiday.id);
    setHolidayForm({
      holiday_date: String(holiday.holiday_date),
      name: holiday.name || "",
      is_active: holiday.is_active,
    });
  };

  const deleteHoliday = async (holidayId) => {
    try {
      if (window.confirm("Bạn muốn xóa ngày nghỉ phòng khám này?")) {
        await api.delete(`/api/v1/holidays/${holidayId}`);
        await reload();
      }
    } catch (e) {
      alert("Lỗi khi xóa ngày nghỉ phòng khám");
    }
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
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
             <button style={{ 
               padding: "8px 16px", 
               borderRadius: "8px", 
               border: lichTab === "lichkhambacsi" ? "1px solid #1E40AF" : "1px solid #E5E7EB", 
               background: lichTab === "lichkhambacsi" ? "#EFF6FF" : "#F9FAFB",
               fontWeight: lichTab === "lichkhambacsi" ? "bold" : "normal",
               cursor: "pointer"
              }} 
              onClick={() => setLichTab('lichkhambacsi')}
             >
                Quản lý lịch khám bác sĩ
             </button>
             <button style={{ 
               padding: "8px 16px", 
               borderRadius: "8px", 
               border: lichTab === "ngaynghibacsi" ? "1px solid #1E40AF" : "1px solid #E5E7EB", 
               background: lichTab === "ngaynghibacsi" ? "#EFF6FF" : "#F9FAFB",
               fontWeight: lichTab === "ngaynghibacsi" ? "bold" : "normal",
               cursor: "pointer"
              }} 
              onClick={() => setLichTab('ngaynghibacsi')}
             >
                Quản lý ngày nghỉ bác sĩ
             </button>
             <button style={{ 
               padding: "8px 16px", 
               borderRadius: "8px", 
               border: lichTab === "ngaynghiphongkham" ? "1px solid #1E40AF" : "1px solid #E5E7EB", 
               background: lichTab === "ngaynghiphongkham" ? "#EFF6FF" : "#F9FAFB",
               fontWeight: lichTab === "ngaynghiphongkham" ? "bold" : "normal",
               cursor: "pointer"
              }} 
              onClick={() => setLichTab('ngaynghiphongkham')}
             >
                Quản lý ngày nghỉ phòng khám
             </button>
          </div>
          
          <div style={{ flex: 1 }}>
            {lichTab === "lichkhambacsi" && (
               <Panel title="Quản lý lịch khám bác sĩ">
                  <div style={{ marginBottom: "16px", maxWidth: "400px" }}>
                     <Field label="Chọn bác sĩ">
                        <select value={selectedLichDoctorId} onChange={handleLichDoctorChange}>
                           <option value="">-- Chọn bác sĩ --</option>
                           {doctors.map(d => (
                              <option key={d.id} value={d.id}>{d.user?.full_name} ({d.specialty})</option>
                           ))}
                        </select>
                     </Field>
                  </div>
                  {selectedLichDoctorId && (
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div className="form-stack">
                           <h4 style={{ margin: 0, color: '#374151' }}>Thêm lịch khám</h4>
                           <Field label="Thứ">
                              <select value={doctorScheduleForm.day_of_week} onChange={e => setDoctorScheduleForm(p => ({ ...p, day_of_week: e.target.value }))}>
                                 <option value={1}>Thứ 2</option>
                                 <option value={2}>Thứ 3</option>
                                 <option value={3}>Thứ 4</option>
                                 <option value={4}>Thứ 5</option>
                                 <option value={5}>Thứ 6</option>
                                 <option value={6}>Thứ 7</option>
                                 <option value={0}>Chủ nhật</option>
                              </select>
                           </Field>
                           <div style={{ display: 'flex', gap: '16px' }}>
                              <Field label="Giờ bắt đầu">
                                 <input type="time" value={doctorScheduleForm.start_time} onChange={e => setDoctorScheduleForm(p => ({ ...p, start_time: e.target.value }))} />
                              </Field>
                              <Field label="Giờ kết thúc">
                                 <input type="time" value={doctorScheduleForm.end_time} onChange={e => setDoctorScheduleForm(p => ({ ...p, end_time: e.target.value }))} />
                              </Field>
                           </div>
                           <div style={{ display: 'flex', gap: '16px' }}>
                              <Field label="Thời lượng slot (phút)">
                                 <input type="number" min="5" value={doctorScheduleForm.slot_duration} onChange={e => setDoctorScheduleForm(p => ({ ...p, slot_duration: e.target.value }))} />
                              </Field>
                              <Field label="Bệnh nhân tối đa / slot">
                                 <input type="number" min="1" value={doctorScheduleForm.max_patients} onChange={e => setDoctorScheduleForm(p => ({ ...p, max_patients: e.target.value }))} />
                              </Field>
                           </div>
                           <div style={{ display: "flex", gap: "8px" }}>
                              <button className="primary-button" onClick={saveSchedule}>{editingScheduleId ? "Cập nhật lịch làm việc" : "Ghi nhận lịch làm việc"}</button>
                              {editingScheduleId && (
                                <button
                                  className="ghost-button"
                                  onClick={() => {
                                    setEditingScheduleId(null);
                                    setDoctorScheduleForm({
                                      day_of_week: 1,
                                      start_time: "08:00",
                                      end_time: "17:00",
                                      slot_duration: 30,
                                      max_patients: 2,
                                    });
                                  }}
                                >
                                  Hủy sửa
                                </button>
                              )}
                           </div>
                        </div>
                        <div>
                           <h4 style={{ margin: "0 0 16px 0", color: '#374151' }}>Lịch làm việc đã đăng ký</h4>
                           {doctorSchedules.length === 0 ? (
                              <EmptyState text="Chưa có lịch làm việc được đăng ký" />
                           ) : (
                              <div className="list-stack compact-list">
                                 {doctorSchedules.map(sch => (
                                    <div key={sch.id} style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                                       <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                                         <div>
                                           <strong>{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][sch.day_of_week]}</strong>
                                           <div style={{ fontSize: '0.9rem', color: '#4B5563', marginTop: '4px' }}>
                                              {sch.start_time} - {sch.end_time} ({sch.slot_duration} phút/slot)
                                           </div>
                                         </div>
                                         <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                           <button className="ghost-button" onClick={() => editSchedule(sch)}>Sửa</button>
                                           <button className="ghost-button" style={{ color: '#DC2626' }} onClick={() => deleteSchedule(sch.id)}>Xóa</button>
                                         </div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     </div>
                  )}
               </Panel>
            )}
            {lichTab === "ngaynghibacsi" && (
               <Panel title="Quản lý ngày nghỉ bác sĩ">
                  <div style={{ marginBottom: "16px", maxWidth: "400px" }}>
                     <Field label="Chọn bác sĩ">
                        <select value={selectedLichDoctorId} onChange={handleLichDoctorChange}>
                           <option value="">-- Chọn bác sĩ --</option>
                           {doctors.map(d => (
                              <option key={d.id} value={d.id}>{d.user?.full_name} ({d.specialty})</option>
                           ))}
                        </select>
                     </Field>
                  </div>
                  {selectedLichDoctorId && (
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div className="form-stack">
                           <h4 style={{ margin: 0, color: '#374151' }}>Thêm ngày nghỉ</h4>
                           <Field label="Ngày nghỉ">
                              <input type="date" value={doctorLeaveForm.leave_date} onChange={e => setDoctorLeaveForm(p => ({ ...p, leave_date: e.target.value }))} />
                           </Field>
                           <Field label="Lý do">
                              <input value={doctorLeaveForm.reason} onChange={e => setDoctorLeaveForm(p => ({ ...p, reason: e.target.value }))} />
                           </Field>
                           <div style={{ display: "flex", gap: "8px" }}>
                             <button className="primary-button" onClick={saveLeave}>{editingLeaveId ? "Cập nhật ngày nghỉ" : "Ghi nhận ngày nghỉ"}</button>
                             {editingLeaveId && (
                               <button
                                 className="ghost-button"
                                 onClick={() => {
                                   setEditingLeaveId(null);
                                   setDoctorLeaveForm({ leave_date: "", reason: "" });
                                 }}
                               >
                                 Hủy sửa
                               </button>
                             )}
                           </div>
                        </div>
                        <div>
                           <h4 style={{ margin: "0 0 16px 0", color: '#374151' }}>Ngày nghỉ đã đăng ký</h4>
                           {doctorLeaves.length === 0 ? (
                              <EmptyState text="Chưa có ngày nghỉ nào" />
                           ) : (
                              <div className="list-stack compact-list">
                                 {doctorLeaves.map(leave => (
                                    <div key={leave.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FEF2F2', padding: '12px', borderRadius: '8px', border: '1px solid #FECACA' }}>
                                       <div>
                                          <strong style={{ color: '#991B1B' }}>{leave.leave_date}</strong>
                                          <div style={{ fontSize: '0.9rem', color: '#7F1D1D', marginTop: '4px' }}>{leave.reason}</div>
                                       </div>
                                       <div style={{ display: "flex", gap: "8px" }}>
                                         <button className="ghost-button" onClick={() => editLeave(leave)}>Sửa</button>
                                         <button className="ghost-button" style={{ color: '#DC2626' }} onClick={() => deleteLeave(leave.leave_date)}>Xóa</button>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     </div>
                  )}
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
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="primary-button" onClick={saveHoliday}>
                      {editingHolidayId ? "Cập nhật ngày nghỉ" : "Lưu ngày nghỉ"}
                    </button>
                    {editingHolidayId && (
                      <button
                        className="ghost-button"
                        onClick={() => {
                          setEditingHolidayId(null);
                          setHolidayForm({ holiday_date: "", name: "" });
                        }}
                      >
                        Hủy sửa
                      </button>
                    )}
                  </div>
                  <div className="list-stack compact-list" style={{ marginTop: '24px' }}>
                    {holidays.map((holiday) => (
                      <div key={holiday.id} className="list-row" style={{ background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px' }}>
                        <div>
                          <strong>{holiday.name}</strong>
                          <span style={{ marginLeft: "8px" }}>{holiday.holiday_date}</span>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button className="ghost-button" onClick={() => editHoliday(holiday)}>Sửa</button>
                          <button className="ghost-button" style={{ color: '#DC2626' }} onClick={() => deleteHoliday(holiday.id)}>Xóa</button>
                        </div>
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
