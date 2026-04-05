export const currency = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value || 0));

export const fmtDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const fmtTime = (value) => {
  if (!value) return "—";
  if (typeof value === "string" && value.length >= 5) return value.slice(0, 5);
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

export const fmtDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const STATUS_LABELS = {
  pending: "Chờ duyệt",
  confirmed: "Đã xác nhận",
  checked_in: "Đã đến khám",
  in_progress: "Đang khám",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  no_show: "Vắng mặt",
};

export const PRESCRIPTION_STATUS_LABELS = {
  pending: "Chờ xử lý",
  prepared: "Đã chuẩn bị một phần",
  awaiting_payment: "Chờ thanh toán",
  partially_dispensed: "Giao một phần",
  dispensed: "Đã giao",
  cancelled: "Đã hủy",
};

export const INVOICE_STATUS_LABELS = {
  draft: "Nháp",
  issued: "Đã lập",
  partially_paid: "Thanh toán một phần",
  paid: "Đã thanh toán",
  cancelled: "Đã hủy",
  refunded: "Đã hoàn tiền",
};

export const PAYMENT_STATUS_LABELS = {
  unpaid: "Chưa thanh toán",
  awaiting_confirmation: "Chờ xác nhận",
  partial: "Thanh toán một phần",
  paid: "Đã thanh toán",
  credit_approved: "Được duyệt công nợ",
  refunded: "Đã hoàn tiền",
};

export const ROLE_LABELS = {
  admin: "Quản trị",
  doctor: "Bác sĩ",
  pharmacist: "Dược sĩ",
  patient: "Bệnh nhân",
};

export const SLOT_STATUS = {
  available: { label: "Còn trống", className: "slot-available" },
  booked: { label: "Đã đặt", className: "slot-booked" },
  busy: { label: "Bác sĩ bận", className: "slot-busy" },
};

export function roleHome(role) {
  if (role === "doctor") return "/doctor";
  if (role === "pharmacist") return "/pharmacist";
  if (role === "admin") return "/admin";
  return "/";
}

export function statusClass(status) {
  return `status-${status}`;
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
