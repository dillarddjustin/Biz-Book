from datetime import datetime, UTC

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import db
from deps import get_current_user
from models import Draft, PostVariation, QualityCheck, User, VersionEntry
from services import ai_service

router = APIRouter(tags=["composer"])


class GenerateBody(BaseModel):
    post_type: str
    notes: str
    media_ids: list[str] = []


@router.post("/composer/generate")
async def generate_draft(body: GenerateBody, user: User = Depends(get_current_user)):
    brain_doc = await db.business_brain.find_one({}) or {}
    media_notes = ""
    if body.media_ids:
        object_ids = [ObjectId(m) for m in body.media_ids if ObjectId.is_valid(m)]
        media_docs = await db.media_assets.find({"_id": {"$in": object_ids}}).to_list(20)
        media_notes = "; ".join(m.get("alt_text") or m.get("filename", "") for m in media_docs)

    try:
        ai_result = await ai_service.generate_post_variations(body.post_type, body.notes, brain_doc, media_notes)
    except Exception as exc:
        raise HTTPException(502, f"NOVA AI generation failed: {exc}")

    variations = [PostVariation(**v) for v in ai_result.get("variations", [])]
    quality = QualityCheck(**ai_result.get("quality_check", {}))

    draft = Draft(
        post_type=body.post_type, notes=body.notes, media_ids=body.media_ids,
        variations=variations, quality_check=quality, status="draft", created_by=user.id,
    )
    result = await db.drafts.insert_one(draft.to_mongo())
    draft.id = str(result.inserted_id)
    return draft.model_dump()


@router.get("/drafts")
async def list_drafts(status_filter: str | None = None, user: User = Depends(get_current_user)):
    query = {"status": status_filter} if status_filter else {}
    docs = await db.drafts.find(query).sort("created_at", -1).to_list(300)
    return [Draft.from_mongo(d).model_dump() for d in docs]


@router.get("/drafts/{draft_id}")
async def get_draft(draft_id: str, user: User = Depends(get_current_user)):
    doc = await db.drafts.find_one({"_id": ObjectId(draft_id)})
    if not doc:
        raise HTTPException(404, "Draft not found")
    return Draft.from_mongo(doc).model_dump()


class UpdateDraftBody(BaseModel):
    selected_variation_index: int | None = None
    final_headline: str | None = None
    final_caption: str | None = None
    final_hashtags: list[str] | None = None
    status: str | None = None


@router.patch("/drafts/{draft_id}")
async def update_draft(draft_id: str, body: UpdateDraftBody, user: User = Depends(get_current_user)):
    doc = await db.drafts.find_one({"_id": ObjectId(draft_id)})
    if not doc:
        raise HTTPException(404, "Draft not found")
    updates = body.model_dump(exclude_none=True)
    if "final_caption" in updates:
        history = doc.get("version_history", [])
        history.append(VersionEntry(caption=updates["final_caption"], edited_by=user.id).model_dump())
        updates["version_history"] = history
    updates["updated_at"] = datetime.now(UTC)
    await db.drafts.update_one({"_id": ObjectId(draft_id)}, {"$set": updates})
    updated = await db.drafts.find_one({"_id": ObjectId(draft_id)})
    return Draft.from_mongo(updated).model_dump()


@router.delete("/drafts/{draft_id}")
async def delete_draft(draft_id: str, user: User = Depends(get_current_user)):
    await db.drafts.delete_one({"_id": ObjectId(draft_id)})
    return {"ok": True}
