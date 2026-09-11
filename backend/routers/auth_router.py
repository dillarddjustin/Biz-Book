from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from auth_utils import DUMMY_HASH, create_access_token, hash_password, verify_password
from database import db
from deps import get_current_user
from models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


def _public_user(user: User) -> dict:
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role}


@router.post("/register", status_code=201)
async def register(body: RegisterBody):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(409, "Email already registered")
    # First registered account becomes the owner (full control); everyone after
    # is a team_member who can draft content but not approve/publish.
    owner_exists = await db.users.find_one({"role": "owner"})
    role = "owner" if not owner_exists else "team_member"
    user = User(email=email, password_hash=hash_password(body.password), name=body.name, role=role)
    result = await db.users.insert_one(user.to_mongo())
    user.id = str(result.inserted_id)
    token = create_access_token(user.id, user.role)
    return {"access_token": token, "user": _public_user(user)}


@router.post("/login")
async def login(body: LoginBody):
    email = body.email.lower()
    user_doc = await db.users.find_one({"email": email})
    stored_hash = user_doc["password_hash"] if user_doc else DUMMY_HASH
    valid = verify_password(body.password, stored_hash)
    if not user_doc or not valid:
        raise HTTPException(401, "Incorrect email or password")
    user = User.from_mongo(user_doc)
    token = create_access_token(user.id, user.role)
    return {"access_token": token, "user": _public_user(user)}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return _public_user(user)
