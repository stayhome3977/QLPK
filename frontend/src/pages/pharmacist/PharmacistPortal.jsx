import { useState } from "react";
import { api } from "../../api/http";
import { Alert, EmptyState, Field, Panel } from "../../components/shared/UI";
import { currency, INVOICE_STATUS_LABELS, PRESCRIPTION_STATUS_LABELS } from "../../utils/helpers";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

/* ─── helpers ─────────────────────────────────────────── */
function ModalForm({ title, onClose, children }) {
  return (
    <div className="pharm-modal-overlay" onClick={onClose}>
      <div className="pharm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pharm-modal-header">
          <h3>{title}</h3>
          <button className="ghost-button" onClick={onClose}>✕</button>
        </div>
        <div className="pharm-modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB: Tổng quan — Đơn thuốc chờ cấp phát
   ═══════════════════════════════════════════════════════ */
function TabTongQuan({ loading, prescriptions, reload }) {
  const prepare = async (id) => { await api.patch(`/api/v1/prescriptions/${id}/prepare`); await reload(); };
  const dispense = async (id) => { await api.patch(`/api/v1/prescriptions/${id}/dispense`); await reload(); };

  return (
    <Panel title="Đơn thuốc chờ cấp phát">
      {loading ? <p>Đang tải...</p> : prescriptions.length === 0 ? (
        <EmptyState text="Chưa có đơn thuốc nào cần xử lý." />
      ) : (
        <div className="pharm-table-wrap">
          <table className="pharm-table">
            <thead>
              <tr><th>Mã đơn</th><th>Bệnh nhân</th><th>Trạng thái</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {prescriptions.map((rx) => (
                <tr key={rx.id}>
                  <td><strong>#{rx.id}</strong></td>
                  <td>{rx.patient_name || `BN #${rx.patient_id}`}</td>
                  <td><span className={`badge badge-${rx.status}`}>{PRESCRIPTION_STATUS_LABELS[rx.status] || rx.status}</span></td>
                  <td className="row-actions">
                    {rx.status === "pending" && <button className="pharm-btn secondary" onClick={() => prepare(rx.id)}>Chuẩn bị</button>}
                    {["prepared", "awaiting_payment"].includes(rx.status) && (
                      <button className="pharm-btn primary" onClick={() => dispense(rx.id)}>Giao thuốc</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB: Kho thuốc — CRUD + nhập lô
   ═══════════════════════════════════════════════════════ */
const defaultMed = { name: "", generic_name: "", category: "Thuốc da liễu", unit: "viên", price_per_unit: 0, reorder_level: 10, manufacturer: "", storage_conditions: "", description: "" };
const defaultBatch = { supplier_id: "", import_quantity: 0, import_price_per_unit: 0, manufacturing_date: "", expiry_date: "", batch_number: "", notes: "" };

function TabKhoThuoc({ loading, medicines, suppliers, reload }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showBatch, setShowBatch] = useState(null); // medicine being stocked
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(defaultMed);
  const [batchForm, setBatchForm] = useState(defaultBatch);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openAdd = () => { setForm(defaultMed); setError(""); setShowAdd(true); };
  const openEdit = (m) => { setEditItem(m); setForm({ name: m.name, generic_name: m.generic_name || "", category: m.category || "", unit: m.unit || "", price_per_unit: m.price_per_unit, reorder_level: m.reorder_level, manufacturer: m.manufacturer || "", storage_conditions: m.storage_conditions || "", description: m.description || "" }); setError(""); setShowAdd(true); };

  const save = async () => {
    setSaving(true); setError("");
    try {
      if (editItem) await api.put(`/api/v1/medicines/${editItem.id}`, form);
      else await api.post("/api/v1/medicines", form);
      await reload(); setShowAdd(false); setEditItem(null);
    } catch (e) { setError(e.response?.data?.detail || "Lưu thất bại"); }
    setSaving(false);
  };

  const deactivate = async (id) => {
    if (!confirm("Vô hiệu hóa thuốc này?")) return;
    await api.delete(`/api/v1/medicines/${id}`); await reload();
  };

  const importBatch = async () => {
    setSaving(true); setError("");
    try {
      await api.post(`/api/v1/medicines/${showBatch.id}/batches/import`, { ...batchForm, import_quantity: Number(batchForm.import_quantity), import_price_per_unit: Number(batchForm.import_price_per_unit) });
      await reload(); setShowBatch(null); setBatchForm(defaultBatch);
    } catch (e) { setError(e.response?.data?.detail || "Nhập lô thất bại"); }
    setSaving(false);
  };

  const activeMeds = medicines.filter((m) => m.is_active !== false);

  return (
    <>
      <Panel title="Danh sách thuốc">
        <div className="pharm-toolbar">
          <span className="pharm-count">{activeMeds.length} loại thuốc</span>
          <button className="pharm-btn primary" onClick={openAdd}>+ Thêm thuốc</button>
        </div>
        {loading ? <p>Đang tải...</p> : activeMeds.length === 0 ? <EmptyState text="Kho trống." /> : (
          <div className="pharm-table-wrap">
            <table className="pharm-table">
              <thead>
                <tr><th>Tên thuốc</th><th>Danh mục</th><th>Đơn vị</th><th>Giá/đơn vị</th><th>Tồn kho</th><th>Ngưỡng</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                {activeMeds.map((m) => (
                  <tr key={m.id} className={m.current_stock <= m.reorder_level ? "row-warn" : ""}>
                    <td><strong>{m.name}</strong>{m.generic_name ? <small className="text-muted"> ({m.generic_name})</small> : null}</td>
                    <td>{m.category}</td>
                    <td>{m.unit}</td>
                    <td>{currency(m.price_per_unit)}</td>
                    <td><span className={m.current_stock <= m.reorder_level ? "badge badge-warn" : ""}>{m.current_stock}</span></td>
                    <td>{m.reorder_level}</td>
                    <td className="row-actions">
                      <button className="pharm-btn secondary sm" onClick={() => openEdit(m)}>Sửa</button>
                      <button className="pharm-btn info sm" onClick={() => { setShowBatch(m); setBatchForm(defaultBatch); setError(""); }}>Nhập lô</button>
                      <button className="pharm-btn danger sm" onClick={() => deactivate(m.id)}>Ẩn</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Add / Edit Modal */}
      {showAdd && (
        <ModalForm title={editItem ? "Sửa thuốc" : "Thêm thuốc mới"} onClose={() => { setShowAdd(false); setEditItem(null); }}>
          <div className="pharm-form-grid">
            <Field label="Tên thuốc *"><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></Field>
            <Field label="Tên generic"><input value={form.generic_name} onChange={(e) => setForm((p) => ({ ...p, generic_name: e.target.value }))} /></Field>
            <Field label="Danh mục"><input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} /></Field>
            <Field label="Đơn vị"><input value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} /></Field>
            <Field label="Giá/đơn vị (VNĐ)"><input type="number" value={form.price_per_unit} onChange={(e) => setForm((p) => ({ ...p, price_per_unit: e.target.value }))} /></Field>
            <Field label="Ngưỡng cảnh báo tồn kho"><input type="number" value={form.reorder_level} onChange={(e) => setForm((p) => ({ ...p, reorder_level: e.target.value }))} /></Field>
            <Field label="Nhà sản xuất"><input value={form.manufacturer} onChange={(e) => setForm((p) => ({ ...p, manufacturer: e.target.value }))} /></Field>
            <Field label="Điều kiện bảo quản"><input value={form.storage_conditions} onChange={(e) => setForm((p) => ({ ...p, storage_conditions: e.target.value }))} /></Field>
          </div>
          <Field label="Mô tả"><textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} /></Field>
          {error && <Alert type="error">{error}</Alert>}
          <div className="pharm-modal-actions">
            <button className="pharm-btn ghost" onClick={() => { setShowAdd(false); setEditItem(null); }}>Hủy</button>
            <button className="pharm-btn primary" onClick={save} disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</button>
          </div>
        </ModalForm>
      )}

      {/* Batch Import Modal */}
      {showBatch && (
        <ModalForm title={`Nhập lô — ${showBatch.name}`} onClose={() => setShowBatch(null)}>
          <div className="pharm-form-grid">
            <Field label="Nhà cung cấp">
              <select value={batchForm.supplier_id} onChange={(e) => setBatchForm((p) => ({ ...p, supplier_id: e.target.value }))}>
                <option value="">Không có</option>
                {suppliers.filter((s) => s.is_active !== false).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Số lô"><input value={batchForm.batch_number} onChange={(e) => setBatchForm((p) => ({ ...p, batch_number: e.target.value }))} /></Field>
            <Field label="Số lượng nhập *"><input type="number" value={batchForm.import_quantity} onChange={(e) => setBatchForm((p) => ({ ...p, import_quantity: e.target.value }))} /></Field>
            <Field label="Giá nhập/đơn vị"><input type="number" value={batchForm.import_price_per_unit} onChange={(e) => setBatchForm((p) => ({ ...p, import_price_per_unit: e.target.value }))} /></Field>
            <Field label="Ngày sản xuất"><input type="date" value={batchForm.manufacturing_date} onChange={(e) => setBatchForm((p) => ({ ...p, manufacturing_date: e.target.value }))} /></Field>
            <Field label="Hạn sử dụng"><input type="date" value={batchForm.expiry_date} onChange={(e) => setBatchForm((p) => ({ ...p, expiry_date: e.target.value }))} /></Field>
          </div>
          <Field label="Ghi chú"><textarea value={batchForm.notes} onChange={(e) => setBatchForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></Field>
          {error && <Alert type="error">{error}</Alert>}
          <div className="pharm-modal-actions">
            <button className="pharm-btn ghost" onClick={() => setShowBatch(null)}>Hủy</button>
            <button className="pharm-btn primary" onClick={importBatch} disabled={saving}>{saving ? "Đang nhập..." : "Xác nhận nhập lô"}</button>
          </div>
        </ModalForm>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB: Nhà cung cấp — CRUD
   ═══════════════════════════════════════════════════════ */
const defaultSupplier = { name: "", contact_name: "", phone: "", email: "", address: "", tax_code: "", notes: "" };

function TabNhaCungCap({ loading, suppliers, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(defaultSupplier);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openAdd = () => { setForm(defaultSupplier); setEditItem(null); setError(""); setShowForm(true); };
  const openEdit = (s) => { setEditItem(s); setForm({ name: s.name, contact_name: s.contact_name || "", phone: s.phone || "", email: s.email || "", address: s.address || "", tax_code: s.tax_code || "", notes: s.notes || "" }); setError(""); setShowForm(true); };

  const save = async () => {
    setSaving(true); setError("");
    try {
      if (editItem) await api.put(`/api/v1/suppliers/${editItem.id}`, form);
      else await api.post("/api/v1/suppliers", form);
      await reload(); setShowForm(false); setEditItem(null);
    } catch (e) { setError(e.response?.data?.detail || "Lưu thất bại"); }
    setSaving(false);
  };

  const deactivate = async (id) => {
    if (!confirm("Vô hiệu hóa nhà cung cấp này?")) return;
    await api.delete(`/api/v1/suppliers/${id}`); await reload();
  };

  const activeSuppliers = suppliers.filter((s) => s.is_active !== false);

  return (
    <>
      <Panel title="Nhà cung cấp">
        <div className="pharm-toolbar">
          <span className="pharm-count">{activeSuppliers.length} nhà cung cấp</span>
          <button className="pharm-btn primary" onClick={openAdd}>+ Thêm NCC</button>
        </div>
        {loading ? <p>Đang tải...</p> : activeSuppliers.length === 0 ? <EmptyState text="Chưa có nhà cung cấp nào." /> : (
          <div className="pharm-table-wrap">
            <table className="pharm-table">
              <thead>
                <tr><th>Tên công ty</th><th>Người liên hệ</th><th>SĐT</th><th>Email</th><th>Mã số thuế</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                {activeSuppliers.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.contact_name || "—"}</td>
                    <td>{s.phone || "—"}</td>
                    <td>{s.email || "—"}</td>
                    <td>{s.tax_code || "—"}</td>
                    <td className="row-actions">
                      <button className="pharm-btn secondary sm" onClick={() => openEdit(s)}>Sửa</button>
                      <button className="pharm-btn danger sm" onClick={() => deactivate(s.id)}>Ẩn</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {showForm && (
        <ModalForm title={editItem ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"} onClose={() => { setShowForm(false); setEditItem(null); }}>
          <div className="pharm-form-grid">
            <Field label="Tên công ty *"><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></Field>
            <Field label="Người liên hệ"><input value={form.contact_name} onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))} /></Field>
            <Field label="Số điện thoại"><input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></Field>
            <Field label="Mã số thuế"><input value={form.tax_code} onChange={(e) => setForm((p) => ({ ...p, tax_code: e.target.value }))} /></Field>
            <Field label="Địa chỉ"><input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} /></Field>
          </div>
          <Field label="Ghi chú"><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></Field>
          {error && <Alert type="error">{error}</Alert>}
          <div className="pharm-modal-actions">
            <button className="pharm-btn ghost" onClick={() => { setShowForm(false); setEditItem(null); }}>Hủy</button>
            <button className="pharm-btn primary" onClick={save} disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</button>
          </div>
        </ModalForm>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB: Hóa đơn — Danh sách + Tạo + Xuất PDF
   ═══════════════════════════════════════════════════════ */
function TabHoaDon({ loading, invoices, completedAppts, reload }) {
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ appointment_id: "", discount_amount: 0, discount_reason: "", insurance_support_amount: 0, notes: "" });
  const [detailInvoice, setDetailInvoice] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const createInvoice = async () => {
    if (!createForm.appointment_id) { setError("Vui lòng chọn lịch khám"); return; }
    setCreating(true); setError("");
    try {
      await api.post(`/api/v1/invoices/generate/${createForm.appointment_id}`, {
        discount_amount: Number(createForm.discount_amount),
        discount_reason: createForm.discount_reason,
        insurance_support_amount: Number(createForm.insurance_support_amount),
        notes: createForm.notes,
      });
      await reload(); setShowCreate(false);
    } catch (e) { setError(e.response?.data?.detail || "Tạo hóa đơn thất bại"); }
    setCreating(false);
  };

  const openPdf = (id) => { window.open(`${API_BASE}/api/v1/invoices/${id}/pdf`, "_blank"); };

  return (
    <>
      <Panel title="Danh sách hóa đơn">
        <div className="pharm-toolbar">
          <span className="pharm-count">{invoices.length} hóa đơn</span>
          <button className="pharm-btn primary" onClick={() => { setShowCreate(true); setError(""); setCreateForm({ appointment_id: "", discount_amount: 0, discount_reason: "", insurance_support_amount: 0, notes: "" }); }}>+ Tạo hóa đơn</button>
        </div>
        {loading ? <p>Đang tải...</p> : invoices.length === 0 ? <EmptyState text="Chưa có hóa đơn nào." /> : (
          <div className="pharm-table-wrap">
            <table className="pharm-table">
              <thead>
                <tr><th>Số HĐ</th><th>Bệnh nhân</th><th>Tổng tiền</th><th>Đã trả</th><th>Trạng thái</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td><strong>{inv.invoice_number}</strong></td>
                    <td>{inv.patient_name || `BN #${inv.patient_id}`}</td>
                    <td>{currency(inv.total_amount)}</td>
                    <td>{currency(inv.paid_amount || 0)}</td>
                    <td><span className={`badge badge-${inv.invoice_status}`}>{INVOICE_STATUS_LABELS[inv.invoice_status] || inv.invoice_status}</span></td>
                    <td className="row-actions">
                      <button className="pharm-btn secondary sm" onClick={() => setDetailInvoice(inv)}>Chi tiết</button>
                      <button className="pharm-btn info sm" onClick={() => openPdf(inv.id)}>📄 PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Create Invoice Modal */}
      {showCreate && (
        <ModalForm title="Tạo hóa đơn từ lịch khám" onClose={() => setShowCreate(false)}>
          <Field label="Lịch khám đã hoàn thành *">
            <select value={createForm.appointment_id} onChange={(e) => setCreateForm((p) => ({ ...p, appointment_id: e.target.value }))}>
              <option value="">Chọn lịch khám</option>
              {(completedAppts || []).map((a) => (
                <option key={a.id} value={a.id}>#{a.id} — {a.patient_name} — BS. {a.doctor_name} ({a.appointment_date})</option>
              ))}
            </select>
          </Field>
          <div className="pharm-form-grid">
            <Field label="Giảm giá (VNĐ)"><input type="number" value={createForm.discount_amount} onChange={(e) => setCreateForm((p) => ({ ...p, discount_amount: e.target.value }))} /></Field>
            <Field label="Hỗ trợ bảo hiểm (VNĐ)"><input type="number" value={createForm.insurance_support_amount} onChange={(e) => setCreateForm((p) => ({ ...p, insurance_support_amount: e.target.value }))} /></Field>
          </div>
          <Field label="Lý do giảm giá"><input value={createForm.discount_reason} onChange={(e) => setCreateForm((p) => ({ ...p, discount_reason: e.target.value }))} /></Field>
          <Field label="Ghi chú hóa đơn"><textarea value={createForm.notes} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></Field>
          {error && <Alert type="error">{error}</Alert>}
          <div className="pharm-modal-actions">
            <button className="pharm-btn ghost" onClick={() => setShowCreate(false)}>Hủy</button>
            <button className="pharm-btn primary" onClick={createInvoice} disabled={creating}>{creating ? "Đang tạo..." : "Tạo hóa đơn"}</button>
          </div>
        </ModalForm>
      )}

      {/* Invoice Detail Modal */}
      {detailInvoice && (
        <ModalForm title={`Hóa đơn ${detailInvoice.invoice_number}`} onClose={() => setDetailInvoice(null)}>
          <div className="invoice-detail-block">
            <div className="invoice-detail-row"><span>Bệnh nhân</span><strong>{detailInvoice.patient_name || "—"}</strong></div>
            <div className="invoice-detail-row"><span>Trạng thái</span><strong>{INVOICE_STATUS_LABELS[detailInvoice.invoice_status] || detailInvoice.invoice_status}</strong></div>
            <div className="invoice-detail-row"><span>Tổng tiền</span><strong>{currency(detailInvoice.total_amount)}</strong></div>
            <div className="invoice-detail-row"><span>Đã thanh toán</span><strong>{currency(detailInvoice.paid_amount || 0)}</strong></div>
            <div className="invoice-detail-row"><span>Giảm giá</span><span>{currency(detailInvoice.discount_amount || 0)}</span></div>
            <div className="invoice-detail-row"><span>Bảo hiểm</span><span>{currency(detailInvoice.insurance_support_amount || 0)}</span></div>
            {detailInvoice.notes && <div className="invoice-detail-row"><span>Ghi chú</span><span>{detailInvoice.notes}</span></div>}
          </div>
          {(detailInvoice.items || []).length > 0 && (
            <>
              <h4 style={{ marginTop: "16px" }}>Các dịch vụ / thuốc</h4>
              <table className="pharm-table">
                <thead><tr><th>Mô tả</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                <tbody>
                  {detailInvoice.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td>{currency(item.unit_price)}</td>
                      <td>{currency(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <div className="pharm-modal-actions">
            <button className="pharm-btn info" onClick={() => openPdf(detailInvoice.id)}>📄 Xuất PDF</button>
            <button className="pharm-btn ghost" onClick={() => setDetailInvoice(null)}>Đóng</button>
          </div>
        </ModalForm>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB: Thanh toán
   ═══════════════════════════════════════════════════════ */
function TabThanhToan({ loading, invoices, reload }) {
  const unpaidInvoices = invoices.filter((inv) => ["issued", "partially_paid", "draft"].includes(inv.invoice_status));
  const [payForm, setPayForm] = useState({ invoice_id: "", amount: "", payment_method: "cash", transaction_ref: "" });
  const [refundForm, setRefundForm] = useState({ invoice_id: "", amount: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handlePay = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      await api.patch(`/api/v1/invoices/${payForm.invoice_id}/pay`, { amount: Number(payForm.amount), payment_method: payForm.payment_method, transaction_ref: payForm.transaction_ref });
      setSuccess("Thu tiền thành công!"); setPayForm({ invoice_id: "", amount: "", payment_method: "cash", transaction_ref: "" }); await reload();
    } catch (e) { setError(e.response?.data?.detail || "Thu tiền thất bại"); }
    setSaving(false);
  };

  const handleConfirmTransfer = async (id) => {
    await api.patch(`/api/v1/invoices/${id}/confirm-transfer`); await reload();
  };

  const handleRefund = async () => {
    if (!refundForm.invoice_id) { setError("Chọn hóa đơn cần hoàn tiền"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      await api.post(`/api/v1/invoices/${refundForm.invoice_id}/refund`, { amount: Number(refundForm.amount), reason: refundForm.reason });
      setSuccess("Hoàn tiền thành công!"); setRefundForm({ invoice_id: "", amount: "", reason: "" }); await reload();
    } catch (e) { setError(e.response?.data?.detail || "Hoàn tiền thất bại"); }
    setSaving(false);
  };

  const pendingTransfer = invoices.filter((inv) => inv.payment_status === "awaiting_confirmation");
  const selectedInvoice = invoices.find((inv) => String(inv.id) === String(payForm.invoice_id));

  return (
    <div className="dashboard-sections two-columns">
      {/* Thu tiền */}
      <Panel title="Thu tiền">
        <div className="form-stack">
          <Field label="Chọn hóa đơn">
            <select value={payForm.invoice_id} onChange={(e) => { const inv = invoices.find((i) => String(i.id) === e.target.value); setPayForm((p) => ({ ...p, invoice_id: e.target.value, amount: inv ? String(inv.total_amount - (inv.paid_amount || 0)) : "" })); }}>
              <option value="">Chọn hóa đơn</option>
              {unpaidInvoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoice_number} — {inv.patient_name} — còn {currency((inv.total_amount || 0) - (inv.paid_amount || 0))}</option>)}
            </select>
          </Field>
          {selectedInvoice && (
            <div className="pharm-invoice-summary">
              <span>Tổng: <strong>{currency(selectedInvoice.total_amount)}</strong></span>
              <span>Đã trả: <strong>{currency(selectedInvoice.paid_amount || 0)}</strong></span>
              <span>Còn lại: <strong>{currency((selectedInvoice.total_amount || 0) - (selectedInvoice.paid_amount || 0))}</strong></span>
            </div>
          )}
          <Field label="Số tiền thu (VNĐ)"><input type="number" value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} /></Field>
          <Field label="Phương thức">
            <select value={payForm.payment_method} onChange={(e) => setPayForm((p) => ({ ...p, payment_method: e.target.value }))}>
              <option value="cash">Tiền mặt</option>
              <option value="card">Thẻ ngân hàng</option>
              <option value="transfer">Chuyển khoản</option>
            </select>
          </Field>
          {payForm.payment_method === "transfer" && (
            <Field label="Mã giao dịch CK"><input value={payForm.transaction_ref} onChange={(e) => setPayForm((p) => ({ ...p, transaction_ref: e.target.value }))} /></Field>
          )}
          {error && <Alert type="error">{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}
          <button className="pharm-btn primary fill" onClick={handlePay} disabled={saving || !payForm.invoice_id || !payForm.amount}>{saving ? "Đang xử lý..." : "Xác nhận thu tiền"}</button>
        </div>
      </Panel>

      <div className="form-stack">
        {/* Xác nhận chuyển khoản */}
        {pendingTransfer.length > 0 && (
          <Panel title="Chờ xác nhận chuyển khoản">
            <div className="list-stack">
              {pendingTransfer.map((inv) => (
                <div key={inv.id} className="list-row">
                  <div><strong>{inv.invoice_number}</strong><p>{inv.patient_name} — {currency(inv.total_amount)}</p></div>
                  <button className="pharm-btn secondary sm" onClick={() => handleConfirmTransfer(inv.id)}>Xác nhận</button>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Hoàn tiền */}
        <Panel title="Hoàn tiền">
          <div className="form-stack">
            <Field label="Chọn hóa đơn">
              <select value={refundForm.invoice_id} onChange={(e) => setRefundForm((p) => ({ ...p, invoice_id: e.target.value }))}>
                <option value="">Chọn hóa đơn đã thanh toán</option>
                {invoices.filter((inv) => ["paid", "issued"].includes(inv.invoice_status)).map((inv) => <option key={inv.id} value={inv.id}>{inv.invoice_number} — {inv.patient_name}</option>)}
              </select>
            </Field>
            <Field label="Số tiền hoàn (VNĐ)"><input type="number" value={refundForm.amount} onChange={(e) => setRefundForm((p) => ({ ...p, amount: e.target.value }))} /></Field>
            <Field label="Lý do hoàn tiền"><input value={refundForm.reason} onChange={(e) => setRefundForm((p) => ({ ...p, reason: e.target.value }))} /></Field>
            <button className="pharm-btn danger fill" onClick={handleRefund} disabled={saving}>{saving ? "Đang xử lý..." : "Hoàn tiền"}</button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ROOT EXPORT
   ═══════════════════════════════════════════════════════ */
export function PharmacistPortal({ loading, data, reload, activeTab }) {
  const medicines = data["/api/v1/medicines"] || [];
  const prescriptions = data["/api/v1/prescriptions"] || [];
  const invoices = data["/api/v1/invoices"] || [];
  const suppliers = data["/api/v1/suppliers"] || [];
  const completedAppts = data["/api/v1/appointments/completed-no-invoice"] || [];

  return (
    <div className="dashboard-sections">
      {activeTab === "tongquan" && <TabTongQuan loading={loading} prescriptions={prescriptions} reload={reload} />}
      {activeTab === "khothuoc" && <TabKhoThuoc loading={loading} medicines={medicines} suppliers={suppliers} reload={reload} />}
      {activeTab === "nhacungcap" && <TabNhaCungCap loading={loading} suppliers={suppliers} reload={reload} />}
      {activeTab === "hoadon" && <TabHoaDon loading={loading} invoices={invoices} completedAppts={completedAppts} reload={reload} />}
      {activeTab === "thanhtoan" && <TabThanhToan loading={loading} invoices={invoices} reload={reload} />}
    </div>
  );
}
