import { useState, useEffect } from "react";
import { api, downloadAuthenticatedFile } from "../../api/http";
import { EmptyState, Field, Panel } from "../../components/shared/UI";
import { currency, ROLE_LABELS } from "../../utils/helpers";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

export function AdminPortal({ loading, data, reload, activeTab }) {
  const [customDashboard, setCustomDashboard] = useState(null);
  const [reportDate, setReportDate] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isRefreshingReport, setIsRefreshingReport] = useState(false);
  const [isRefreshingHoSo, setIsRefreshingHoSo] = useState(false);

  const dashboard = customDashboard || data["/api/v1/reports/dashboard"] || {};
  
  // Debug: Log current dashboard state
  console.log('Current dashboard data:', dashboard);
  console.log('Custom dashboard:', customDashboard);
  console.log('Original data:', data["/api/v1/reports/dashboard"]);
  console.log('Current reportDate:', reportDate);
  const doctors = data["/api/v1/doctors"] || [];
  const medicines = data["/api/v1/medicines"] || [];
  const accounts = data["/api/v1/admin/accounts"] || [];
  const holidays = data["/api/v1/holidays"] || [];
  const doctorProfiles = data["/api/v1/admin/contracts"] || [];

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
  const [contractForm, setContractForm] = useState({
    doctor_id: "",
    ho_ten: "",
    ngay_sinh: "",
    gioi_tinh: "",
    dia_chi: "",
    so_cccd: "",
    so_dien_thoai: "",
    email_lien_he: "",
    ngay_vao_lam: "",
    ngay_het_han_hop_dong: "",
    nguoi_ky_hop_dong: "",
    ngay_het_han_chung_chi: "",
    vi_tri_cong_tac: "",
    ghi_chu: "",
  });
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [searchContract, setSearchContract] = useState("");
  /** null | "add" | "edit" — form chỉ hiện trong modal */
  const [hoSoFormModal, setHoSoFormModal] = useState(null);
  /** dòng đang xem chi tiết (read-only modal) */
  const [hoSoDetailRow, setHoSoDetailRow] = useState(null);

  const toDateInput = (v) => (v && typeof v === "string" ? v.slice(0, 10) : "");
  const dash = (v) => (v != null && String(v).trim() !== "" ? v : "—");
  const GENDER_LABELS = { male: "Nam", female: "Nữ", other: "Khác" };
  const optionalDate = (s) => (s && String(s).trim() ? s : null);

  const [holidayForm, setHolidayForm] = useState({ holiday_date: "", name: "" });

  const handleRefreshReport = async () => {
    setIsRefreshingReport(true);
    try {
      // Convert month (YYYY-MM) to first day of month (YYYY-MM-DD)
      const targetDate = `${reportDate}-01`;
      console.log('Fetching report for date:', targetDate);
      console.log('Current reportDate state:', reportDate);
      
      const resp = await api.get(`/api/v1/reports/dashboard?target_date=${targetDate}`);
      console.log('API Response:', resp.data);
      
      // Always set the custom dashboard to the new response
      setCustomDashboard(resp.data);
      
      // Show success message
      alert(`Đã tải báo cáo cho tháng ${reportDate} thành công!`);
    } catch (e) {
      console.error("Error loading report:", e);
      const errorMessage = e.response?.data?.detail || e.message || "Lỗi khi tải báo cáo.";
      alert(`Lỗi: ${errorMessage}`);
    } finally {
      setIsRefreshingReport(false);
    }
  };

  // Auto-refresh when reportDate changes
  useEffect(() => {
    console.log('reportDate changed to:', reportDate);
    if (activeTab === "baocao") {
      handleRefreshReport();
    }
  }, [reportDate, activeTab]);

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
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(accountForm.email)) {
      return alert("Email không hợp lệ. Vui lòng nhập email đúng định dạng (ví dụ: user@example.com)");
    }
    
    // Validate required fields
    if (!accountForm.email.trim() || !accountForm.password.trim() || !accountForm.full_name.trim()) {
      return alert("Vui lòng nhập đủ thông tin: Email, Mật khẩu, Họ tên");
    }

    // Additional validation for doctor role
    if (accountForm.role === "doctor" && (!accountForm.specialty?.trim() || !accountForm.license_number?.trim())) {
      return alert("Vui lòng nhập Chuyên khoa và Số chứng chỉ cho bác sĩ");
    }

    try {
      await api.post(`/api/v1/admin/accounts/${accountForm.role}`, accountForm);
      await reload();
      setAccountForm({ ...accountForm, email: "", password: "", full_name: "" });
      alert("Đã tạo tài khoản thành công!");
    } catch (e) {
      const errorMessage = e.response?.data?.detail || e.message || "Lỗi khi tạo tài khoản";
      alert(`Lỗi: ${errorMessage}`);
    }
  };

  const deleteAccount = async () => {
    if (!selectedAccountId) return alert("Vui lòng chọn tài khoản");
    if (window.confirm("CẢNH BÁO: Xóa tài khoản này sẽ xóa TOÀN BỘ dữ liệu liên quan (lịch làm việc, hồ sơ bệnh nhân, đơn thuốc, hóa đơn, v.v.).\n\nBạn có chắc chắn muốn xóa vĩnh viễn?")) {
      try {
        await api.delete(`/api/v1/admin/accounts/${selectedAccountId}`);
        await reload();
        setSelectedAccountId(null);
        alert("Đã xóa tài khoản và tất cả dữ liệu liên quan.");
      } catch(e) {
        const errorMessage = e.response?.data?.detail || e.message || "Lỗi khi xóa tài khoản";
        alert(errorMessage);
      }
    }
  };

  const resetPassword = async () => {
     if (!selectedAccountId) return alert("Vui lòng chọn tài khoản");
     if (window.confirm("Đặt lại mật khẩu tài khoản này về mặc định 123456?")) {
       try {
         await api.patch(`/api/v1/admin/accounts/${selectedAccountId}/reset-password`);
         alert("Đã đặt lại mật khẩu mặc định 123456.");
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

  const filteredAccounts = accounts.filter(a => 
      a.email.toLowerCase().includes(searchAccount.toLowerCase()) || 
      a.full_name.toLowerCase().includes(searchAccount.toLowerCase())
  );

  const filteredContracts = doctorProfiles.filter((p) =>
    `${p.ho_ten} ${p.so_cccd} ${p.vi_tri_cong_tac || ""} ${p.email_lien_he || ""}`
      .toLowerCase()
      .includes(searchContract.toLowerCase())
  );

  const doctorSelectOptions = doctors.filter((d) => {
    const taken = doctorProfiles.some((p) => p.doctor_id === d.id && p.id !== selectedContractId);
    return !taken;
  });

  const onSelectContract = (row) => {
    setSelectedContractId(row.id);
    setContractForm({
      doctor_id: row.doctor_id ?? "",
      ho_ten: row.ho_ten || "",
      ngay_sinh: toDateInput(row.ngay_sinh),
      gioi_tinh: row.gioi_tinh || "",
      dia_chi: row.dia_chi || "",
      so_cccd: row.so_cccd || "",
      so_dien_thoai: row.so_dien_thoai || "",
      email_lien_he: row.email_lien_he || "",
      ngay_vao_lam: toDateInput(row.ngay_vao_lam),
      ngay_het_han_hop_dong: toDateInput(row.ngay_het_han_hop_dong),
      nguoi_ky_hop_dong: row.nguoi_ky_hop_dong || "",
      ngay_het_han_chung_chi: toDateInput(row.ngay_het_han_chung_chi),
      vi_tri_cong_tac: row.vi_tri_cong_tac || "",
      ghi_chu: row.ghi_chu || "",
    });
  };

  const emptyProfileForm = () => ({
    doctor_id: "",
    ho_ten: "",
    ngay_sinh: "",
    gioi_tinh: "",
    dia_chi: "",
    so_cccd: "",
    so_dien_thoai: "",
    email_lien_he: "",
    ngay_vao_lam: "",
    ngay_het_han_hop_dong: "",
    nguoi_ky_hop_dong: "",
    ngay_het_han_chung_chi: "",
    vi_tri_cong_tac: "",
    ghi_chu: "",
  });

  const payloadFromForm = () => ({
    doctor_id: Number(contractForm.doctor_id),
    ho_ten: contractForm.ho_ten,
    ngay_sinh: optionalDate(contractForm.ngay_sinh),
    gioi_tinh: contractForm.gioi_tinh || null,
    dia_chi: contractForm.dia_chi || null,
    so_cccd: contractForm.so_cccd,
    so_dien_thoai: contractForm.so_dien_thoai || null,
    email_lien_he: contractForm.email_lien_he || null,
    ngay_vao_lam: contractForm.ngay_vao_lam,
    ngay_het_han_hop_dong: optionalDate(contractForm.ngay_het_han_hop_dong),
    nguoi_ky_hop_dong: contractForm.nguoi_ky_hop_dong || null,
    ngay_het_han_chung_chi: optionalDate(contractForm.ngay_het_han_chung_chi),
    vi_tri_cong_tac: contractForm.vi_tri_cong_tac || null,
    ghi_chu: contractForm.ghi_chu || null,
  });

  const createContract = async () => {
    if (!contractForm.doctor_id || !contractForm.ho_ten || !contractForm.so_cccd || !contractForm.ngay_vao_lam) {
      return alert("Vui lòng chọn bác sĩ và nhập đủ Họ tên, Số CCCD, Ngày vào làm");
    }
    try {
      await api.post("/api/v1/admin/contracts", payloadFromForm());
      await reload();
      setSelectedContractId(null);
      setContractForm(emptyProfileForm());
      setHoSoFormModal(null);
      alert("Đã thêm hồ sơ bác sĩ");
    } catch (e) {
      alert(e.response?.data?.detail || "Lỗi khi thêm hồ sơ");
    }
  };

  const updateContract = async () => {
    if (!selectedContractId) return alert("Vui lòng chọn một dòng trong bảng để sửa");
    if (!contractForm.doctor_id || !contractForm.ho_ten || !contractForm.so_cccd || !contractForm.ngay_vao_lam) {
      return alert("Vui lòng chọn bác sĩ và nhập đủ Họ tên, Số CCCD, Ngày vào làm");
    }
    try {
      await api.put(`/api/v1/admin/contracts/${selectedContractId}`, payloadFromForm());
      await reload();
      setHoSoFormModal(null);
      alert("Đã cập nhật hồ sơ bác sĩ");
    } catch (e) {
      alert(e.response?.data?.detail || "Lỗi khi cập nhật hồ sơ");
    }
  };

  const openHoSoAddModal = () => {
    setSelectedContractId(null);
    setContractForm(emptyProfileForm());
    setHoSoFormModal("add");
  };

  const openHoSoEditModal = () => {
    if (!selectedContractId) return alert("Vui lòng chọn một dòng trong bảng để sửa");
    setHoSoFormModal("edit");
  };

  const deleteContract = async () => {
    if (!selectedContractId) return alert("Vui lòng chọn hồ sơ để xóa");
    if (!window.confirm("Bạn có chắc chắn muốn xóa hồ sơ bác sĩ này?")) return;
    try {
      await api.delete(`/api/v1/admin/contracts/${selectedContractId}`);
      await reload();
      setSelectedContractId(null);
      setContractForm(emptyProfileForm());
      setHoSoFormModal(null);
      alert("Đã xóa hồ sơ bác sĩ");
    } catch (e) {
      alert(e.response?.data?.detail || "Lỗi khi xóa hồ sơ");
    }
  };

  const exportContractsPdf = async () => {
    try {
      await downloadAuthenticatedFile("/api/v1/admin/contracts/pdf", "danh_sach_ho_so_bac_si.pdf");
    } catch (e) {
      alert(e.response?.data?.detail || "Không thể xuất PDF hồ sơ bác sĩ");
    }
  };

  const refreshHoSo = async () => {
    setIsRefreshingHoSo(true);
    try {
      await reload();
    } finally {
      setIsRefreshingHoSo(false);
    }
  };

  return (
    <div className="dashboard-sections">
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
                             <span style={{ color: "green" }}>Đang hoạt động</span> : 
                             <span style={{ color: "red" }}>Không hoạt động</span>
                           }
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

      {/* HỢP ĐỒNG */}
      {activeTab === "hopdong" && (
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="ghost-button" style={{ border: "1px solid #D1D5DB" }} onClick={openHoSoAddModal}>
                Thêm
              </button>
              <button type="button" className="ghost-button" style={{ border: "1px solid #D1D5DB" }} onClick={openHoSoEditModal}>
                Sửa
              </button>
              <button className="ghost-button" style={{ border: "1px solid #D1D5DB" }} onClick={deleteContract}>Xóa</button>
              <button className="ghost-button" style={{ border: "1px solid #D1D5DB" }} onClick={exportContractsPdf}>Xuất PDF</button>
              <button
                type="button"
                className="ghost-button"
                style={{ border: "1px solid #D1D5DB" }}
                onClick={refreshHoSo}
                disabled={isRefreshingHoSo || loading}
              >
                {isRefreshingHoSo ? "Đang tải..." : "Làm mới"}
              </button>
            </div>
            <input
              placeholder="Tìm kiếm (họ tên, CCCD, vị trí, email)..."
              value={searchContract}
              onChange={(e) => setSearchContract(e.target.value)}
              style={{ padding: "8px", border: "1px solid #D1D5DB", borderRadius: "4px" }}
            />
          </div>

          <div style={{ border: "1px solid #E5E7EB", borderRadius: "8px", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ background: "#F3F4F6", textAlign: "left" }}>
                  <th style={{ padding: "12px", borderBottom: "1px solid #E5E7EB" }}>Họ tên</th>
                  <th style={{ padding: "12px", borderBottom: "1px solid #E5E7EB" }}>Mã bác sĩ</th>
                  <th style={{ padding: "12px", borderBottom: "1px solid #E5E7EB" }}>CCCD</th>
                  <th style={{ padding: "12px", borderBottom: "1px solid #E5E7EB" }}>Ngày vào làm</th>
                  <th style={{ padding: "12px", borderBottom: "1px solid #E5E7EB" }}>Hết hạn HĐ</th>
                  <th style={{ padding: "12px", borderBottom: "1px solid #E5E7EB" }}>Vị trí công tác</th>
                  <th style={{ padding: "12px", borderBottom: "1px solid #E5E7EB", width: "130px" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((row) => (
                  <tr
                    key={row.id}
                    style={{ background: selectedContractId === row.id ? "#EFF6FF" : "white", cursor: "pointer", borderBottom: "1px solid #F3F4F6" }}
                    onClick={() => onSelectContract(row)}
                  >
                    <td style={{ padding: "12px" }}>{row.ho_ten}</td>
                    <td style={{ padding: "12px" }}>{row.doctor_id}</td>
                    <td style={{ padding: "12px" }}>{row.so_cccd}</td>
                    <td style={{ padding: "12px" }}>{row.ngay_vao_lam || "—"}</td>
                    <td style={{ padding: "12px" }}>{row.ngay_het_han_hop_dong || "—"}</td>
                    <td style={{ padding: "12px" }}>{row.vi_tri_cong_tac || "—"}</td>
                    <td style={{ padding: "12px" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="ghost-button"
                        style={{ border: "1px solid #D1D5DB", fontSize: "0.85rem", padding: "6px 10px" }}
                        onClick={() => setHoSoDetailRow(row)}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hoSoFormModal && (
            <div
              role="presentation"
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.45)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
              }}
              onClick={() => setHoSoFormModal(null)}
            >
              <div
                role="dialog"
                aria-modal="true"
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #E5E7EB",
                  maxWidth: "920px",
                  width: "100%",
                  maxHeight: "90vh",
                  overflow: "auto",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#111827" }}>
                    {hoSoFormModal === "add" ? "Thêm hồ sơ bác sĩ" : "Sửa hồ sơ bác sĩ"}
                  </h3>
                  <button type="button" className="ghost-button" style={{ border: "1px solid #D1D5DB" }} onClick={() => setHoSoFormModal(null)}>
                    Đóng
                  </button>
                </div>
                <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                  <Field label="Bác sĩ (tài khoản)">
                    <select
                      value={contractForm.doctor_id === "" ? "" : String(contractForm.doctor_id)}
                      onChange={(e) => setContractForm((p) => ({ ...p, doctor_id: e.target.value === "" ? "" : Number(e.target.value) }))}
                    >
                      <option value="">— Chọn bác sĩ —</option>
                      {doctorSelectOptions.map((d) => (
                        <option key={d.id} value={d.id}>
                          #{d.id} — {d.user?.full_name || "Bác sĩ"} ({d.specialty})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Họ tên">
                    <input value={contractForm.ho_ten} onChange={(e) => setContractForm((p) => ({ ...p, ho_ten: e.target.value }))} />
                  </Field>
                  <Field label="Giới tính">
                    <select value={contractForm.gioi_tinh} onChange={(e) => setContractForm((p) => ({ ...p, gioi_tinh: e.target.value }))}>
                      <option value="">—</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </Field>
                  <Field label="Ngày sinh">
                    <input type="date" value={contractForm.ngay_sinh} onChange={(e) => setContractForm((p) => ({ ...p, ngay_sinh: e.target.value }))} />
                  </Field>
                  <Field label="Số CCCD">
                    <input value={contractForm.so_cccd} onChange={(e) => setContractForm((p) => ({ ...p, so_cccd: e.target.value }))} />
                  </Field>
                  <Field label="Số điện thoại">
                    <input value={contractForm.so_dien_thoai} onChange={(e) => setContractForm((p) => ({ ...p, so_dien_thoai: e.target.value }))} />
                  </Field>
                  <Field label="Email liên hệ">
                    <input type="email" value={contractForm.email_lien_he} onChange={(e) => setContractForm((p) => ({ ...p, email_lien_he: e.target.value }))} />
                  </Field>
                  <Field label="Ngày vào làm">
                    <input type="date" value={contractForm.ngay_vao_lam} onChange={(e) => setContractForm((p) => ({ ...p, ngay_vao_lam: e.target.value }))} />
                  </Field>
                  <Field label="Ngày hết hạn hợp đồng">
                    <input type="date" value={contractForm.ngay_het_han_hop_dong} onChange={(e) => setContractForm((p) => ({ ...p, ngay_het_han_hop_dong: e.target.value }))} />
                  </Field>
                  <Field label="Người ký hợp đồng">
                    <input value={contractForm.nguoi_ky_hop_dong} onChange={(e) => setContractForm((p) => ({ ...p, nguoi_ky_hop_dong: e.target.value }))} />
                  </Field>
                  <Field label="Ngày hết hạn chứng chỉ">
                    <input type="date" value={contractForm.ngay_het_han_chung_chi} onChange={(e) => setContractForm((p) => ({ ...p, ngay_het_han_chung_chi: e.target.value }))} />
                  </Field>
                  <Field label="Vị trí công tác">
                    <input value={contractForm.vi_tri_cong_tac} onChange={(e) => setContractForm((p) => ({ ...p, vi_tri_cong_tac: e.target.value }))} />
                  </Field>
                  <div style={{ gridColumn: "span 3" }}>
                    <Field label="Địa chỉ">
                      <input value={contractForm.dia_chi} onChange={(e) => setContractForm((p) => ({ ...p, dia_chi: e.target.value }))} />
                    </Field>
                  </div>
                  <div style={{ gridColumn: "span 3" }}>
                    <Field label="Ghi chú">
                      <textarea
                        rows={2}
                        value={contractForm.ghi_chu}
                        onChange={(e) => setContractForm((p) => ({ ...p, ghi_chu: e.target.value }))}
                        style={{ width: "100%", resize: "vertical" }}
                      />
                    </Field>
                  </div>
                </div>
                <div style={{ padding: "12px 20px 20px", display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid #F3F4F6" }}>
                  <button type="button" className="ghost-button" style={{ border: "1px solid #D1D5DB" }} onClick={() => setHoSoFormModal(null)}>
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => (hoSoFormModal === "add" ? createContract() : updateContract())}
                  >
                    {hoSoFormModal === "add" ? "Thêm mới" : "Cập nhật"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {hoSoDetailRow && (
            <div
              role="presentation"
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.45)",
                zIndex: 1001,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
              }}
              onClick={() => setHoSoDetailRow(null)}
            >
              <div
                role="dialog"
                aria-modal="true"
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #E5E7EB",
                  maxWidth: "480px",
                  width: "100%",
                  maxHeight: "85vh",
                  overflow: "auto",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "1rem", color: "#111827" }}>Chi tiết hồ sơ bác sĩ</h3>
                  <button type="button" className="ghost-button" style={{ border: "1px solid #D1D5DB" }} onClick={() => setHoSoDetailRow(null)}>
                    Đóng
                  </button>
                </div>
                <div style={{ padding: "16px 20px 20px", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    ["Họ tên", hoSoDetailRow.ho_ten],
                    ["Mã bác sĩ", hoSoDetailRow.doctor_id],
                    ["Giới tính", GENDER_LABELS[hoSoDetailRow.gioi_tinh] || dash(hoSoDetailRow.gioi_tinh)],
                    ["Ngày sinh", dash(hoSoDetailRow.ngay_sinh)],
                    ["Địa chỉ", dash(hoSoDetailRow.dia_chi)],
                    ["Số CCCD", hoSoDetailRow.so_cccd],
                    ["Số điện thoại", dash(hoSoDetailRow.so_dien_thoai)],
                    ["Email liên hệ", dash(hoSoDetailRow.email_lien_he)],
                    ["Ngày vào làm", dash(hoSoDetailRow.ngay_vao_lam)],
                    ["Ngày hết hạn hợp đồng", dash(hoSoDetailRow.ngay_het_han_hop_dong)],
                    ["Người ký hợp đồng", dash(hoSoDetailRow.nguoi_ky_hop_dong)],
                    ["Ngày hết hạn chứng chỉ", dash(hoSoDetailRow.ngay_het_han_chung_chi)],
                    ["Vị trí công tác", dash(hoSoDetailRow.vi_tri_cong_tac)],
                    ["Ghi chú", dash(hoSoDetailRow.ghi_chu)],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "10px", alignItems: "start" }}>
                      <span style={{ color: "#6B7280" }}>{label}</span>
                      <span style={{ wordBreak: "break-word", color: "#111827" }}>{val ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BÁO CÁO / THỐNG KÊ */}
      {activeTab === "baocao" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <h2 style={{ fontSize: "1.2rem", color: "#111827", marginBottom: 0 }}>Báo cáo tổng quan</h2>
             <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
               <span style={{ fontSize: "0.9rem", color: "#4B5563" }}>Xem báo cáo tháng:</span>
               <input
                 type="month"
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
           
           <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
              {/* Tổng bác sĩ Chart */}
              <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: "16px", padding: "24px" }}>
                <h3 style={{ margin: "0 0 16px 0", color: "#1E40AF", fontSize: "1.1rem" }}>Tổng bác sĩ</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Bác sĩ', value: dashboard.total_doctors || 0, color: '#2563EB' },
                        { name: 'Còn lại', value: Math.max(0, 20 - (dashboard.total_doctors || 0)), color: '#E5E7EB' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[{ name: 'Bác sĩ', value: dashboard.total_doctors || 0, color: '#2563EB' }, { name: 'Còn lại', value: Math.max(0, 20 - (dashboard.total_doctors || 0)), color: '#E5E7EB' }].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center", marginTop: "16px" }}>
                  <strong style={{ fontSize: "1.5rem", color: "#1E40AF" }}>{dashboard.total_doctors || 0}</strong>
                  <div style={{ fontSize: "0.9rem", color: "#6B7280" }}>bác sĩ</div>
                </div>
              </div>

              {/* Tổng ngày khám Chart */}
              <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: "16px", padding: "24px" }}>
                <h3 style={{ margin: "0 0 16px 0", color: "#1E3A8A", fontSize: "1.1rem" }}>Tổng ngày khám</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                        { name: 'T1', days: 65 },
                        { name: 'T2', days: 78 },
                        { name: 'T3', days: 90 },
                        { name: 'T4', days: 81 },
                        { name: 'T5', days: 56 },
                        { name: 'T6', days: 95 },
                        { name: 'T7', days: dashboard.total_exam_days || 0 }
                      ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="days" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center", marginTop: "16px" }}>
                  <strong style={{ fontSize: "1.5rem", color: "#1E3A8A" }}>{dashboard.total_exam_days || 0}</strong>
                  <div style={{ fontSize: "0.9rem", color: "#6B7280" }}>ngày khám</div>
                </div>
              </div>

              {/* Tổng kho Chart */}
              <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: "16px", padding: "24px" }}>
                <h3 style={{ margin: "0 0 16px 0", color: "#047857", fontSize: "1.1rem" }}>Tổng kho</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={[
                        { name: 'T1', quantity: 1200 },
                        { name: 'T2', quantity: 1800 },
                        { name: 'T3', quantity: 2400 },
                        { name: 'T4', quantity: 2100 },
                        { name: 'T5', quantity: 2800 },
                        { name: 'T6', quantity: 3200 },
                        { name: 'T7', quantity: dashboard.total_inventory || 0 }
                      ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="quantity" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center", marginTop: "16px" }}>
                  <strong style={{ fontSize: "1.5rem", color: "#047857" }}>{Number(dashboard.total_inventory || 0).toLocaleString("vi-VN")}</strong>
                  <div style={{ fontSize: "0.9rem", color: "#6B7280" }}>sản phẩm</div>
                </div>
              </div>

              {/* Tổng quỹ Chart */}
              <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: "16px", padding: "24px" }}>
                <h3 style={{ margin: "0 0 16px 0", color: "#B45309", fontSize: "1.1rem" }}>Tổng quỹ</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={[
                        { name: 'T1', fund: 45000000 },
                        { name: 'T2', fund: 52000000 },
                        { name: 'T3', fund: 48000000 },
                        { name: 'T4', fund: 61000000 },
                        { name: 'T5', fund: 58000000 },
                        { name: 'T6', fund: 72000000 },
                        { name: 'T7', fund: dashboard.total_fund || 0 }
                      ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => currency(value)} />
                    <Line type="monotone" dataKey="fund" stroke="#F59E0B" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center", marginTop: "16px" }}>
                  <strong style={{ fontSize: "1.3rem", color: "#B45309" }}>{currency(dashboard.total_fund || 0)}</strong>
                  <div style={{ fontSize: "0.9rem", color: "#6B7280" }}>quỹ tiền mặt</div>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
