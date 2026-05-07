from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import create_access_token, create_refresh_token, decode_token, get_password_hash, verify_password
from app.models.entities import GenderEnum, Patient, PatientSource, RoleEnum, User
from app.schemas.api import LoginRequest, MessageResponse, RegisterRequest, TokenResponse
from app.seed import next_patient_code
from app.services.auth_service import auth_service
from app.services.email_service import email_service

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role.value,
        "full_name": user.full_name,
        "phone": user.phone,
    }


class EmailVerificationRequest(BaseModel):
    email: EmailStr
    full_name: str

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str


def map_gender(value: str | None):
    if not value:
        return None
    return GenderEnum(value) if value in GenderEnum._value2member_map_ else None


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    # Validate email format
    if not auth_service.validate_email(payload.email):
        raise HTTPException(status_code=400, detail="Email không hợp lệ")
    
    # Validate password
    is_valid, password_msg = auth_service.validate_password(payload.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=password_msg)
    
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email đã tồn tại")

    # Gửi email xác thực trước và lưu thông tin đăng ký
    registration_data = {
        "full_name": payload.full_name,
        "password": get_password_hash(payload.password),
        "phone": payload.phone,
        "date_of_birth": str(payload.date_of_birth) if payload.date_of_birth else None,
        "gender": payload.gender,
        "address": payload.address
    }
    
    success, verification_code = auth_service.send_verification_email(payload.email, payload.full_name, db, registration_data)
    if not success:
        raise HTTPException(status_code=500, detail=f"Không thể gửi email xác thực: {verification_code}")
    
    return {"message": f"Mã xác thực đã được gửi đến {payload.email}. Vui lòng kiểm tra email và nhập mã để hoàn tất đăng ký."}


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email hoặc mật khẩu không đúng")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị khóa")
    if not user.email_verified_at:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản chưa xác thực email")

    user.last_login = datetime.utcnow()
    db.commit()
    return {
        "access_token": create_access_token(str(user.id)),
        "refresh_token": create_refresh_token(str(user.id)),
        "token_type": "bearer",
        "user": serialize_user(user),
    }


@router.post("/refresh", response_model=TokenResponse)
def refresh(refresh_token: str = Body(..., embed=True), db: Session = Depends(get_db)):
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("wrong token type")
        user_id = int(payload["sub"])
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Refresh token không hợp lệ") from exc

    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")

    return {
        "access_token": create_access_token(str(user.id)),
        "refresh_token": create_refresh_token(str(user.id)),
        "token_type": "bearer",
        "user": serialize_user(user),
    }


@router.post("/logout", response_model=MessageResponse)
def logout():
    return {"message": "Đăng xuất thành công"}


@router.post("/send-verification", response_model=MessageResponse)
def send_verification_email(payload: EmailVerificationRequest, db: Session = Depends(get_db)):
    """Gửi lại email xác thực"""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    
    if user.email_verified_at:
        raise HTTPException(status_code=400, detail="Tài khoản đã được xác thực")
    
    success, result = auth_service.send_verification_email(payload.email, payload.full_name, db)
    if not success:
        raise HTTPException(status_code=500, detail=f"Không thể gửi email xác thực: {result}")
    
    return {"message": "Đã gửi lại email xác thực. Vui lòng kiểm tra hòm thư."}


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(payload: VerifyCodeRequest, db: Session = Depends(get_db)):
    """Xác thực email bằng mã code và tạo tài khoản"""
    # Kiểm tra mã xác thực và lấy thông tin đăng ký
    from app.models.verification_code import VerificationCode, CodeTypeEnum
    
    verification_record = db.query(VerificationCode).filter(
        VerificationCode.email == payload.email,
        VerificationCode.code == payload.code,
        VerificationCode.code_type == CodeTypeEnum.VERIFICATION,
        VerificationCode.expires_at > datetime.now(),
        VerificationCode.used_at.is_(None)
    ).first()
    
    if not verification_record:
        raise HTTPException(status_code=400, detail="Mã xác thực không hợp lệ hoặc đã hết hạn")
    
    # Kiểm tra tài khoản đã tồn tại chưa
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        if existing_user.email_verified_at:
            raise HTTPException(status_code=400, detail="Tài khoản đã được xác thực")
        else:
            # Nếu tài khoản tồn tại nhưng chưa xác thực, cập nhật trạng thái
            existing_user.email_verified_at = datetime.utcnow()
            db.commit()
            return {"message": "Xác thực email thành công!"}
    
    # Lấy thông tin đăng ký từ verification record
    import json
    if verification_record.registration_data:
        registration_data = json.loads(verification_record.registration_data)
        full_name = registration_data.get("full_name", "Bệnh nhân")
        password = registration_data.get("password", get_password_hash("Default@123"))
        phone = registration_data.get("phone")
        date_of_birth = registration_data.get("date_of_birth")
        gender = registration_data.get("gender")
        address = registration_data.get("address")
    else:
        # Fallback nếu không có dữ liệu
        full_name = "Bệnh nhân"
        password = get_password_hash("Default@123")
        phone = None
        date_of_birth = None
        gender = None
        address = None
    
    # Tạo tài khoản mới sau khi xác thực email thành công
    user = User(
        email=payload.email,
        password=password,
        role=RoleEnum.patient,
        full_name=full_name,
        phone=phone,
        is_active=True,
        email_verified_at=datetime.utcnow(),
    )
    db.add(user)
    db.flush()

    db.add(
        Patient(
            user_id=user.id,
            patient_code=next_patient_code(db),
            created_source=PatientSource.self_register,
            date_of_birth=date_of_birth,
            gender=map_gender(gender),
            address=address,
        )
    )
    
    # Đánh mã đã sử dụng
    verification_record.used_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Xác thực email thành công! Tài khoản đã được tạo. Vui lòng đăng nhập."}


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Gửi mã đặt lại mật khẩu"""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    
    success, result = auth_service.send_password_reset_email(payload.email, user.full_name, db)
    if not success:
        raise HTTPException(status_code=500, detail=f"Không thể gửi email đặt lại mật khẩu: {result}")
    
    return {"message": f"Mã đặt lại mật khẩu đã được gửi đến {payload.email}. Vui lòng kiểm tra email và nhập mã để tiếp tục."}


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Đặt lại mật khẩu bằng mã code"""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    
    # Kiểm tra mã đặt lại mật khẩu
    is_valid, message = auth_service.verify_code(payload.email, payload.code, db, "reset")
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    # Validate new password
    is_valid, password_msg = auth_service.validate_password(payload.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=password_msg)
    
    # Cập nhật mật khẩu
    user.password = get_password_hash(payload.new_password)
    user.reset_code = None
    user.reset_code_expires_at = None
    db.commit()
    
    return {"message": "Đặt lại mật khẩu thành công!"}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return serialize_user(current_user)
