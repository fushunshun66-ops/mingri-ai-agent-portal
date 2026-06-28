"""JWT 签发/验证、密码哈希、API Key 加密"""

import base64
import hashlib
import os
import secrets
import time
import uuid
from datetime import datetime, timedelta, timezone

from cryptography.fernet import Fernet
from jose import JWTError, jwt

from common.config import settings

# ── 密码哈希（使用 pbkdf2_hmac，避免 passlib/bcrypt 兼容性问题） ──
_PBKDF2_ITERATIONS = 600_000


def hash_password(password: str) -> str:
    """使用 PBKDF2-HMAC-SHA256 哈希密码"""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ITERATIONS)
    return f"pbkdf2:sha256:{_PBKDF2_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(plain: str, hashed: str) -> bool:
    """验证密码"""
    try:
        parts = hashed.split("$")
        algo_info = parts[0].split(":")
        iterations = int(algo_info[2])
        salt = base64.b64decode(parts[1])
        stored_dk = base64.b64decode(parts[2])
        new_dk = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt, iterations)
        return secrets.compare_digest(new_dk, stored_dk)
    except (IndexError, ValueError):
        return False


# ── JWT ──
def create_access_token(
    sub: str, tenant_id: str, roles: list[str], extra: dict = None
) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    payload = {
        "sub": sub,
        "tenant_id": tenant_id,
        "roles": roles,
        "exp": expire,
        "type": "access",
        "iat": int(time.time()),
        "nbf": int(time.time()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(sub: str, tenant_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.jwt_refresh_token_expire_days
    )
    payload = {
        "sub": sub,
        "tenant_id": tenant_id,
        "exp": expire,
        "type": "refresh",
        "iat": int(time.time()),
        "nbf": int(time.time()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str, expected_type: str | None = None) -> dict:
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    if expected_type and payload.get("type") != expected_type:
        raise ValueError(f"Invalid token type, expected {expected_type}")
    return payload


# ── API Key 加密 (AES-256-GCM via Fernet) ──
def _get_fernet() -> Fernet:
    derived = base64.urlsafe_b64encode(
        hashlib.sha256(settings.encryption_key.encode()).digest()
    )
    return Fernet(derived)


def encrypt_api_key(plain: str) -> str:
    """加密 API Key，返回 base64 编码的密文"""
    return _get_fernet().encrypt(plain.encode()).decode()


def decrypt_api_key(encrypted: str) -> str:
    """解密 API Key"""
    return _get_fernet().decrypt(encrypted.encode()).decode()
