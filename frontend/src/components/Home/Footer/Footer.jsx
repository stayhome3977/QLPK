import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="home-footer">
      <div className="home-footer-columns">
        <div className="footer-col company-info">
          <strong>Công ty TNHH YouMed Việt Nam</strong>
          <p>
            <strong>VPĐD:</strong> 3/1 Thành Thái, Phường Diên Hồng, TP. HCM
          </p>
          <p>
            <strong>Hotline:</strong> 1900-2805 (8:00 - 17:30 từ T2 đến T7)
          </p>
          <p className="business-reg">
            Số ĐKKD 0315268642 do Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh cấp lần đầu ngày 14/09/2018.
          </p>
        </div>

        <div className="footer-col">
          <strong>Về YouMed</strong>
          <Link to="#">Giới thiệu về YouMed</Link>
          <Link to="#">Ban điều hành</Link>
          <Link to="#">Nhân sự & Tuyển dụng</Link>
          <Link to="#">Liên hệ</Link>
        </div>

        <div className="footer-col">
          <strong>Dịch vụ</strong>
          <Link to="/doctors">Đặt khám Bác sĩ</Link>
          <Link to="#">Đặt khám Bệnh viện</Link>
          <Link to="#">Đặt khám Phòng Khám</Link>
          <Link to="#">Y360</Link>
        </div>

        <div className="footer-col">
          <strong>Hỗ trợ</strong>
          <Link to="#">Điều Khoản Sử Dụng</Link>
          <Link to="#">Chính Sách Bảo Mật</Link>
          <Link to="#">Chính sách giải quyết khiếu nại</Link>
          <p>Hỗ trợ khách hàng: cskh@youmed.vn</p>
        </div>
      </div>

      <div className="home-footer-middle">
        <div className="social-links">
          <strong>Kết nối với chúng tôi</strong>
          <div className="social-icons">
            <a href="#" aria-label="Facebook" className="icon-link">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
              </svg>
            </a>
            <a href="#" aria-label="YouTube" className="icon-link">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
              </svg>
            </a>
            <a href="#" aria-label="LinkedIn" className="icon-link">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-1.85 0-2.68 1.02-3.14 1.73v-1.46h-2.76v8.29h2.76v-4.63c0-1.24.23-2.44 1.77-2.44 1.51 0 1.54 1.43 1.54 2.52v4.55h2.76zM6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.3H5.5v8.3h2.77z" />
              </svg>
            </a>
          </div>
        </div>
        <div className="badges">
          <div className="badge-item bct">BCT</div>
          <div className="badge-item dmca">DMCA PROTECTED</div>
        </div>
      </div>

      <div className="home-footer-bottom">
        <p>
          Các thông tin trên YouMed chỉ dành cho mục đích tham khảo, tra cứu và không thay thế cho việc chẩn đoán hoặc điều trị y khoa. 
          <br />Cần tuyệt đối tuân theo hướng dẫn của Bác sĩ và Nhân viên y tế.
        </p>
        <p>Copyright © 2018 - 2026 Công ty TNHH YouMed Việt Nam.</p>
      </div>
    </footer>
  );
}
