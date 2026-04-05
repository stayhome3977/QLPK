from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class CodeTypeEnum(str, Enum):
    VERIFICATION = "verification"
    PASSWORD_RESET = "password_reset"


class VerificationCode(Base):
    __tablename__ = "verification_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), nullable=False, index=True)
    code = Column(String(10), nullable=False)
    code_type = Column(String(20), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    registration_data = Column(Text, nullable=True)  # Lưu thông tin đăng ký dạng JSON

    def __repr__(self):
        return f"<VerificationCode(email={self.email}, code={self.code}, type={self.code_type})>"
