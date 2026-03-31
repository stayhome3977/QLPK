export const currency = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(val || 0));

export const fmtDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const fmtTime = (val) => {
  if (!val) return "—";
  if (typeof val === "string" && val.length === 8) return val.slice(0, 5);
  const d = new Date(val);
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

export const fmtDateTime = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const STATUS_LABELS = {
  pending:     "Chờ xác nhận",
  confirmed:   "Đã xác nhận",
  checked_in:  "Đã check-in",
  in_progress: "Đang khám",
  completed:   "Hoàn thành",
  cancelled:   "Đã hủy",
  no_show:     "Không đến",
};

export const PRESCRIPTION_STATUS_LABELS = {
  pending:            "Chờ chuẩn bị",
  prepared:           "Đã chuẩn bị một phần",
  awaiting_payment:   "Chờ thanh toán",
  partially_dispensed:"Xuất một phần",
  dispensed:          "Đã cấp đủ",
  cancelled:          "Đã hủy",
};

export const INVOICE_STATUS_LABELS = {
  draft:          "Nháp",
  issued:         "Đã lập",
  partially_paid: "Thanh toán một phần",
  paid:           "Đã thanh toán",
  cancelled:      "Đã hủy",
  refunded:       "Đã hoàn tiền",
};

export const PAYMENT_STATUS_LABELS = {
  unpaid:                "Chưa thanh toán",
  awaiting_confirmation: "Chờ xác nhận",
  partial:               "Thanh toán một phần",
  paid:                  "Đã thanh toán",
  credit_approved:       "Công nợ",
  refunded:              "Đã hoàn tiền",
};

export const ROLE_LABELS = {
  admin:        "Quản trị",
  doctor:       "Bác sĩ",
  receptionist: "Lễ tân",
  cashier:      "Thu ngân",
  pharmacist:   "Dược sĩ",
  patient:      "Bệnh nhân",
};

export function statusClass(status) {
  return `status-${status}`;
}

export function stockClass(current, reorder) {
  if (current === 0) return "stock-danger";
  if (current < reorder) return "stock-warn";
  return "stock-ok";
}
