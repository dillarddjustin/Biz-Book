from fastapi import APIRouter, Depends

from database import db
from deps import get_current_user
from models import User
from services import meta_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
async def overview(user: User = Depends(get_current_user)):
    page_doc = await db.pages.find_one({})
    is_demo = page_doc.get("is_demo", True) if page_doc else True

    insights_docs = await db.daily_insights.find().sort("date", 1).to_list(60)
    if not insights_docs:
        seed = meta_service.demo_insights(14)
        await db.daily_insights.insert_many(seed)
        insights_docs = seed

    published = await db.drafts.find({"status": "published"}).to_list(500)
    top_types: dict[str, int] = {}
    for d in published:
        key = d.get("post_type", "other")
        top_types[key] = top_types.get(key, 0) + 1

    leads_count = await db.leads.count_documents({})
    return {
        "is_demo": is_demo,
        "daily": [{k: v for k, v in d.items() if k != "_id"} for d in insights_docs],
        "total_published": len(published),
        "top_post_types": top_types,
        "total_leads": leads_count,
    }
