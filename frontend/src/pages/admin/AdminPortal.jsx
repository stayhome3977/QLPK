import { useState } from "react";
import { api } from "../../api/http";
import { Field, Panel, AppointmentTable, MedicineTable } from "../../components/shared/UI";

export function AdminPortal({ data, runAction }) {
  const [doc, setDoc] = useState({ full_name: "", email: "", password: "Doctor@123", specialty: "Da liễu", license_number: "" });
  const [med, setMed] = useState({ name: "", unit: "Hộp", price_per_unit: 0, reorder_level: 50 });

  const addDoc = () => runAction(() => api.post("/api/v1/doctors", doc));
  const addMed = () => runAction(() => api.post("/api/v1/medicines", med));

  return (
    <>
      <div className="content-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 0 }}>
        <Panel title="👨‍⚕️ Tạo Tài Khoản Bác Sĩ">
          <div className="form-grid" style={{ gridTemplateColumns: "1fr", marginBottom: 0 }}>
            <Field label="Họ Tên"><input value={doc.full_name} onChange={(e) => setDoc(p => ({ ...p, full_name: e.target.value }))} /></Field>
            <Field label="Email"><input value={doc.email} onChange={(e) => setDoc(p => ({ ...p, email: e.target.value }))} /></Field>
            <Field label="Mật khẩu temp"><input value={doc.password} onChange={(e) => setDoc(p => ({ ...p, password: e.target.value }))} /></Field>
            <div className="form-grid" style={{ marginBottom: 0 }}>
              <Field label="Chuyên khoa"><input value={doc.specialty} onChange={(e) => setDoc(p => ({ ...p, specialty: e.target.value }))} /></Field>
              <Field label="Số chứng chỉ"><input value={doc.license_number} onChange={(e) => setDoc(p => ({ ...p, license_number: e.target.value }))} /></Field>
            </div>
          </div>
          <button className="btn btn-primary" onClick={addDoc} style={{ marginTop: "1rem" }}>Tạo bác sĩ</button>
        </Panel>

        <Panel title="💊 Thêm Loại Thuốc Mới">
          <div className="form-grid" style={{ gridTemplateColumns: "1fr", marginBottom: 0 }}>
            <Field label="Tên thuốc"><input value={med.name} onChange={(e) => setMed(p => ({ ...p, name: e.target.value }))} /></Field>
            <div className="form-grid" style={{ marginBottom: 0 }}>
              <Field label="Đơn vị"><input value={med.unit} onChange={(e) => setMed(p => ({ ...p, unit: e.target.value }))} /></Field>
              <Field label="Mức báo động (tồn kho)"><input type="number" value={med.reorder_level} onChange={(e) => setMed(p => ({ ...p, reorder_level: e.target.value }))} /></Field>
            </div>
            <Field label="Đơn giá (VND)"><input type="number" value={med.price_per_unit} onChange={(e) => setMed(p => ({ ...p, price_per_unit: e.target.value }))} /></Field>
          </div>
          <button className="btn btn-primary" onClick={addMed} style={{ marginTop: "1rem" }}>Lưu vào danh mục</button>
        </Panel>
      </div>

      <Panel title="Danh sách bác sĩ hệ thống">
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Họ tên</th><th>Chuyên khoa</th><th>Chứng chỉ</th></tr></thead>
            <tbody>
              {(data.doctors || []).map(d => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td><strong>{d.user?.full_name}</strong></td>
                  <td>{d.specialty}</td>
                  <td className="muted">{d.license_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Danh sách kho thuốc tổng hợp">
        <MedicineTable items={data.medicines || []} />
      </Panel>
    </>
  );
}
