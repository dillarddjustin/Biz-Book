import secrets
from datetime import datetime, timedelta, UTC

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from database import db
from deps import get_current_user, require_owner
from models import FacebookPage, User
from services import meta_service

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/status")
async def status(user: User = Depends(get_current_user)):
    page_doc = await db.pages.find_one({}, sort=[("connected_at", -1)])
    page = None
    if page_doc:
        page = FacebookPage.from_mongo(page_doc).model_dump(exclude={"access_token_encrypted"})
    return {"configured": meta_service.is_configured(), "page": page}


@router.post("/demo-connect")
async def demo_connect(user: User = Depends(require_owner)):
    await db.pages.delete_many({})
    page = FacebookPage(
        meta_page_id=f"demo_page_{secrets.token_hex(6)}",
        name="Dillard's Irrigation Repair",
        category="Home Service",
        status="connected",
        is_demo=True,
        connected_by=user.id,
    )
    result = await db.pages.insert_one(page.to_mongo())
    page.id = str(result.inserted_id)
    await db.audit_events.insert_one({
        "actor_id": user.id, "actor_name": user.name, "action": "facebook_demo_connect",
        "target_type": "page", "target_id": page.id, "result": "success",
        "details": "Connected DEMO Facebook Page (no real Meta App configured yet)",
        "created_at": datetime.now(UTC),
    })
    return page.model_dump(exclude={"access_token_encrypted"})


@router.post("/connect/start")
async def connect_start(user: User = Depends(require_owner)):
    if not meta_service.is_configured():
        raise HTTPException(
            400,
            "Meta App not configured yet. Add META_APP_ID and META_APP_SECRET to the backend, "
            "or use Demo Connect to try the app now.",
        )
    state = secrets.token_urlsafe(24)
    await db.oauth_states.insert_one({
        "_id": state, "owner_id": user.id, "expires": datetime.now(UTC) + timedelta(minutes=10),
    })
    return {"login_url": meta_service.build_login_url(state)}


@router.get("/connect/callback")
async def connect_callback(code: str | None = None, state: str | None = None, error: str | None = None):
    if error or not code or not state:
        raise HTTPException(400, "Facebook login was cancelled or is invalid")
    st = await db.oauth_states.find_one_and_delete({"_id": state})
    if not st or st["expires"] < datetime.now(UTC):
        raise HTTPException(400, "This login link expired. Please try connecting again.")
    user_token = await meta_service.exchange_code_for_token(code)
    pages = await meta_service.discover_pages(user_token)
    await db.pending_page_choices.update_one(
        {"owner_id": st["owner_id"]},
        {"$set": {"owner_id": st["owner_id"], "pages": pages, "expires": datetime.now(UTC) + timedelta(minutes=10)}},
        upsert=True,
    )
    return RedirectResponse(url="https://www.facebook.com/connect/login_success.html")


@router.get("/connect/pending")
async def connect_pending(user: User = Depends(require_owner)):
    doc = await db.pending_page_choices.find_one({"owner_id": user.id})
    if not doc or doc["expires"] < datetime.now(UTC):
        return {"pages": []}
    pages = [{"id": p["id"], "name": p.get("name"), "category": p.get("category")} for p in doc["pages"]]
    return {"pages": pages}


class SelectPageBody(BaseModel):
    page_id: str


@router.post("/pages/select")
async def select_page(body: SelectPageBody, user: User = Depends(require_owner)):
    doc = await db.pending_page_choices.find_one({"owner_id": user.id})
    if not doc:
        raise HTTPException(400, "No pending Facebook Pages found. Reconnect Facebook first.")
    page_data = next((p for p in doc["pages"] if p["id"] == body.page_id), None)
    if not page_data:
        raise HTTPException(403, "That Page is not available for this account")
    await db.pages.delete_many({})
    page = FacebookPage(
        meta_page_id=page_data["id"], name=page_data.get("name", "Facebook Page"),
        category=page_data.get("category"), status="connected", is_demo=False,
        access_token_encrypted=meta_service.encrypt_token(page_data["access_token"]),
        connected_by=user.id,
    )
    result = await db.pages.insert_one(page.to_mongo())
    page.id = str(result.inserted_id)
    await db.pending_page_choices.delete_many({"owner_id": user.id})
    await db.audit_events.insert_one({
        "actor_id": user.id, "actor_name": user.name, "action": "facebook_connect",
        "target_type": "page", "target_id": page.id, "result": "success",
        "details": f"Connected real Facebook Page {page.name}", "created_at": datetime.now(UTC),
    })
    return page.model_dump(exclude={"access_token_encrypted"})


@router.post("/disconnect")
async def disconnect(user: User = Depends(require_owner)):
    await db.pages.delete_many({})
    await db.audit_events.insert_one({
        "actor_id": user.id, "actor_name": user.name, "action": "facebook_disconnect",
        "result": "success", "created_at": datetime.now(UTC),
    })
    return {"ok": True}
