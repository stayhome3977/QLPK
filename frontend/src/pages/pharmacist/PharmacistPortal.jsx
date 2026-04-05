import { useState } from "react";
import { api, downloadAuthenticatedFile } from "../../api/http";
import { Alert, EmptyState, Field, Panel } from "../../components/shared/UI";
import { currency, fmtDateTime, PAYMENT_STATUS_LABELS, PRESCRIPTION_STATUS_LABELS, debounce } from "../../utils/helpers";

async function getErrorMessage(error, fallback) {
  const detail = error.response?.data;

  if (detail instanceof Blob) {
    try {
      const text = await detail.text();
      const parsed = JSON.parse(text);
      if (typeof parsed?.detail === "string" && parsed.detail.trim()) {
        return parsed.detail;
      }
      if (text.trim()) {
        return text;
      }
    } catch {
      // Fall through to the default message when the blob body is unreadable.
    }
  }

  if (typeof detail?.detail === "string" && detail.detail.trim()) {
    return detail.detail;
  }

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return fallback;
}

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
                    {/* Chỉ hiển thị thông tin, không có nút thao tác */}
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
const defaultBatch = { import_quantity: 0, supplier_id: "", notes: "" };

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
      const payload = {
        import_quantity: Number(batchForm.import_quantity),
        supplier_id: batchForm.supplier_id ? Number(batchForm.supplier_id) : null,
        notes: batchForm.notes || null
      };
      await api.post(`/api/v1/medicines/${showBatch.id}/batches/import`, payload);
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
            <Field label="Nhà cung cấp *">
              <select value={batchForm.supplier_id} onChange={(e) => setBatchForm((p) => ({ ...p, supplier_id: e.target.value }))}>
                <option value="">-- Chọn nhà cung cấp --</option>
                {suppliers.filter(s => s.is_active !== false).map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Số lượng nhập thêm *">
            <input type="number" value={batchForm.import_quantity} onChange={(e) => setBatchForm((p) => ({ ...p, import_quantity: e.target.value }))} />
          </Field>
          <Field label="Ghi chú">
            <textarea value={batchForm.notes} onChange={(e) => setBatchForm((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Nhập ghi chú cho lô hàng này..." />
          </Field>
          {error && <Alert type="error">{error}</Alert>}
          <div className="pharm-modal-actions">
            <button className="pharm-btn ghost" onClick={() => setShowBatch(null)}>Hủy</button>
            <button className="pharm-btn primary" onClick={importBatch} disabled={saving || !batchForm.supplier_id || !batchForm.import_quantity}>
              {saving ? "Đang nhập..." : "Xác nhận nhập lô"}
            </button>
          </div>
        </ModalForm>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB: Nhà cung cấp — CRUD
   ═══════════════════════════════════════════════════════ */
const defaultSupplier = { name: "", contact_name: "", phone: "", email: "", address: "", notes: "" };

function TabNhaCungCap({ loading, suppliers, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(defaultSupplier);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openAdd = () => { setForm(defaultSupplier); setEditItem(null); setError(""); setShowForm(true); };
  const openEdit = (s) => { setEditItem(s); setForm({ name: s.name, contact_name: s.contact_name || "", phone: s.phone || "", email: s.email || "", address: s.address || "", notes: s.notes || "" }); setError(""); setShowForm(true); };

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
                <tr><th>Tên công ty</th><th>Người liên hệ</th><th>SĐT</th><th>Email</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                {activeSuppliers.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.contact_name || "—"}</td>
                    <td>{s.phone || "—"}</td>
                    <td>{s.email || "—"}</td>
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

const PAYMENT_METHOD_LABELS = {
  cash: "Tiền mặt",
  card: "Thẻ",
  transfer: "Chuyển khoản",
  qr: "Mã QR",
  insurance_support: "Hỗ trợ nội bộ",
  other: "Khác",
};

const TRANSACTION_STATUS_LABELS = {
  pending: "Chờ xác nhận",
  success: "Thành công",
  failed: "Thất bại",
  cancelled: "Đã hủy",
};

async function downloadInvoicePdf(invoiceId) {
  await downloadAuthenticatedFile(`/api/v1/invoices/${invoiceId}/pdf`, `hoa-don-${invoiceId}.pdf`);
}

function InvoiceDetailModal({ invoice, onClose, onPrint }) {
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const transactions = Array.isArray(invoice?.transactions) ? invoice.transactions : [];

  return (
    <ModalForm title={`Chi tiết ${invoice.invoice_number}`} onClose={onClose}>
      <div className="invoice-detail-block">
        <div className="invoice-detail-row">
          <span>Bệnh nhân</span>
          <strong>{invoice.patient_name || "—"}</strong>
        </div>
        <div className="invoice-detail-row">
          <span>Mã bệnh nhân</span>
          <strong>{invoice.patient_code || "—"}</strong>
        </div>
        <div className="invoice-detail-row">
          <span>Thời gian thanh toán</span>
          <strong>{fmtDateTime(invoice.paid_at || invoice.created_at)}</strong>
        </div>
        {invoice.subtotal_amount && (
          <>
            <div className="invoice-detail-row">
              <span>Tạm tính</span>
              <strong>{currency(invoice.subtotal_amount)}</strong>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="invoice-detail-row" style={{ color: "var(--error-1)" }}>
                <span>Giảm giá</span>
                <strong>-{currency(invoice.discount_amount)}</strong>
              </div>
            )}
            {invoice.insurance_support_amount > 0 && (
              <div className="invoice-detail-row" style={{ color: "var(--success-1)" }}>
                <span>Bảo hiểm hỗ trợ</span>
                <strong>-{currency(invoice.insurance_support_amount)}</strong>
              </div>
            )}
          </>
        )}
        <div className="invoice-detail-row" style={{ fontWeight: "bold", borderTop: "1px solid #ddd", paddingTop: "8px", marginTop: "4px" }}>
          <span>Tổng thanh toán</span>
          <strong>{currency(invoice.total_amount)}</strong>
        </div>
      </div>

      <div className="pharm-detail-section">
        <h4>Chi tiết phiếu từ `chi_tiet_hoa_don`</h4>
        {items.length === 0 ? (
          <EmptyState text="Phiếu này chưa có chi tiết hóa đơn." />
        ) : (
          <div className="pharm-table-wrap">
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Nội dung</th>
                  <th>SL</th>
                  <th>Đơn giá</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{currency(item.unit_price)}</td>
                    <td>{currency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pharm-detail-section">
        <h4>Giao dịch thanh toán</h4>
        {transactions.length === 0 ? (
          <p className="text-muted">Chưa có giao dịch thanh toán nào.</p>
        ) : (
          <div className="pharm-table-wrap">
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Phương thức</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{PAYMENT_METHOD_LABELS[tx.payment_method] || tx.payment_method}</td>
                    <td>{currency(tx.amount)}</td>
                    <td>{TRANSACTION_STATUS_LABELS[tx.status] || tx.status}</td>
                    <td>{fmtDateTime(tx.paid_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pharm-modal-actions">
        <button type="button" className="pharm-btn ghost" onClick={onClose}>
          Đóng
        </button>
        <button type="button" className="pharm-btn primary" onClick={onPrint}>
          In PDF
        </button>
      </div>
    </ModalForm>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB: Hóa đơn & thanh toán nhanh
   ═══════════════════════════════════════════════════════ */
function buildPaymentLines(ticket) {
  if (!ticket) return [];
  const lines = [];
  if (Number(ticket.exam_fee || 0) > 0) {
    lines.push({
      key: "exam-fee",
      group: "Phí khám",
      description: "Phí khám bác sĩ",
      quantity: 1,
      unitPrice: Number(ticket.exam_fee || 0),
      lineTotal: Number(ticket.exam_fee || 0),
    });
  }
  (ticket.services || []).forEach((service) => {
    lines.push({
      key: `service-${service.id || service.service_id}`,
      group: "Dịch vụ",
      description: service.name,
      quantity: Number(service.quantity || 1),
      unitPrice: Number(service.unit_price || 0),
      lineTotal: Number(service.line_total || 0),
    });
  });
  (ticket.medicines || []).forEach((medicine) => {
    lines.push({
      key: `medicine-${medicine.id || medicine.medicine_id}`,
      group: "Thuốc",
      description: medicine.medicine_name || `Thuốc #${medicine.medicine_id}`,
      quantity: Number(medicine.billed_quantity || medicine.quantity || 0),
      unitPrice: Number(medicine.unit_price || 0),
      lineTotal: Number(medicine.line_total || 0),
    });
  });
  return lines;
}

function TabHoaDon({ loading, requests, invoices, reload }) {
  const [activeRequest, setActiveRequest] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmingTarget, setConfirmingTarget] = useState(null);
  const processingRequests = new Set(); // Track ongoing requests
  const invoiceMap = new Map((invoices || []).map((invoice) => [String(invoice.id), invoice]));

  const payableRequests = (requests || []).filter(
    (ticket) =>
      ticket.status !== "cancelled" &&
      !["paid", "credit_approved"].includes(ticket.invoice_payment_status || "") &&
      !(ticket.invoice_id && !ticket.invoice_payment_status)
  );

  const openCheckoutModal = (ticket) => {
    console.log('Opening invoice modal for:', ticket.request_number);
    console.log('Services total:', ticket.services_total, 'Medicines total:', ticket.medicines_total, 'Exam fee:', ticket.exam_fee);
    setActiveRequest(ticket);
    setPaymentMethod("cash");
    setError("");
  };

  const computedLines = buildPaymentLines(activeRequest);
  const computedTotal = computedLines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);

  const downloadInvoicePdfOnly = async () => {
    if (!activeRequest) return;
    setSaving(true);
    setError("");
    try {
      // Check if there's already an existing invoice for this request
      const existingInvoice = invoiceMap.get(String(activeRequest.invoice_id));
      
      if (existingInvoice) {
        // Download PDF of existing invoice
        await downloadInvoicePdf(existingInvoice.id);
      } else {
        setError("Không tìm thấy hóa đơn để tải. Vui lòng tạo hóa đơn trước.");
      }
    } catch (e) {
      setError(await getErrorMessage(e, "Không thể tải PDF hóa đơn"));
    } finally {
      setSaving(false);
    }
  };

  const createInvoice = async () => {
    if (!activeRequest) return;
    setSaving(true);
    setError("");
    try {
      console.log('FRONTEND DEBUG: Creating invoice for appointment:', activeRequest.appointment_id);
      console.log('FRONTEND DEBUG: Selected payment method:', paymentMethod);
      
      let invoiceId;
      
      if (activeRequest.invoice_id && invoiceMap.get(String(activeRequest.invoice_id))) {
        // Invoice already exists, just process payment
        invoiceId = activeRequest.invoice_id;
        console.log('FRONTEND DEBUG: Using existing invoice:', invoiceId);
      } else {
        // Create new invoice - let backend automatically calculate discount from appointment
        const response = await api.post(`/api/v1/invoices/generate/${activeRequest.appointment_id}`, {
          // Don't send discount_amount to let backend calculate it from appointment.discount_percent
          insurance_support_amount: 0,
          notes: `Tự động tạo từ phiếu PGDS-${activeRequest.id}`
        });
        
        invoiceId = response.data.id;
        console.log('FRONTEND DEBUG: New invoice created:', invoiceId);
        
        // Validate that the response contains a valid invoice ID
        if (!invoiceId) {
          console.error('FRONTEND DEBUG: Invoice creation response:', response.data);
          throw new Error("Phản hồi từ server không chứa ID hóa đơn. Vui lòng thử lại.");
        }
      }
      
      // Validate that we have a valid invoice ID before proceeding
      if (!invoiceId) {
        throw new Error("Không thể lấy ID hóa đơn. Vui lòng thử lại.");
      }
      
      // Process payment with selected method
      const totalAmount = (activeRequest.services_total || 0) + (activeRequest.medicines_total || 0) + (activeRequest.exam_fee || 0);
      
      console.log('FRONTEND DEBUG: Processing payment - Invoice ID:', invoiceId, 'Amount:', totalAmount, 'Method:', paymentMethod);
      
      await api.patch(`/api/v1/invoices/${invoiceId}/pay`, {
        payment_method: paymentMethod,
        amount: totalAmount,
        transaction_ref: paymentMethod === 'qr' ? 'Thanh toán mã QR' : `Thanh toán ${paymentMethod}`
      });
      
      console.log('FRONTEND DEBUG: Payment processed successfully');
      
      // Reload data to get the updated invoice
      await reload();
      
      // Show success message
      setError("");
      alert(activeRequest.invoice_id ? "Cập nhật thanh toán thành công! Bạn có thể tải PDF ngay bây giờ." : "Tạo hóa đơn thành công! Bạn có thể tải PDF ngay bây giờ.");
    } catch (e) {
      console.error('FRONTEND DEBUG: Full error object:', e);
      console.error('FRONTEND DEBUG: Error response:', e.response?.data);
      console.error('FRONTEND DEBUG: Error status:', e.response?.status);
      setError(await getErrorMessage(e, "Không thể tạo hóa đơn"));
    } finally {
      setSaving(false);
    }
  };

  const confirmRequestPaid = async (ticket) => {
    const targetKey = `request-${ticket.id}`;
    
    // Prevent multiple simultaneous calls with multiple layers of protection
    if (confirmingTarget === targetKey || processingRequests.has(ticket.id)) {
      console.log('Request already being processed, ignoring duplicate click');
      return;
    }
    
    console.log('Starting confirmRequestPaid for:', targetKey);
    setConfirmingTarget(targetKey);
    processingRequests.add(ticket.id);
    
    try {
      console.log('Making API call...');
      await api.patch(`/api/v1/pharmacy-requests/${ticket.id}/confirm-paid`);
      console.log('API call successful');
      
      // Show success message without auto-downloading PDF
      alert('Xác nhận thanh toán thành công!');
      
      // Reload data to update UI
      console.log('Reloading data...');
      await reload();
      console.log('Reload completed');
    } catch (e) {
      console.error('Error in confirmRequestPaid:', e);
      // eslint-disable-next-line no-alert
      alert(await getErrorMessage(e, "Không thể xác nhận đã thanh toán"));
    } finally {
      console.log('Clearing confirmingTarget and processingRequests');
      setConfirmingTarget(null);
      processingRequests.delete(ticket.id);
    }
  };

  // Create debounced version to prevent double-clicking
  const debouncedConfirmRequestPaid = debounce(confirmRequestPaid, 1000);

  return (
    <>
      <Panel title="Danh sách phiếu bác sĩ gửi dược sĩ cần thanh toán">
        <div className="pharm-toolbar">
          <span className="pharm-count">{payableRequests.length} phiếu</span>
          <span className="pharm-count">Mỗi phiếu đã gồm phí khám, dịch vụ đăng ký và thuốc của bệnh nhân.</span>
        </div>
        {loading ? (
          <p>Đang tải...</p>
        ) : payableRequests.length === 0 ? (
          <EmptyState text="Chưa có phiếu bác sĩ gửi dược sĩ cần thanh toán." />
        ) : (
          <div className="pharm-table-wrap">
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Bệnh nhân</th>
                  <th>Nội dung</th>
                  <th>Hóa đơn</th>
                  <th>Tổng tiền</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {payableRequests.map((ticket) => {
                  const linkedInvoice = ticket.invoice_id ? invoiceMap.get(String(ticket.invoice_id)) : null;
                  return (
                    <tr key={ticket.id}>
                      <td>
                        <strong>{ticket.request_number || `#${ticket.id}`}</strong>
                      </td>
                      <td>
                        <strong>{ticket.patient_name || `BN #${ticket.patient_id}`}</strong>
                        <div className="text-muted" style={{ marginTop: "4px" }}>
                          {ticket.doctor_name || "—"}
                        </div>
                      </td>
                      <td>
                        <div>{ticket.services?.length || 0} dịch vụ</div>
                        <div className="text-muted" style={{ marginTop: "4px" }}>
                          {ticket.medicines?.length || 0} thuốc
                        </div>
                      </td>
                      <td>
                        <strong>{linkedInvoice?.invoice_number || "Chưa tạo"}</strong>
                        {linkedInvoice ? (
                          <div className="text-muted" style={{ marginTop: "4px" }}>
                            {PAYMENT_STATUS_LABELS[linkedInvoice.payment_status] || linkedInvoice.payment_status}
                          </div>
                        ) : null}
                      </td>
                      <td>{currency(ticket.total_amount)}</td>
                      <td className="row-actions">
                        <button type="button" className="pharm-btn primary sm" onClick={() => openCheckoutModal(ticket)} disabled={saving}>
                          {linkedInvoice ? "Cập nhật hóa đơn" : "Tạo hóa đơn"}
                        </button>
                        {linkedInvoice ? (
                          <button type="button" className="pharm-btn info sm" onClick={() => void downloadInvoicePdf(linkedInvoice.id)}>
                            Tải PDF
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="pharm-btn secondary sm"
                          onClick={() => debouncedConfirmRequestPaid(ticket)}
                          disabled={confirmingTarget === `request-${ticket.id}` || processingRequests.has(ticket.id)}
                        >
                          {confirmingTarget === `request-${ticket.id}` || processingRequests.has(ticket.id) ? "Đang xác nhận..." : "Xác nhận đã thanh toán"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {activeRequest && (
        <ModalForm title={`${activeRequest.request_number || `Phiếu #${activeRequest.id}`} — Mẫu hóa đơn`} onClose={() => { setActiveRequest(null); }}>
          <div className="invoice-detail-block">
            <div className="invoice-detail-row">
              <span>Bệnh nhân</span>
              <strong>{activeRequest.patient_name || `BN #${activeRequest.patient_id}`}</strong>
            </div>
            <div className="invoice-detail-row">
              <span>Bác sĩ</span>
              <strong>{activeRequest.doctor_name || "—"}</strong>
            </div>
            <div className="invoice-detail-row">
              <span>Tổng tiền dự kiến</span>
              <strong>{currency(computedTotal)}</strong>
            </div>
          </div>

          <div className="pharm-detail-section">
            <h4>Mẫu chi tiết hóa đơn</h4>
            {computedLines.length > 0 ? (
              <div className="pharm-table-wrap">
                <table className="pharm-table">
                  <thead>
                    <tr><th>Nhóm</th><th>Nội dung</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>
                  </thead>
                  <tbody>
                    {computedLines.map((line) => (
                      <tr key={line.key}>
                        <td>{line.group}</td>
                        <td>{line.description}</td>
                        <td>{line.quantity}</td>
                        <td>{currency(line.unitPrice)}</td>
                        <td>{currency(line.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState text="Phiếu này chưa có nội dung để lập hóa đơn." />
            )}
          </div>

          <div className="pharm-form-grid" style={{ marginTop: "8px" }}>
            <Field label="Phương thức thanh toán">
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Tiền mặt</option>
                <option value="qr">Mã QR</option>
              </select>
            </Field>
          </div>

          <div className="invoice-detail-block" style={{ marginTop: "8px" }}>
            <div className="invoice-detail-row">
              <span>Phí khám</span>
              <strong>{currency(activeRequest.exam_fee || 0)}</strong>
            </div>
            <div className="invoice-detail-row">
              <span>Tổng dịch vụ</span>
              <strong>{currency(activeRequest.services_total || 0)}</strong>
            </div>
            <div className="invoice-detail-row">
              <span>Tổng thuốc</span>
              <strong>{currency(activeRequest.medicines_total || 0)}</strong>
            </div>
            <div className="invoice-detail-row" style={{ borderTop: "1px solid #ddd", paddingTop: "8px", marginTop: "4px", fontWeight: "bold" }}>
              <span>TỔNG CỘNG</span>
              <strong>{currency((activeRequest.services_total || 0) + (activeRequest.medicines_total || 0) + (activeRequest.exam_fee || 0))}</strong>
            </div>
          </div>

          {error && <Alert type="error">{error}</Alert>}
          <div className="pharm-modal-actions">
            <button type="button" className="pharm-btn ghost" onClick={() => { setActiveRequest(null); }}>
              Đóng
            </button>
            {activeRequest.invoice_id && invoiceMap.get(String(activeRequest.invoice_id)) ? (
              <>
                <button type="button" className="pharm-btn info" onClick={createInvoice} disabled={saving}>
                  {saving ? "Đang cập nhật..." : "Cập nhật thanh toán"}
                </button>
                <button type="button" className="pharm-btn primary" onClick={downloadInvoicePdfOnly} disabled={saving}>
                  {saving ? "Đang tải..." : "Tải PDF"}
                </button>
              </>
            ) : (
              <button type="button" className="pharm-btn primary" onClick={createInvoice} disabled={saving}>
                {saving ? "Đang tạo..." : "Tạo hóa đơn"}
              </button>
            )}
          </div>
        </ModalForm>
      )}
    </>
  );
}
/* ═══════════════════════════════════════════════════════
   TAB: Lịch sử thanh toán — hóa đơn đã thanh toán
   ═══════════════════════════════════════════════════════ */
function TabLichSuThanhToan({ loading, invoices, reload }) {
  const [query, setQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const paidRows = [...(invoices || [])]
    .filter((inv) => ["paid", "credit_approved"].includes(inv.payment_status) && Array.isArray(inv.items) && inv.items.length > 0)
    .sort((a, b) => new Date(b.paid_at || b.created_at || 0) - new Date(a.paid_at || a.created_at || 0));

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = paidRows.filter((inv) => {
    if (!normalizedQuery) return true;
    const searchValue = [
      inv.invoice_number,
      inv.patient_name,
      inv.patient_code,
      inv.patient_phone,
      ...(inv.items || []).map((item) => item.description),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchValue.includes(normalizedQuery);
  });

  const remove = async (id) => {
    if (!confirm("Xóa hóa đơn này khỏi lịch sử thanh toán? Thuốc trong phiếu sẽ được cộng lại vào kho.")) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/v1/invoices/${id}`);
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
      await reload();
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(await getErrorMessage(e, "Không thể xóa hóa đơn"));
    } finally {
      setDeletingId(null);
    }
  };

  const printInvoice = async (invoiceId) => {
    try {
      await downloadInvoicePdf(invoiceId);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(await getErrorMessage(e, "Không thể tải PDF hóa đơn"));
    }
  };

  return (
    <>
      <Panel title="Lịch sử thanh toán">
        <div className="pharm-toolbar">
          <span className="pharm-count">{filteredRows.length} phiếu đã thanh toán</span>
          <input
            className="pharm-search-input"
            placeholder="Tìm theo mã phiếu, bệnh nhân, số điện thoại..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {loading ? (
          <p>Đang tải...</p>
        ) : filteredRows.length === 0 ? (
          <EmptyState text="Chưa có phiếu thanh toán phù hợp." />
        ) : (
          <div className="pharm-table-wrap">
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Bệnh nhân</th>
                  <th>Thanh toán lúc</th>
                  <th>Tổng tiền</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <strong>{inv.invoice_number}</strong>
                    </td>
                    <td>{inv.patient_name || (inv.patient_id ? `BN #${inv.patient_id}` : "—")}</td>
                    <td>{fmtDateTime(inv.paid_at || inv.created_at)}</td>
                    <td>{currency(inv.total_amount)}</td>
                    <td className="row-actions">
                      <button type="button" className="pharm-btn secondary sm" onClick={() => setSelectedInvoice(inv)}>
                        Xem chi tiết
                      </button>
                      <button type="button" className="pharm-btn info sm" onClick={() => void printInvoice(inv.id)}>
                        In PDF
                      </button>
                      <button type="button" className="pharm-btn danger sm" onClick={() => void remove(inv.id)} disabled={deletingId === inv.id}>
                        {deletingId === inv.id ? "Đang xóa..." : "Xóa"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {selectedInvoice ? (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPrint={() => void printInvoice(selectedInvoice.id)}
        />
      ) : null}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB: Lịch sử xuất nhập — nhật ký kho
   ═══════════════════════════════════════════════════════ */
function TabLichSuXuatNhap({ loading, inventoryLogs, medicines, reload }) {
  const [query, setQuery] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterMedicine, setFilterMedicine] = useState("");

  // Create a map of current medicine stocks
  const currentStockMap = new Map();
  medicines.forEach(med => {
    currentStockMap.set(med.id, med.current_stock);
  });

  const filteredRows = (inventoryLogs?.items || []).filter((log) => {
    const matchesQuery = !query || 
      log.medicine_name?.toLowerCase().includes(query.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(query.toLowerCase()) ||
      log.notes?.toLowerCase().includes(query.toLowerCase());
    
    const matchesAction = !filterAction || log.action === filterAction;
    const matchesMedicine = !filterMedicine || log.medicine_id.toString() === filterMedicine;
    
    return matchesQuery && matchesAction && matchesMedicine;
  });

  const ACTION_LABELS = {
    import: "Nhập kho",
    export: "Xuất kho", 
    adjust: "Điều chỉnh",
    expired: "Hết hạn",
    import_return: "Trả hàng nhập"
  };

  return (
    <>
      <Panel title="Lịch sử xuất nhập kho">
        <div className="pharm-toolbar">
          <span className="pharm-count">{filteredRows.length} bản ghi</span>
          <div className="pharm-filters">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pharm-search"
            />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="pharm-filter"
            >
              <option value="">Tất cả hành động</option>
              <option value="import">Nhập kho</option>
              <option value="export">Xuất kho</option>
              <option value="adjust">Điều chỉnh</option>
              <option value="expired">Hết hạn</option>
              <option value="import_return">Trả hàng nhập</option>
            </select>
            <select
              value={filterMedicine}
              onChange={(e) => setFilterMedicine(e.target.value)}
              className="pharm-filter"
            >
              <option value="">Tất cả thuốc</option>
              {medicines.map((med) => (
                <option key={med.id} value={med.id}>
                  {med.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {loading ? (
          <p>Đang tải...</p>
        ) : filteredRows.length === 0 ? (
          <EmptyState text="Không có bản ghi nào phù hợp với bộ lọc." />
        ) : (
          <div className="pharm-table-wrap">
            <table className="pharm-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Thuốc</th>
                  <th>Hành động</th>
                  <th>Số lượng thay đổi</th>
                  <th>Tồn kho hiện tại → Sau thay đổi</th>
                  <th>Người thực hiện</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((log) => {
                  const currentStock = currentStockMap.get(log.medicine_id) || 0;
                  const projectedStock = currentStock + log.quantity_change;
                  return (
                    <tr key={log.id}>
                      <td>{fmtDateTime(log.created_at)}</td>
                      <td>
                        <strong>{log.medicine_name || "N/A"}</strong>
                        {log.batch_id && <small className="text-muted"> (Lô #{log.batch_id})</small>}
                      </td>
                      <td>
                        <span className={`badge badge-${log.action}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className={log.quantity_change > 0 ? "text-success" : "text-danger"}>
                        {log.quantity_change > 0 ? "+" : ""}{log.quantity_change}
                      </td>
                      <td>
                        <span className={currentStock <= 10 ? "badge badge-warn" : ""}>{currentStock}</span> → 
                        <span className={projectedStock <= 10 ? "badge badge-warn" : ""}>{projectedStock}</span>
                      </td>
                      <td>{log.user_name || "N/A"}</td>
                      <td>{log.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
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
  const pharmacyRequests = data["/api/v1/pharmacy-requests"] || [];
  const inventoryLogs = data["/api/v1/inventory-logs"] || { items: [] };

  return (
    <div className="dashboard-sections">
      {activeTab === "donthuoccancap" && <TabTongQuan loading={loading} prescriptions={prescriptions} reload={reload} />}
      {["khohang", "tonkho", "nhapkho"].includes(activeTab) && <TabKhoThuoc loading={loading} medicines={medicines} suppliers={suppliers} reload={reload} />}
      {activeTab === "nhacungcap" && <TabNhaCungCap loading={loading} suppliers={suppliers} reload={reload} />}
      {activeTab === "giaothuocthanhtoan" && <TabHoaDon loading={loading} requests={pharmacyRequests} invoices={invoices} reload={reload} />}
      {activeTab === "lichsuthanhtoan" && <TabLichSuThanhToan loading={loading} invoices={invoices} reload={reload} />}
      {activeTab === "lichsuxuatnhap" && <TabLichSuXuatNhap loading={loading} inventoryLogs={inventoryLogs} medicines={medicines} reload={reload} />}
    </div>
  );
}
