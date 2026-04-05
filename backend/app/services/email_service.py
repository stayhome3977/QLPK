import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER")
        self.smtp_port = int(os.getenv("SMTP_PORT"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL")
        self.from_name = os.getenv("FROM_NAME")
    
    def send_email(
        self, 
        to_email: str, 
        subject: str, 
        body: str, 
        is_html: bool = False,
        to_name: Optional[str] = None
    ) -> bool:
        """
        Gửi email sử dụng SMTP Gmail
        
        Args:
            to_email: Email người nhận
            subject: Tiêu đề email
            body: Nội dung email
            is_html: Email có phải định dạng HTML không
            to_name: Tên người nhận (tùy chọn)
            
        Returns:
            bool: True nếu gửi thành công, False nếu thất bại
        """
        try:
            # Tạo message
            msg = MIMEMultipart()
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = f"{to_name} <{to_email}>" if to_name else to_email
            msg['Subject'] = subject
            
            # Thêm nội dung
            msg.attach(MIMEText(body, 'html' if is_html else 'plain', 'utf-8'))
            
            # Kết nối SMTP server
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()  # Bật mã hóa
            server.login(self.smtp_username, self.smtp_password)
            
            # Gửi email
            text = msg.as_string()
            server.sendmail(self.from_email, to_email, text)
            server.quit()
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def send_verification_code(self, email: str, full_name: str, verification_code: str) -> bool:
        """
        Gửi mã xác thực đăng ký tài khoản
        
        Args:
            email: Email người nhận
            full_name: Họ tên người nhận
            verification_code: Mã xác thực
            
        Returns:
            bool: True nếu gửi thành công
        """
        subject = "Mã Xác Thực Tài Khoản Bệnh Viện"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Xác Thực Tài Khoản</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2c3e50; margin-bottom: 10px;">Hệ Thống Phòng Khám Da Liễu</h1>
                    <p style="color: #7f8c8d; margin: 0;">Xác thực tài khoản của bạn</p>
                </div>
                
                <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0 0 10px 0; font-size: 16px; color: #2c3e50;">Xin chào <strong>{full_name}</strong>,</p>
                    <p style="margin: 10px 0; font-size: 16px; color: #2c3e50;">Mã xác thực tài khoản của bạn là:</p>
                    <div style="background-color: #3498db; color: white; font-size: 24px; font-weight: bold; padding: 15px; border-radius: 5px; letter-spacing: 3px; display: inline-block;">
                        {verification_code}
                    </div>
                </div>
                
                <div style="margin: 30px 0;">
                    <p style="color: #7f8c8d; font-size: 14px; line-height: 1.6;">
                        <strong>Lưu ý:</strong><br>
                        • Mã xác thực có hiệu lực trong <strong>10 phút</strong><br>
                        • Vui lòng không chia sẻ mã này với người khác<br>
                        • Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email
                    </p>
                </div>
                
                <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 30px; text-align: center;">
                    <p style="color: #95a5a6; font-size: 12px; margin: 0;">
                        © 2024 Phòng Khám Da Liễu. Tất cả quyền được bảo lưu.<br>
                        Đây là email tự động, vui lòng không trả lời.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(email, subject, html_body, is_html=True, to_name=full_name)
    
    def send_password_reset_code(self, email: str, full_name: str, reset_code: str) -> bool:
        """
        Gửi mã đặt lại mật khẩu
        
        Args:
            email: Email người nhận
            full_name: Họ tên người nhận
            reset_code: Mã đặt lại mật khẩu
            
        Returns:
            bool: True nếu gửi thành công
        """
        subject = "Mã Đặt Lại Mật Khẩu (OTP)"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Đặt Lại Mật Khẩu</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #e74c3c; margin-bottom: 10px;">Hệ Thống Phòng Khám Da Liễu</h1>
                    <p style="color: #7f8c8d; margin: 0;">Đặt lại mật khẩu của bạn</p>
                </div>
                
                <div style="background-color: #fdf2f2; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #f5c6cb;">
                    <p style="margin: 0 0 10px 0; font-size: 16px; color: #2c3e50;">Xin chào <strong>{full_name}</strong>,</p>
                    <p style="margin: 10px 0; font-size: 16px; color: #2c3e50;">Bạn đã yêu cầu đặt lại mật khẩu. Mã OTP của bạn là:</p>
                    <div style="background-color: #e74c3c; color: white; font-size: 24px; font-weight: bold; padding: 15px; border-radius: 5px; letter-spacing: 3px; display: inline-block;">
                        {reset_code}
                    </div>
                </div>
                
                <div style="margin: 30px 0;">
                    <p style="color: #7f8c8d; font-size: 14px; line-height: 1.6;">
                        <strong>Lưu ý:</strong><br>
                        • Mã OTP có hiệu lực trong <strong>10 phút</strong><br>
                        • Vui lòng không chia sẻ mã này với người khác<br>
                        • Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng liên hệ quản trị viên
                    </p>
                </div>
                
                <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 30px; text-align: center;">
                    <p style="color: #95a5a6; font-size: 12px; margin: 0;">
                        © 2024 Phòng Khám Da Liễu. Tất cả quyền được bảo lưu.<br>
                        Đây là email tự động, vui lòng không trả lời.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(email, subject, html_body, is_html=True, to_name=full_name)

# Singleton instance
email_service = EmailService()
