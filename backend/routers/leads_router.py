from datetime import datetime, UTC

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import db
from deps import get_current_user
from models import Lead, User

router = APIRouter(prefix="/leads", tags=["leads"])


class LeadBody(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    service: str | None = None
    city: str | None = None
    urgency: str = "medium"
    notes: str | None = None


@router.get("")
async def list_leads(user: User = Depends(get_current_user)):
    docs = await db.leads.find().sort("created_at", -1).to_list(500)
    return [Lead.from_mongo(d).model_dump() for d in docs]


@router.post("")
async def create_lead(body: LeadBody, user: User = Depends(get_current_user)):
    lead = Lead(**body.model_dump(), source="manual", created_by=user.id)
    result = await db.leads.insert_one(lead.to_mongo())
    lead.id = str(result.inserted_id)
    return lead.model_dump()


class StageBody(BaseModel):
    stage: str


@router.patch("/{lead_id}/stage")
async def update_stage(lead_id: str, body: StageBody, user: User = Depends(get_current_user)):
    doc = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not doc:
        raise HTTPException(404, "Lead not found")
    await db.leads.update_one({"_id": ObjectId(lead_id)},
                               {"$set": {"stage": body.stage, "updated_at": datetime.now(UTC)}})
    updated = await db.leads.find_one({"_id": ObjectId(lead_id)})
    return Lead.from_mongo(updated).model_dump()


@router.patch("/{lead_id}")
async def update_lead(lead_id: str, body: dict, user: User = Depends(get_current_user)):
    allowed_fields = {"name", "phone", "email", "service", "city", "urgency", "notes"}
    updates = {k: v for k, v in body.items() if k in allowed_fields}
    updates["updated_at"] = datetime.now(UTC)
    await db.leads.update_one({"_id": ObjectId(lead_id)}, {"$set": updates})
    updated = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not updated:
        raise HTTPException(404, "Lead not found")
    return Lead.from_mongo(updated).model_dump()


@router.delete("/{lead_id}")
async def delete_lead(lead_id: str, user: User = Depends(get_current_user)):
    await db.leads.delete_one({"_id": ObjectId(lead_id)})
    return {"ok": True}
