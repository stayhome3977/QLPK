// Shared UI primitives reused across all portals
import { STATUS_LABELS, currency, fmtDate, fmtDateTime, statusClass } from "../../utils/helpers";

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function StatCard({ label, value, small }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className={`value${small ? " small" : ""}`}>{value ?? "—"}</div>
    </div>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={statusClass(status)}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function EmptyState({ icon = "📋", text = "Chưa có dữ liệu." }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <p>{text}</p>
    </div>
  );
}

export function Alert({ type = "error", children }) {
  return <div className={type}>{children}</div>;
}

export function Panel({ title, children, actions }) {
  return (
    <div className="panel">
      {title && (
        <div className="toolbar" style={{ marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {actions && <div className="cta-row">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// Appointment table shared across roles
export function AppointmentTable({ items, actions = [] }) {
  if (!items || items.length === 0) return <EmptyState icon="📅" text="Không có lịch hẹn nào." />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Bệnh nhân</th>
            <th>Bác sĩ</th>
            <th>Ngày</th>
            <th>Giờ</th>
            <th>STT</th>
            <th>Trạng thái</th>
            {actions.length > 0 && <th>Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="muted">{item.id}</td>
              <td>{item.patient_name || "—"}</td>
              <td>{item.doctor_name || "—"}</td>
              <td>{fmtDate(item.appointment_date)}</td>
              <td>{item.appointment_time ? item.appointment_time.slice(0, 5) : "—"}</td>
              <td>{item.queue_number ?? "—"}</td>
              <td><StatusBadge status={item.status} /></td>
              {actions.length > 0 && (
                <td>
                  <div className="cta-row">
                    {actions.map((action) =>
                      action.show ? action.show(item) ? (
                        <button key={action.label} className={`btn btn-sm ${action.cls || "btn-secondary"}`}
                          onClick={() => action.run(item)}>
                          {action.label}
                        </button>
                      ) : null : (
                        <button key={action.label} className={`btn btn-sm ${action.cls || "btn-secondary"}`}
                          onClick={() => action.run(item)}>
                          {action.label}
                        </button>
                      )
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Medicine list table
export function MedicineTable({ items }) {
  if (!items || items.length === 0) return <EmptyState icon="💊" text="Chưa có thuốc nào." />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tên thuốc</th>
            <th>Hoạt chất</th>
            <th>Nhóm</th>
            <th>Đơn vị</th>
            <th>Giá</th>
            <th>Tồn kho</th>
            <th>Mức tối thiểu</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => {
            const cls = m.current_stock === 0 ? "stock-danger" : m.current_stock < m.reorder_level ? "stock-warn" : "stock-ok";
            return (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td className="muted">{m.generic_name || "—"}</td>
                <td><span className="chip chip-blue">{m.category || "—"}</span></td>
                <td>{m.unit}</td>
                <td>{currency(m.price_per_unit)}</td>
                <td className={cls}>{m.current_stock}</td>
                <td className="muted">{m.reorder_level}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
