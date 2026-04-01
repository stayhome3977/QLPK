from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import create_access_token, create_refresh_token, decode_token, get_password_hash, verify_password
from app.models.entities import Patient, PatientSource, RoleEnum, User
from app.schemas.api import LoginRequest, MessageResponse, RegisterRequest, TokenResponse
from app.seed import next_patient_code

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role.value,
        "full_name": user.full_name,
        "phone": user.phone,
    }


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email đã tồn tại")

    user = User(
        email=payload.email,
        password=get_password_hash(payload.password),
        role=RoleEnum.patient,
        full_name=payload.full_name,
        phone=payload.phone,
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
            date_of_birth=payload.date_of_birth,
            gender=payload.gender,
            address=payload.address,
        )
    )
    db.commit()
    return {"message": "Đăng ký bệnh nhân thành công"}


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


@router.post("/verify-email", response_model=MessageResponse)
def verify_email():
    return {"message": "Email đã được xác thực"}


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(email: str = Body(..., embed=True)):
    return {"message": f"Đã ghi nhận yêu cầu đặt lại mật khẩu cho {email}"}


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    email: str = Body(..., embed=True),
    new_password: str = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    user.password = get_password_hash(new_password)
    db.commit()
    return {"message": "Đặt lại mật khẩu thành công"}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return serialize_user(current_user)
