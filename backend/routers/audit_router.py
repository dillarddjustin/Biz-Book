from fastapi import APIRouter, Depends

from database import db
from deps import require_owner
from models import AuditEvent, User

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
async def list_audit(user: User = Depends(require_owner)):
    docs = await db.audit_events.find().sort("created_at", -1).to_list(200)
    return [AuditEvent.from_mongo(d).model_dump() for d in docs]
