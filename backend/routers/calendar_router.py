from fastapi import APIRouter, Depends

from database import db
from deps import get_current_user
from models import Draft, User

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("")
async def get_calendar(user: User = Depends(get_current_user)):
    docs = await db.drafts.find({"status": {"$in": ["scheduled", "published"]}}) \
        .sort("scheduled_at", 1).to_list(500)
    return [Draft.from_mongo(d).model_dump() for d in docs]
