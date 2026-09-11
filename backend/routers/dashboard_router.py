from fastapi import APIRouter, Depends

from database import db
from deps import get_current_user
from models import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview")
async def overview(user: User = Depends(get_current_user)):
    page_doc = await db.pages.find_one({})
    pending_approvals = await db.drafts.count_documents({"status": "needs_review"})
    scheduled = await db.drafts.count_documents({"status": "scheduled"})
    drafts_count = await db.drafts.count_documents({"status": "draft"})
    unread_inbox = await db.inbox_items.count_documents({"status": "unread"})
    new_leads = await db.leads.count_documents({"stage": "new"})

    recent_docs = await db.drafts.find({"status": "published"}).sort("published_at", -1).to_list(5)
    recent_published = []
    for d in recent_docs:
        recent_published.append({
            "id": str(d["_id"]),
            "post_type": d.get("post_type"),
            "final_headline": d.get("final_headline"),
            "final_caption": d.get("final_caption"),
            "published_at": d.get("published_at"),
            "is_demo_publish": d.get("is_demo_publish", True),
        })

    return {
        "page_connected": bool(page_doc),
        "page_name": page_doc.get("name") if page_doc else None,
        "is_demo": page_doc.get("is_demo", True) if page_doc else True,
        "pending_approvals": pending_approvals,
        "scheduled": scheduled,
        "drafts": drafts_count,
        "unread_inbox": unread_inbox,
        "new_leads": new_leads,
        "recent_published": recent_published,
    }
