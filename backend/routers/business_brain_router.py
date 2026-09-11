from datetime import datetime, UTC

from bson import ObjectId
from fastapi import APIRouter, Depends

from database import db
from deps import get_current_user, require_owner
from models import BusinessBrain, User

router = APIRouter(prefix="/business-brain", tags=["business-brain"])


@router.get("")
async def get_brain(user: User = Depends(get_current_user)):
    doc = await db.business_brain.find_one({})
    if not doc:
        brain = BusinessBrain()
        result = await db.business_brain.insert_one(brain.to_mongo())
        brain.id = str(result.inserted_id)
        return brain.model_dump()
    return BusinessBrain.from_mongo(doc).model_dump()


@router.put("")
async def update_brain(body: BusinessBrain, user: User = Depends(require_owner)):
    body.updated_at = datetime.now(UTC)
    doc = await db.business_brain.find_one({})
    data = body.to_mongo()
    data.pop("_id", None)
    if doc:
        await db.business_brain.update_one({"_id": doc["_id"]}, {"$set": data})
        result_id = doc["_id"]
    else:
        res = await db.business_brain.insert_one(data)
        result_id = res.inserted_id
    updated = await db.business_brain.find_one({"_id": ObjectId(result_id)})
    return BusinessBrain.from_mongo(updated).model_dump()
