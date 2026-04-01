import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../api/http";

function useLoad(path, initialValue = []) {
  const [data, setData] = useState(initialValue);
  useEffect(() => {
    api
      .get(path)
      .then((response) => setData(response.data))
      .catch(() => setData(initialValue));
  }, [path]);
  return data;
}

export function Body() {
  const doctors = useLoad("/api/v1/doctors");

  return (
    <main className="public-home-body">
      {/* Khối đội ngũ chuyên gia */}
      <section className="home-experts-section">
        <h2 className="section-title">Đội ngũ chuyên gia</h2>
        <div className="experts-panel">
          <div className="experts-grid">
            {doctors.slice(0, 6).map((doctor) => (
              <div key={doctor.id || doctor.user?.id} className="expert-item">
                <div className="expert-avatar">{doctor.user?.full_name?.slice(0, 1) || "B"}</div>
                <div className="expert-info">
                  <strong>{doctor.degree ? `${doctor.degree} ` : ""}{doctor.user?.full_name}</strong>
                  <span>{doctor.specialty || "Da liễu"}</span>
                </div>
              </div>
            ))}
            {/* Fallback in case there are not enough seeded doctors */}
            {doctors.length === 0 && (
              <>
                <div className="expert-item">
                  <div className="expert-avatar">K</div>
                  <div className="expert-info">
                    <strong>ThS.BS Nguyễn Hồng Vân Khánh</strong>
                    <span>Gan mật tuỵ - Ghép gan, Nhi</span>
                  </div>
                </div>
                <div className="expert-item">
                  <div className="expert-avatar">P</div>
                  <div className="expert-info">
                    <strong>ThS.BS Đinh Thị Lan Phương</strong>
                    <span>Tai - Mũi - Họng</span>
                  </div>
                </div>
                <div className="expert-item">
                  <div className="expert-avatar">Đ</div>
                  <div className="expert-info">
                    <strong>ThS.BS Vũ Thành Đô</strong>
                    <span>Tim - Thận - Khớp - Nội tiết</span>
                  </div>
                </div>
                <div className="expert-item">
                  <div className="expert-avatar">N</div>
                  <div className="expert-info">
                    <strong>ThS.BS Phan Lê Nam</strong>
                    <span>Sản phụ khoa</span>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="experts-intro">
            <p className="intro-text">
              Hội đồng tham vấn y khoa cùng đội ngũ biên tập viên là các bác sĩ, dược sĩ đảm bảo nội dung chúng tôi cung cấp chính xác về mặt y khoa và cập nhật những thông tin mới nhất.
            </p>
            <Link to="/doctors" className="primary-button pill-button">
              Đội ngũ chuyên gia &nbsp; &#10095;
            </Link>
          </div>
        </div>
      </section>

      {/* Banner xanh */}
      <section className="home-trust-banner">
        <div className="banner-title-col">
          <h3>Tạo nên một nguồn thông tin sức khoẻ đáng tin cậy, dễ đọc, dễ hiểu cho mọi đối tượng độc giả</h3>
        </div>
        <div className="banner-features-col">
          <div className="feature-item">
            <div className="feature-icon icon-doctor">⚕️</div>
            <span>Biên soạn bởi<br/>Bác sĩ và Dược sĩ</span>
          </div>
          <div className="feature-item">
             <div className="feature-icon icon-content">📝</div>
            <span>Chính sách biên tập<br/>nội dung minh bạch</span>
          </div>
          <div className="feature-item">
             <div className="feature-icon icon-ads">📢</div>
            <span>Chính sách<br/>quảng cáo</span>
          </div>
          <div className="feature-item">
             <div className="feature-icon icon-privacy">🛡️</div>
            <span>Chính sách<br/>bảo mật</span>
          </div>
        </div>
      </section>

      <section className="home-booking-cta">
        <h2>Bạn cần hỗ trợ y tế?</h2>
        <p>Đăng ký khám và nhận tư vấn từ các chuyên gia da liễu hàng đầu của chúng tôi ngay hôm nay.</p>
        <Link to="/booking" className="primary-button large-button">
          Đặt lịch khám
        </Link>
      </section>
    </main>
  );
}
