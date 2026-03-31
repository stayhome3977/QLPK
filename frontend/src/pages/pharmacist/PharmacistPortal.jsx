import { api } from "../../api/http";
import { Panel, MedicineTable, Alert } from "../../components/shared/UI";
import { PRESCRIPTION_STATUS_LABELS, fmtDateTime } from "../../utils/helpers";

export function PharmacistPortal({ data, reload, runAction }) {
  const medicines = data.medicines || [];
  const prescriptions = data.prescriptions || [];

  const onPrepare = (item) => runAction(() => api.patch(`/api/v1/prescriptions/${item.id}/prepare`));
  const onDispense = (item) => runAction(() => api.patch(`/api/v1/prescriptions/${item.id}/dispense`));
  const onRelease = (item) => runAction(() => api.patch(`/api/v1/prescriptions/${item.id}/release`));

  return (
    <>
      <Panel title="📦 Kệ Thuốc Phòng Khám (Tồn Kho)">
        <MedicineTable items={medicines} />
      </Panel>

      <Panel title="📝 Đơn Thuốc Đang Xử Lý">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Mã ĐT</th><th>Khoa</th><th>Ngày gửi</th><th>Trạng thái</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {prescriptions.map((p) => {
                let badgeCls = "chip-gray";
                if (p.status === "pending") badgeCls = "chip-yellow";
                if (p.status === "prepared") badgeCls = "chip-blue";
                if (p.status === "awaiting_payment") badgeCls = "chip-purple";
                if (p.status === "dispensed") badgeCls = "chip-green";
                if (p.status === "cancelled") badgeCls = "chip-red";

                return (
                  <tr key={p.id}>
                    <td><strong>ĐT-{p.id.toString().padStart(4, "0")}</strong></td>
                    <td>BS {p.doctor_id}</td>
                    <td className="muted">{fmtDateTime(p.created_at || new Date())}</td>
                    <td><span className={`chip ${badgeCls}`}>{PRESCRIPTION_STATUS_LABELS[p.status] || p.status}</span></td>
                    <td>
                      <div className="cta-row">
                        {p.status === "pending" && (
                          <button className="btn btn-sm btn-primary" onClick={() => onPrepare(p)}>Soạn thuốc</button>
                        )}
                        {/* Lưu ý: Dược sĩ chỉ xuất thuốc khi status của đơn thuốc cho phép (đã thanh toán / duyệt) -> logic backend quyết định. Ở đây Pharmacist có thể thử Bấm Dispense */}
                        {(p.status === "prepared" || p.status === "awaiting_payment") && (
                          <button className="btn btn-sm btn-success" onClick={() => onDispense(p)}>Giao thuốc</button>
                        )}
                        {(p.status === "prepared" || p.status === "awaiting_payment") && (
                          <button className="btn btn-sm btn-danger" onClick={() => onRelease(p)}>Hủy soạn</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
