import { useState } from "react";
import { api } from "../../api/http";
import { EmptyState, Field, Panel } from "../../components/shared/UI";
import { currency, INVOICE_STATUS_LABELS, PRESCRIPTION_STATUS_LABELS } from "../../utils/helpers";

export function PharmacistPortal({ loading, data, reload, activeTab }) {
  const medicines = data["/api/v1/medicines"] || [];
  const prescriptions = data["/api/v1/prescriptions"] || [];
  const invoices = data["/api/v1/invoices"] || [];
  const suppliers = data["/api/v1/suppliers"] || [];
  const [supplierForm, setSupplierForm] = useState({ name: "", contact_name: "", phone: "" });
  const [payment, setPayment] = useState({ invoice_id: "", amount: "", payment_method: "cash" });

  const createSupplier = async () => {
    await api.post("/api/v1/suppliers", supplierForm);
    setSupplierForm({ name: "", contact_name: "", phone: "" });
    await reload();
  };

  const prepare = async (id) => {
    await api.patch(`/api/v1/prescriptions/${id}/prepare`);
    await reload();
  };

  const dispense = async (id) => {
    await api.patch(`/api/v1/prescriptions/${id}/dispense`);
    await reload();
  };

  const payInvoice = async () => {
    await api.patch(`/api/v1/invoices/${payment.invoice_id}/pay`, {
      amount: Number(payment.amount),
      payment_method: payment.payment_method,
    });
    setPayment({ invoice_id: "", amount: "", payment_method: "cash" });
    await reload();
  };

  return (
    <div className="dashboard-sections">
      {activeTab === "tongquan" && (
        <Panel title="Đơn thuốc cần cấp">
          {loading ? (
            <p>Đang tải...</p>
          ) : prescriptions.length === 0 ? (
            <EmptyState text="Chưa có đơn thuốc nào." />
          ) : (
            <div className="list-stack">
              {prescriptions.map((prescription) => (
                <div className="list-row" key={prescription.id}>
                  <div>
                    <strong>Đơn #{prescription.id}</strong>
                    <p>{PRESCRIPTION_STATUS_LABELS[prescription.status]}</p>
                  </div>
                  <div className="row-actions">
                    {prescription.status === "pending" ? <button className="secondary-link button-link" onClick={() => prepare(prescription.id)}>Chuẩn bị</button> : null}
                    {["prepared", "awaiting_payment"].includes(prescription.status) ? (
                      <button className="primary-button small" onClick={() => dispense(prescription.id)}>
                        Giao thuốc
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {activeTab === "hoadon" && (
        <Panel title="Thanh toán hóa đơn">
          <div className="form-stack">
            <Field label="Hóa đơn">
              <select value={payment.invoice_id} onChange={(e) => setPayment((p) => ({ ...p, invoice_id: e.target.value }))}>
                <option value="">Chọn hóa đơn</option>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - {INVOICE_STATUS_LABELS[invoice.invoice_status]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Số tiền">
              <input type="number" value={payment.amount} onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))} />
            </Field>
            <Field label="Phương thức">
              <select value={payment.payment_method} onChange={(e) => setPayment((p) => ({ ...p, payment_method: e.target.value }))}>
                <option value="cash">Tiền mặt</option>
                <option value="card">Thẻ</option>
                <option value="transfer">Chuyển khoản</option>
              </select>
            </Field>
            <button className="primary-button" onClick={payInvoice}>
              Thu tiền
            </button>
          </div>
        </Panel>
      )}

      {activeTab === "khothuoc" && (
        <div className="dashboard-sections two-columns">
          <Panel title="Kho thuốc">
            <div className="list-stack">
              {medicines.map((medicine) => (
                <div key={medicine.id} className="list-row">
                  <div>
                    <strong>{medicine.name}</strong>
                    <p>{medicine.category || "Thuốc da liễu"}</p>
                  </div>
                  <span>{medicine.current_stock} {medicine.unit}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Nhà cung cấp">
            <div className="form-stack">
              <Field label="Tên nhà cung cấp">
                <input value={supplierForm.name} onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))} />
              </Field>
              <Field label="Người liên hệ">
                <input value={supplierForm.contact_name} onChange={(e) => setSupplierForm((p) => ({ ...p, contact_name: e.target.value }))} />
              </Field>
              <Field label="Số điện thoại">
                <input value={supplierForm.phone} onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))} />
              </Field>
              <button className="secondary-link button-link" onClick={createSupplier}>
                Thêm nhà cung cấp
              </button>
              <div className="list-stack compact-list">
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className="list-row">
                    <div>
                      <strong>{supplier.name}</strong>
                      <p>{supplier.contact_name || "Chưa có người liên hệ"}</p>
                    </div>
                    <span>{supplier.phone || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
