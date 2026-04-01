import { Link } from "react-router-dom";
import { useAuth } from "../../../auth";
import { ROLE_LABELS, roleHome } from "../../../utils/helpers";

export function Header() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="public-header">
      <Link to="/" className="brand-lockup clear-logo">
        <strong className="brand-title">Phòng khám Da Liễu</strong>
      </Link>
      <nav className="public-nav">
        <Link to="/">Trang chủ</Link>
        <Link to="/booking">Đặt lịch</Link>
        <Link to="/services">Dịch vụ</Link>
        <Link to="/patient">Lịch đã đặt</Link>
        {isAuthenticated ? (
          <>
            {user.role !== "patient" && <Link to={roleHome(user.role)}>{ROLE_LABELS[user.role] || "Tài khoản"}</Link>}
            <button type="button" className="ghost-button" onClick={logout}>
              Đăng xuất
            </button>
          </>
        ) : (
          <Link to="/login" className="primary-link">
            Đăng nhập
          </Link>
        )}
      </nav>
    </header>
  );
}
