import { useState } from "react";
import { api } from "../../api/http";
import { Alert, EmptyState, Field, Panel } from "../../components/shared/UI";
import { currency, PRESCRIPTION_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "../../utils/helpers";

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
   TAB: Hóa đơn & thanh toán nhanh
   ═══════════════════════════════════════════════════════ */
function TabHoaDon({ loading, prescriptions, medicines, invoices, reload }) {
  const [activeRx, setActiveRx] = useState(null);
  const [rxDetails, setRxDetails] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmingInvoiceId, setConfirmingInvoiceId] = useState(null);

  const openPdf = (invoiceId) => {
    window.open(`${API_BASE}/api/v1/invoices/${invoiceId}/pdf`, "_blank");
  };

  const payablePrescriptions = (prescriptions || []).filter((rx) => ["pending", "prepared", "awaiting_payment"].includes(rx.status));

  const waitingInvoices = (invoices || []).filter((inv) =>
    ["unpaid", "awaiting_confirmation", "partial"].includes(inv.payment_status)
  );

  const openCheckoutModal = async (rx) => {
    setActiveRx(rx);
    setRxDetails(null);
    setPaymentMethod("cash");
    setError("");
    try {
      const { data } = await api.get(`/api/v1/prescriptions/${rx.id}`);
      setRxDetails(data);
    } catch (e) {
      setError(e.response?.data?.detail || "Không thể tải chi tiết đơn thuốc");
    }
  };

  const computedLines = (rxDetails?.items || []).map((it) => {
    const med = medicines.find((m) => String(m.id) === String(it.medicine_id));
    const billedQty = it.reserved_quantity || it.quantity;
    const lineTotal = Number(it.unit_price || 0) * billedQty;
    return {
      medicineName: med?.name || `Thuốc #${it.medicine_id}`,
      quantity: billedQty,
      unitPrice: Number(it.unit_price || 0),
      lineTotal,
    };
  });

  const computedTotal = computedLines.reduce((sum, l) => sum + (l.lineTotal || 0), 0);

  const checkoutAndExport = async () => {
    if (!activeRx) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post(`/api/v1/prescriptions/${activeRx.id}/checkout`, { payment_method: paymentMethod });
      await reload();
      setActiveRx(null);
      setRxDetails(null);
      openPdf(data.invoice_id);
    } catch (e) {
      setError(e.response?.data?.detail || "Thanh toán thất bại");
    }
    setSaving(false);
  };

  const confirmInvoice = async (invoiceId) => {
    setConfirmingInvoiceId(invoiceId);
    try {
      await api.patch(`/api/v1/invoices/${invoiceId}/confirm-transfer`);
      await reload();
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.response?.data?.detail || "Không thể xác nhận thanh toán");
    } finally {
      setConfirmingInvoiceId(null);
    }
  };

  return (
    <>
      <Panel title="Danh sách phiếu đơn thuốc cần thanh toán">
        <div className="pharm-toolbar">
          <span className="pharm-count">{payablePrescriptions.length} phiếu</span>
        </div>
        {loading ? (
          <p>Đang tải...</p>
        ) : payablePrescriptions.length === 0 ? (
          <EmptyState text="Chưa có phiếu đơn thuốc cần thanh toán." />
        ) : (
          <div className="pharm-table-wrap">
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Bệnh nhân</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {payablePrescriptions.map((rx) => (
                  <tr key={rx.id}>
                    <td>
                      <strong>#{rx.id}</strong>
                    </td>
                    <td>{rx.patient_name || `BN #${rx.patient_id}`}</td>
                    <td>
                      <span className={`badge badge-${rx.status}`}>{PRESCRIPTION_STATUS_LABELS[rx.status] || rx.status}</span>
                    </td>
                    <td className="row-actions">
                      <button className="pharm-btn primary sm" onClick={() => openCheckoutModal(rx)} disabled={saving}>
                        Tạo hóa đơn
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Danh sách chờ thanh toán">
        {loading ? (
          <p>Đang tải...</p>
        ) : waitingInvoices.length === 0 ? (
          <EmptyState text="Chưa có hóa đơn nào đang chờ thanh toán." />
        ) : (
          <div className="pharm-table-wrap">
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Mã HĐ</th>
                  <th>Bệnh nhân</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {waitingInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <strong>{inv.invoice_number}</strong>
                    </td>
                    <td>{inv.patient_id ? `BN #${inv.patient_id}` : "—"}</td>
                    <td>{currency(inv.total_amount)}</td>
                    <td>
                      <span className={`badge badge-${inv.payment_status}`}>
                        {inv.payment_status === "awaiting_confirmation"
                          ? "Đang thanh toán"
                          : PAYMENT_STATUS_LABELS[inv.payment_status] || inv.payment_status}
                      </span>
                    </td>
                    <td className="row-actions">
                      <button
                        className="pharm-btn secondary sm"
                        onClick={() => openPdf(inv.id)}
                      >
                        PDF
                      </button>
                      {inv.payment_status !== "paid" && (
                        <button
                          className="pharm-btn primary sm"
                          onClick={() => confirmInvoice(inv.id)}
                          disabled={confirmingInvoiceId === inv.id}
                        >
                          {confirmingInvoiceId === inv.id ? "Đang xác nhận..." : "Xác nhận đã thanh toán"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {activeRx && (
        <ModalForm title={`Phiếu #${activeRx.id} — Thanh toán`} onClose={() => { setActiveRx(null); setRxDetails(null); }}>
          <div className="invoice-detail-block">
            <div className="invoice-detail-row">
              <span>Bệnh nhân</span>
              <strong>{activeRx.patient_name || `BN #${activeRx.patient_id}`}</strong>
            </div>
            <div className="invoice-detail-row">
              <span>Tổng tiền</span>
              <strong>{currency(computedTotal)}</strong>
            </div>
          </div>

          {!rxDetails ? (
            <p>Đang tải chi tiết...</p>
          ) : (
            <>
              {computedLines.length > 0 && (
                <>
                  <h4 style={{ marginTop: "16px" }}>Tổng mỗi thuốc</h4>
                  <table className="pharm-table">
                    <thead>
                      <tr><th>Thuốc</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>
                    </thead>
                    <tbody>
                      {computedLines.map((l, i) => (
                        <tr key={i}>
                          <td>{l.medicineName}</td>
                          <td>{l.quantity}</td>
                          <td>{currency(l.unitPrice)}</td>
                          <td>{currency(l.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              <div className="pharm-form-grid" style={{ marginTop: "16px" }}>
                <Field label="Phương thức">
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="cash">Tiền mặt</option>
                    <option value="transfer">Chuyển khoản (QR giả)</option>
                  </select>
                </Field>
              </div>

              {paymentMethod === "transfer" && (
                <div style={{ marginTop: "16px", textAlign: "center" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      flexDirection: "column",
                      alignItems: "center",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px dashed #999",
                      background: "#fafafa",
                    }}
                  >
                    <div
                      style={{
                        width: 140,
                        height: 140,
                        backgroundImage:
                          "repeating-linear-gradient(45deg, #000, #000 4px, #fff 4px, #fff 8px)",
                      }}
                    />
                    <small style={{ marginTop: 8 }}>Mã QR giả lập để thanh toán</small>
                  </div>
                </div>
              )}
            </>
          )}

          {error && <Alert type="error">{error}</Alert>}
          <div className="pharm-modal-actions">
            <button className="pharm-btn ghost" onClick={() => { setActiveRx(null); setRxDetails(null); }}>
              Đóng
            </button>
            <button className="pharm-btn primary" onClick={checkoutAndExport} disabled={saving || !rxDetails}>
              {saving ? "Đang xử lý..." : "Xuất hóa đơn ra PDF"}
            </button>
          </div>
        </ModalForm>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   ROOT EXPORT
   ═══════════════════════════════════════════════════════ */
export function PharmacistPortal({ loading, data, reload, activeTab }) {
  const medicines = data["/api/v1/medicines"] || [];
  const prescriptions = data["/api/v1/prescriptions"] || [];
  const suppliers = data["/api/v1/suppliers"] || [];
  const invoices = data["/api/v1/invoices"] || [];

  return (
    <div className="dashboard-sections">
      {activeTab === "donthuoccancap" && <TabTongQuan loading={loading} prescriptions={prescriptions} reload={reload} />}
      {["tonkho", "nhapkho"].includes(activeTab) && <TabKhoThuoc loading={loading} medicines={medicines} suppliers={suppliers} reload={reload} />}
      {activeTab === "nhacungcap" && <TabNhaCungCap loading={loading} suppliers={suppliers} reload={reload} />}
      {activeTab === "giaothuocthanhtoan" && <TabHoaDon loading={loading} prescriptions={prescriptions} medicines={medicines} invoices={invoices} reload={reload} />}
      {activeTab === "lichsuxuatnhap" && (
        <Panel title="Chức năng trống">
          <EmptyState text="Chức năng này đang được phát triển hoặc chưa có dữ liệu." />
        </Panel>
      )}
    </div>
  );
}
