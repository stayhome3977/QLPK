import secrets
import string
from datetime import datetime, timedelta
from typing import Optional, Tuple
import hashlib
import logging
import json
from pathlib import Path
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.email_service import email_service

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
    try:
        with _DEBUG_LOG_PATH.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload, ensure_ascii=True) + "\n")
    except Exception:
        # Never break registration/reset flow because debug logging fails.
        return

class AuthService:
    def __init__(self):
        self.verification_code_expiry_minutes = 10
        self.reset_code_expiry_minutes = 10
    
    def generate_verification_code(self, length: int = 6) -> str:
        """
        Tạo mã xác thực ngẫu nhiên
        
        Args:
            length: Độ dài mã (mặc định 6)
            
        Returns:
            str: Mã xác thực
        """
        # Tạo mã chỉ chứa số
        return ''.join(secrets.choice(string.digits) for _ in range(length))
    
    def generate_reset_token(self, length: int = 32) -> str:
        """
        Tạo token đặt lại mật khẩu
        
        Args:
            length: Độ dài token
            
        Returns:
            str: Token đặt lại mật khẩu
        """
        return secrets.token_urlsafe(length)
    
    def hash_password(self, password: str) -> str:
        """
        Hash mật khẩu sử dụng bcrypt
        
        Args:
            password: Mật khẩu gốc
            
        Returns:
            str: Mật khẩu đã hash
        """
        import bcrypt
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """
        Kiểm tra mật khẩu
        
        Args:
            password: Mật khẩu cần kiểm tra
            hashed_password: Mật khẩu đã hash
            
        Returns:
            bool: True nếu mật khẩu đúng
        """
        import bcrypt
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    def send_verification_email(self, email: str, full_name: str, db: Session, registration_data: dict = None) -> Tuple[bool, str]:
        """
        Gửi email xác thực đăng ký
        
        Args:
            email: Email người nhận
            full_name: Họ tên người nhận
            db: Database session
            registration_data: Thông tin đăng ký để lưu
            
        Returns:
            Tuple[bool, str]: (Thành công, Mã xác thực/Lỗi)
        """
        try:
            # region agent log
            _append_debug_log(
                run_id="pre-fix",
                hypothesis_id="H3",
                location="app/services/auth_service.py:send_verification_email:entry",
                message="send_verification_email started",
                data={"email": email, "has_registration_data": bool(registration_data)},
            )
            # endregion
            # Tạo mã xác thực
            verification_code = self.generate_verification_code()
            expires_at = datetime.now() + timedelta(minutes=self.verification_code_expiry_minutes)
            
            # Lưu mã xác thực và thông tin đăng ký vào database
            from app.models.verification_code import VerificationCode, CodeTypeEnum
            import json
            
            verification_record = VerificationCode(
                email=email,
                code=verification_code,
                code_type=CodeTypeEnum.VERIFICATION,
                expires_at=expires_at
            )
            
            # Lưu thêm thông tin đăng ký vào JSON metadata (nếu có)
            if registration_data:
                verification_record.registration_data = json.dumps(registration_data)
            
            db.add(verification_record)
            db.commit()
            # region agent log
            _append_debug_log(
                run_id="pre-fix",
                hypothesis_id="H3",
                location="app/services/auth_service.py:send_verification_email:db_committed",
                message="verification code committed",
                data={"email": email, "code_length": len(verification_code)},
            )
            # endregion
            
            # Gửi email
            email_sent = email_service.send_verification_code(email, full_name, verification_code)
            # region agent log
            _append_debug_log(
                run_id="pre-fix",
                hypothesis_id="H4",
                location="app/services/auth_service.py:send_verification_email:email_result",
                message="email service returned",
                data={"email": email, "email_sent": email_sent},
            )
            # endregion
            
            if email_sent:
                logger.info(f"Verification code sent to {email}: {verification_code}")
                return True, verification_code
            else:
                return False, "Không thể gửi email xác thực"
                
        except Exception as e:
            logger.error(f"Error sending verification email: {str(e)}")
            # region agent log
            _append_debug_log(
                run_id="pre-fix",
                hypothesis_id="H3",
                location="app/services/auth_service.py:send_verification_email:exception",
                message="exception in send_verification_email",
                data={"email": email, "error": str(e)},
            )
            # endregion
            return False, f"Lỗi hệ thống: {str(e)}"
    
    def send_password_reset_email(self, email: str, full_name: str, db: Session) -> Tuple[bool, str]:
        """
        Gửi email đặt lại mật khẩu
        
        Args:
            email: Email người nhận
            full_name: Họ tên người nhận
            db: Database session
            
        Returns:
            Tuple[bool, str]: (Thành công, Mã đặt lại/Lỗi)
        """
        try:
            # Tạo mã đặt lại mật khẩu
            reset_code = self.generate_verification_code()
            expires_at = datetime.now() + timedelta(minutes=self.reset_code_expiry_minutes)
            
            # Lưu mã đặt lại vào database verification_codes table
            from app.models.verification_code import VerificationCode, CodeTypeEnum
            verification_record = VerificationCode(
                email=email,
                code=reset_code,
                code_type=CodeTypeEnum.PASSWORD_RESET,
                expires_at=expires_at
            )
            db.add(verification_record)
            db.commit()
            
            # Gửi email
            email_sent = email_service.send_password_reset_code(email, full_name, reset_code)
            
            if email_sent:
                logger.info(f"Password reset code sent to {email}: {reset_code}")
                return True, reset_code
            else:
                return False, "Không thể gửi email đặt lại mật khẩu"
                
        except Exception as e:
            logger.error(f"Error sending password reset email: {str(e)}")
            return False, f"Lỗi hệ thống: {str(e)}"
    
    def verify_code(self, email: str, code: str, db: Session, code_type: str = "verification") -> Tuple[bool, str]:
        """
        Kiểm tra mã xác thực
        
        Args:
            email: Email người dùng
            code: Mã cần kiểm tra
            db: Database session
            code_type: Loại mã ("verification" hoặc "reset")
            
        Returns:
            Tuple[bool, str]: (Hợp lệ, Thông báo)
        """
        try:
            from app.models.verification_code import VerificationCode, CodeTypeEnum
            
            # Tìm mã xác thực trong database
            verification_type = CodeTypeEnum.VERIFICATION if code_type == "verification" else CodeTypeEnum.PASSWORD_RESET
            
            verification_record = db.query(VerificationCode).filter(
                VerificationCode.email == email,
                VerificationCode.code == code,
                VerificationCode.code_type == verification_type,
                VerificationCode.expires_at > datetime.now(),
                VerificationCode.used_at.is_(None)
            ).first()
            
            if not verification_record:
                return False, "Mã xác thực không hợp lệ hoặc đã hết hạn"
            
            # Đánh dấu đã sử dụng
            verification_record.used_at = datetime.now()
            db.commit()
            
            return True, "Mã xác thực hợp lệ"
            
        except Exception as e:
            logger.error(f"Error verifying code: {str(e)}")
            return False, f"Lỗi hệ thống: {str(e)}"
    
    def validate_email(self, email: str) -> bool:
        """
        Kiểm tra định dạng email
        
        Args:
            email: Email cần kiểm tra
            
        Returns:
            bool: True nếu email hợp lệ
        """
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def validate_password(self, password: str) -> Tuple[bool, str]:
        """
        Kiểm tra độ mạnh của mật khẩu
        
        Args:
            password: Mật khẩu cần kiểm tra
            
        Returns:
            Tuple[bool, str]: (Hợp lệ, Thông báo lỗi)
        """
        if len(password) == 0:
            return False, "Mật khẩu không được để trống"
        
        return True, "Mật khẩu hợp lệ"

# Singleton instance
auth_service = AuthService()
