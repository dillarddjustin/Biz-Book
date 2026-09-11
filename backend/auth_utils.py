import os
from datetime import datetime, timedelta, UTC

import jwt
from passlib.context import CryptContext

JWT_SECRET = os.environ["JWT_SECRET"]
ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days — field techs stay logged in on their phones

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Equal-cost verification for unknown emails, prevents user-existence timing leaks.
DUMMY_HASH = pwd_context.hash("not-a-real-password-placeholder")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user_id: str, role: str) -> str:
    now = datetime.now(UTC)
    payload = {"sub": user_id, "role": role, "iat": now, "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES)}
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
