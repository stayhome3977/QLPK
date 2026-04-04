import { useState } from "react";
import { api, downloadAuthenticatedFile } from "../../api/http";
import { Field, Panel, Alert } from "../../components/shared/UI";
import { currency, fmtDate, INVOICE_STATUS_LABELS } from "../../utils/helpers";

export function CashierPortal({ data, reload, runAction }) {
  const invoices = data.invoices || [];
  const [inv, setInv] = useState({ appointment_id: "", discount_amount: 0, insurance_support_amount: 0 });
  const [pay, setPay] = useState({ invoice_id: "", payment_method: "cash", amount: "" });

  const genInv = () => runAction(() => api.post(`/api/v1/invoices/generate/${inv.appointment_id}`, {
    discount_amount: Number(inv.discount_amount),
    insurance_support_amount: Number(inv.insurance_support_amount)
  }));

  const payInv = () => runAction(() => api.patch(`/api/v1/invoices/${pay.invoice_id}/pay`, {
    payment_method: pay.payment_method, amount: Number(pay.amount)
  }));

  const approveCredit = (id) => runAction(() => api.patch(`/api/v1/invoices/${id}/approve-credit`));
  const downloadInvoicePdf = (id) => runAction(() => downloadAuthenticatedFile(`/api/v1/invoices/${id}/pdf`, `hoa-don-${id}.pdf`));

  return (
    <>
      <Panel title="🧾 Danh Sách Hóa Đơn">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Mã HĐ</th><th>Bệnh nhân</th><th>Trạng thái</th><th>Tổng tiền</th><th>Đã trả</th><th>Cập nhật</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td><strong>{i.invoice_number}</strong></td>
                  <td>BN {i.patient_id}</td>
                  <td><span className="chip chip-blue">{INVOICE_STATUS_LABELS[i.invoice_status] || i.invoice_status}</span></td>
                  <td>{currency(i.total_amount)}</td>
                  <td><strong style={{ color: "var(--teal-1)" }}>{currency(i.paid_amount)}</strong></td>
                  <td className="muted">{fmtDate(i.updated_at)}</td>
                  <td>
                    <div className="cta-row">
                      {i.invoice_status !== "paid" && (
                        <button className="btn btn-sm btn-secondary" onClick={() => setPay(p => ({ ...p, invoice_id: String(i.id), amount: i.total_amount - i.paid_amount }))}>
                          💲 Thu tiền
                        </button>
                      )}
                      {i.payment_status === "awaiting_confirmation" && (
                        <button className="btn btn-sm btn-success" onClick={() => runAction(() => api.patch(`/api/v1/invoices/${i.id}/confirm-transfer`))}>✅ Duyệt</button>
                      )}
                      <button type="button" onClick={() => downloadInvoicePdf(i.id)} className="btn btn-sm btn-primary">PDF</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="content-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 0 }}>
        <Panel title="📄 Lập Hóa Đơn Trực Tiếp">
          <div className="form-grid" style={{ gridTemplateColumns: "1fr", marginBottom: 0 }}>
            <Field label="Mã lịch hẹn (Appointment ID)"><input value={inv.appointment_id} onChange={(e) => setInv(p => ({ ...p, appointment_id: e.target.value }))} /></Field>
            <Field label="Giảm giá (VND)"><input type="number" value={inv.discount_amount} onChange={(e) => setInv(p => ({ ...p, discount_amount: e.target.value }))} /></Field>
            <Field label="Bảo hiểm hỗ trợ (VND)"><input type="number" value={inv.insurance_support_amount} onChange={(e) => setInv(p => ({ ...p, insurance_support_amount: e.target.value }))} /></Field>
          </div>
          <button className="btn btn-primary" onClick={genInv} style={{ marginTop: "1rem" }}>Tạo hóa đơn</button>
        </Panel>

        <Panel title="💳 Thu Tiền Giao Dịch">
          <div className="form-grid" style={{ gridTemplateColumns: "1fr", marginBottom: 0 }}>
            <Field label="Mã Hóa đơn (Invoice ID)"><input value={pay.invoice_id} onChange={(e) => setPay(p => ({ ...p, invoice_id: e.target.value }))} /></Field>
            <Field label="Hình thức thanh toán">
              <select value={pay.payment_method} onChange={(e) => setPay(p => ({ ...p, payment_method: e.target.value }))}>
                <option value="cash">Tiền mặt</option>
                <option value="card">Thẻ tín dụng / Ghi nợ</option>
                <option value="qr">Mã QR</option>
                <option value="insurance_support">Bảo lãnh viện phí</option>
              </select>
            </Field>
            <Field label="Số tiền thu (VND)"><input type="number" value={pay.amount} onChange={(e) => setPay(p => ({ ...p, amount: e.target.value }))} /></Field>
          </div>
          <div className="cta-row" style={{ marginTop: "1rem" }}>
            <button className="btn btn-primary" onClick={payInv}>Xác nhận thanh toán</button>
            <button className="btn btn-secondary" onClick={() => approveCredit(pay.invoice_id)}>Duyệt công nợ</button>
          </div>
        </Panel>
      </div>
    </>
  );
}
