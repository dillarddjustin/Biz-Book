from datetime import datetime, UTC

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import db
from deps import get_current_user, require_owner
from models import Draft, User
from services import meta_service

router = APIRouter(tags=["approvals"])


@router.get("/approvals")
async def list_approvals(user: User = Depends(get_current_user)):
    docs = await db.drafts.find({"status": {"$in": ["needs_review", "approved", "scheduled"]}}) \
        .sort("updated_at", -1).to_list(300)
    return [Draft.from_mongo(d).model_dump() for d in docs]


@router.post("/drafts/{draft_id}/submit")
async def submit_for_review(draft_id: str, user: User = Depends(get_current_user)):
    doc = await db.drafts.find_one({"_id": ObjectId(draft_id)})
    if not doc:
        raise HTTPException(404, "Draft not found")
    await db.drafts.update_one({"_id": ObjectId(draft_id)},
                                {"$set": {"status": "needs_review", "updated_at": datetime.now(UTC)}})
    updated = await db.drafts.find_one({"_id": ObjectId(draft_id)})
    return Draft.from_mongo(updated).model_dump()


@router.post("/drafts/{draft_id}/approve")
async def approve_draft(draft_id: str, user: User = Depends(require_owner)):
    doc = await db.drafts.find_one({"_id": ObjectId(draft_id)})
    if not doc:
        raise HTTPException(404, "Draft not found")
    await db.drafts.update_one({"_id": ObjectId(draft_id)},
                                {"$set": {"status": "approved", "updated_at": datetime.now(UTC)}})
    await db.audit_events.insert_one({
        "actor_id": user.id, "actor_name": user.name, "action": "draft_approve",
        "target_type": "draft", "target_id": draft_id, "result": "success", "created_at": datetime.now(UTC),
    })
    updated = await db.drafts.find_one({"_id": ObjectId(draft_id)})
    return Draft.from_mongo(updated).model_dump()


class RejectBody(BaseModel):
    reason: str | None = None


@router.post("/drafts/{draft_id}/reject")
async def reject_draft(draft_id: str, body: RejectBody, user: User = Depends(require_owner)):
    doc = await db.drafts.find_one({"_id": ObjectId(draft_id)})
    if not doc:
        raise HTTPException(404, "Draft not found")
    await db.drafts.update_one({"_id": ObjectId(draft_id)}, {"$set": {
        "status": "rejected", "rejection_reason": body.reason, "updated_at": datetime.now(UTC),
    }})
    await db.audit_events.insert_one({
        "actor_id": user.id, "actor_name": user.name, "action": "draft_reject",
        "target_type": "draft", "target_id": draft_id, "result": "success", "created_at": datetime.now(UTC),
    })
    updated = await db.drafts.find_one({"_id": ObjectId(draft_id)})
    return Draft.from_mongo(updated).model_dump()


class ScheduleBody(BaseModel):
    scheduled_at: datetime


@router.post("/drafts/{draft_id}/schedule")
async def schedule_draft(draft_id: str, body: ScheduleBody, user: User = Depends(require_owner)):
    doc = await db.drafts.find_one({"_id": ObjectId(draft_id)})
    if not doc or doc["status"] != "approved":
        raise HTTPException(400, "Draft must be approved before scheduling")
    await db.drafts.update_one({"_id": ObjectId(draft_id)}, {"$set": {
        "status": "scheduled", "scheduled_at": body.scheduled_at, "updated_at": datetime.now(UTC),
    }})
    updated = await db.drafts.find_one({"_id": ObjectId(draft_id)})
    return Draft.from_mongo(updated).model_dump()


@router.post("/drafts/{draft_id}/publish")
async def publish_draft(draft_id: str, user: User = Depends(require_owner)):
    doc = await db.drafts.find_one({"_id": ObjectId(draft_id)})
    if not doc:
        raise HTTPException(404, "Draft not found")
    if doc["status"] not in ("approved", "scheduled"):
        raise HTTPException(400, "Draft must be approved before publishing")
    page_doc = await db.pages.find_one({})
    if not page_doc:
        raise HTTPException(400, "No Facebook Page connected. Connect a Page first.")

    message = f"{doc.get('final_headline') or ''}\n\n{doc.get('final_caption') or ''}".strip()
    try:
        result = await meta_service.publish_text_post(page_doc, message)
    except Exception as exc:
        await db.drafts.update_one({"_id": ObjectId(draft_id)},
                                    {"$set": {"status": "failed", "updated_at": datetime.now(UTC)}})
        raise HTTPException(502, f"Facebook publish failed: {exc}")

    await db.drafts.update_one({"_id": ObjectId(draft_id)}, {"$set": {
        "status": "published", "published_at": datetime.now(UTC), "meta_post_id": result.get("id"),
        "is_demo_publish": result.get("is_demo", True), "updated_at": datetime.now(UTC),
    }})
    await db.audit_events.insert_one({
        "actor_id": user.id, "actor_name": user.name, "action": "draft_publish",
        "target_type": "draft", "target_id": draft_id, "result": "success",
        "details": f"is_demo={result.get('is_demo', True)} meta_post_id={result.get('id')}",
        "created_at": datetime.now(UTC),
    })
    updated = await db.drafts.find_one({"_id": ObjectId(draft_id)})
    return Draft.from_mongo(updated).model_dump()
