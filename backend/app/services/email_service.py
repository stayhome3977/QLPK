import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging
import json
from datetime import datetime
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger(__name__)
_DEBUG_LOG_PATH = Path(__file__).resolve().parent.parent.parent / "debug-9f8f98.log"


def _append_debug_log(run_id: str, hypothesis_id: str, location: str, message: str, data: dict) -> None:
    payload = {
        "sessionId": "9f8f98",
        "runId": run_id,
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(datetime.utcnow().timestamp() * 1000),
    }
    with _DEBUG_LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=True) + "\n")

class EmailService:
    def __init__(self):
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.FROM_EMAIL
        self.from_name = settings.FROM_NAME
    
    def send_email(
        self, 
        to_email: str, 
        subject: str, 
        body: str, 
        is_html: bool = False,
        to_name: Optional[str] = None,
        max_retries: int = 3
    ) -> bool:
        """
        Gửi email sử dụng SMTP Gmail với retry mechanism
        
        Args:
            to_email: Email người nhận
            subject: Tiêu đề email
            body: Nội dung email
            is_html: Email có phải định dạng HTML không
            to_name: Tên người nhận (tùy chọn)
            max_retries: Số lần thử lại tối đa
            
        Returns:
            bool: True nếu gửi thành công, False nếu thất bại
        """
        # region agent log
        _append_debug_log(
            run_id="pre-fix",
            hypothesis_id="H1",
            location="app/services/email_service.py:send_email:config_snapshot",
            message="email config snapshot before validation",
            data={
                "smtp_server_set": bool(self.smtp_server),
                "smtp_port": self.smtp_port,
                "smtp_username_set": bool(self.smtp_username),
                "smtp_password_set": bool(self.smtp_password),
                "from_email_set": bool(self.from_email),
                "to_email": to_email,
            },
        )
        # endregion
        # Validate email configuration
        if not self._validate_email_config():
            logger.error("Email configuration is incomplete or invalid")
            return False
            
        # Tạo message
        msg = MIMEMultipart()
        msg['From'] = f"{self.from_name} <{self.from_email}>"
        msg['To'] = f"{to_name} <{to_email}>" if to_name else to_email
        msg['Subject'] = subject
        
        # Thêm nội dung
        msg.attach(MIMEText(body, 'html' if is_html else 'plain', 'utf-8'))
        
        # Retry mechanism
        for attempt in range(max_retries):
            try:
                logger.info(f"Attempting to send email to {to_email}, attempt {attempt + 1}/{max_retries}")
                
                # Kết nối SMTP server với timeout
                server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=30)
                server.set_debuglevel(1)  # Enable debug logging
                server.starttls()  # Bật mã hóa
                
                # Login with better error handling
                try:
                    server.login(self.smtp_username, self.smtp_password)
                except smtplib.SMTPAuthenticationError as auth_error:
                    logger.error(f"SMTP Authentication failed: {auth_error}")
                    if "application-specific password" in str(auth_error).lower():
                        logger.error("Gmail requires an App Password. Please generate one at: https://myaccount.google.com/apppasswords")
                    return False
                except Exception as login_error:
                    logger.error(f"Login failed: {login_error}")
                    if attempt == max_retries - 1:
                        return False
                    continue
                
                # Gửi email
                text = msg.as_string()
                server.sendmail(self.from_email, to_email, text)
                server.quit()
                
                logger.info(f"Email sent successfully to {to_email}")
                return True
                
            except smtplib.SMTPException as smtp_error:
                logger.error(f"SMTP error on attempt {attempt + 1}: {str(smtp_error)}")
                # region agent log
                _append_debug_log(
                    run_id="pre-fix",
                    hypothesis_id="H4",
                    location="app/services/email_service.py:send_email:smtp_exception",
                    message="smtp exception while sending",
                    data={"attempt": attempt + 1, "error": str(smtp_error), "to_email": to_email},
                )
                # endregion
                if attempt == max_retries - 1:
                    return False
                # Wait before retry (exponential backoff)
                import time
                time.sleep(2 ** attempt)
                
            except Exception as e:
                logger.error(f"Unexpected error on attempt {attempt + 1}: {str(e)}")
                # region agent log
                _append_debug_log(
                    run_id="pre-fix",
                    hypothesis_id="H4",
                    location="app/services/email_service.py:send_email:unexpected_exception",
                    message="unexpected exception while sending",
                    data={"attempt": attempt + 1, "error": str(e), "to_email": to_email},
                )
                # endregion
                if attempt == max_retries - 1:
                    return False
                import time
                time.sleep(2 ** attempt)
        
        return False
    
    def _validate_email_config(self) -> bool:
        """
        Validate email configuration
        
        Returns:
            bool: True if configuration is valid
        """
        if not all([self.smtp_server, self.smtp_username, self.smtp_password, self.from_email]):
            logger.error("Missing email configuration: SMTP_SERVER, SMTP_USERNAME, SMTP_PASSWORD, or FROM_EMAIL")
            return False
        
        # Check if using Gmail with regular password (not app password)
        if "gmail.com" in self.smtp_username and len(self.smtp_password.split()) > 1:
            logger.warning("Using Gmail with spaces in password. Ensure you're using an App Password.")
        
        return True
    
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
