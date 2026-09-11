from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import Response

from auth_utils import decode_access_token
from database import db
from deps import get_current_user
from models import MediaAsset, User
from services import storage_service

router = APIRouter(prefix="/media", tags=["media"])

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "heic", "heif"}
PRIVACY_KEYWORDS = ["face", "license plate", "address", "front door", "house number", "customer's home"]


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    tags: str = Form(""),
    alt_text: str = Form(""),
    user: User = Depends(get_current_user),
):
    content = await file.read()
    ext = (file.filename or "photo.jpg").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        ext = "jpg"
    path = storage_service.build_media_path(str(user.id), ext)
    await storage_service.put_object(path, content, file.content_type or "image/jpeg")

    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    lowered = (alt_text or "").lower()
    privacy_warning = None
    if any(k in lowered for k in PRIVACY_KEYWORDS):
        privacy_warning = "This photo may show a face, address, or license plate. Review before publishing."

    asset = MediaAsset(
        storage_path=path, filename=file.filename or "photo.jpg",
        content_type=file.content_type or "image/jpeg", tags=tag_list,
        alt_text=alt_text or None, privacy_warning=privacy_warning, uploaded_by=user.id,
    )
    result = await db.media_assets.insert_one(asset.to_mongo())
    asset.id = str(result.inserted_id)
    return asset.model_dump()


@router.get("")
async def list_media(user: User = Depends(get_current_user)):
    docs = await db.media_assets.find().sort("created_at", -1).to_list(200)
    return [MediaAsset.from_mongo(d).model_dump() for d in docs]


@router.patch("/{media_id}")
async def update_media(media_id: str, body: dict, user: User = Depends(get_current_user)):
    allowed = {k: v for k, v in body.items() if k in ("tags", "alt_text", "is_before_after")}
    await db.media_assets.update_one({"_id": ObjectId(media_id)}, {"$set": allowed})
    doc = await db.media_assets.find_one({"_id": ObjectId(media_id)})
    if not doc:
        raise HTTPException(404, "Media not found")
    return MediaAsset.from_mongo(doc).model_dump()


@router.delete("/{media_id}")
async def delete_media(media_id: str, user: User = Depends(get_current_user)):
    await db.media_assets.delete_one({"_id": ObjectId(media_id)})
    return {"ok": True}


@router.get("/file/{media_id}")
async def get_media_file(media_id: str, token: str | None = None, authorization: str | None = Header(default=None)):
    raw_token = token
    if not raw_token and authorization and authorization.startswith("Bearer "):
        raw_token = authorization.split(" ", 1)[1]
    if not raw_token:
        raise HTTPException(401, "Missing auth token")
    try:
        decode_access_token(raw_token)
    except Exception:
        raise HTTPException(401, "Invalid auth token")
    doc = await db.media_assets.find_one({"_id": ObjectId(media_id)})
    if not doc:
        raise HTTPException(404, "Media not found")
    content, content_type = await storage_service.get_object(doc["storage_path"])
    return Response(content=content, media_type=content_type)
