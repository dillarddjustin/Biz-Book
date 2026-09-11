from datetime import datetime, UTC

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import db
from deps import get_current_user, require_owner
from models import InboxItem, Lead, User
from services import ai_service, meta_service

router = APIRouter(prefix="/inbox", tags=["inbox"])


@router.get("")
async def list_inbox(item_type: str | None = None, user: User = Depends(get_current_user)):
    query = {"type": item_type} if item_type else {}
    docs = await db.inbox_items.find(query).sort("created_time", -1).to_list(300)
    return [InboxItem.from_mongo(d).model_dump() for d in docs]


@router.post("/refresh")
async def refresh_inbox(user: User = Depends(get_current_user)):
    count = await db.inbox_items.count_documents({})
    if count == 0:
        seed = meta_service.demo_inbox_seed()
        await db.inbox_items.insert_many(seed)
        return {"ok": True, "new_items": len(seed)}
    return {"ok": True, "new_items": 0}


@router.post("/{item_id}/classify")
async def classify_item(item_id: str, user: User = Depends(get_current_user)):
    doc = await db.inbox_items.find_one({"_id": ObjectId(item_id)})
    if not doc:
        raise HTTPException(404, "Inbox item not found")
    brain_doc = await db.business_brain.find_one({}) or {}
    try:
        result = await ai_service.classify_inbox_item(doc["message"], brain_doc)
    except Exception as exc:
        raise HTTPException(502, f"NOVA classification failed: {exc}")

    new_status = "needs_human" if result.get("needs_human") else "read"
    await db.inbox_items.update_one({"_id": ObjectId(item_id)}, {"$set": {
        "classification": result.get("classification"), "suggested_reply": result.get("suggested_reply"),
        "status": new_status,
    }})

    extracted = result.get("extracted_lead")
    if extracted and extracted.get("name"):
        lead = Lead(
            name=extracted.get("name", "Unknown"), service=extracted.get("service"),
            city=extracted.get("city"), urgency=extracted.get("urgency", "medium"),
            source="facebook_comment" if doc["type"] == "comment" else "messenger",
            conversation_ref=doc["meta_id"], stage="new", created_by=user.id,
        )
        res = await db.leads.insert_one(lead.to_mongo())
        await db.inbox_items.update_one({"_id": ObjectId(item_id)},
                                         {"$set": {"linked_lead_id": str(res.inserted_id)}})

    updated = await db.inbox_items.find_one({"_id": ObjectId(item_id)})
    return InboxItem.from_mongo(updated).model_dump()


class ReplyBody(BaseModel):
    message: str


@router.post("/{item_id}/reply")
async def reply_to_item(item_id: str, body: ReplyBody, user: User = Depends(require_owner)):
    doc = await db.inbox_items.find_one({"_id": ObjectId(item_id)})
    if not doc:
        raise HTTPException(404, "Inbox item not found")
    await db.inbox_items.update_one({"_id": ObjectId(item_id)}, {"$set": {"status": "replied"}})
    await db.audit_events.insert_one({
        "actor_id": user.id, "actor_name": user.name, "action": "inbox_reply",
        "target_type": "inbox_item", "target_id": item_id, "result": "success",
        "details": f"is_demo={doc.get('is_demo', True)}", "created_at": datetime.now(UTC),
    })
    updated = await db.inbox_items.find_one({"_id": ObjectId(item_id)})
    return InboxItem.from_mongo(updated).model_dump()
