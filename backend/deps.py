from bson import ObjectId
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError

from auth_utils import decode_access_token
from database import db
from models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

UNAUTHORIZED = HTTPException(status_code=401, detail="Invalid authentication credentials")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    if not token:
        raise UNAUTHORIZED
    try:
        payload = decode_access_token(token)
        user_doc = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    except (InvalidTokenError, ValueError, TypeError, KeyError):
        raise UNAUTHORIZED
    if not user_doc:
        raise UNAUTHORIZED
    return User.from_mongo(user_doc)


async def require_owner(user: User = Depends(get_current_user)) -> User:
    if user.role != "owner":
        raise HTTPException(status_code=403, detail="Only the business owner can perform this action")
    return user
