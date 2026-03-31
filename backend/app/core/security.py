from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def create_token(subject: str, expires_delta: timedelta, token_type: str) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    payload: dict[str, Any] = {"sub": subject, "exp": expire, "type": token_type}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(subject: str) -> str:
    return create_token(subject, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES), "access")


def create_refresh_token(subject: str) -> str:
    return create_token(subject, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS), "refresh")


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
