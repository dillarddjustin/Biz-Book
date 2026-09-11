from datetime import datetime, UTC
from typing import Optional, List, Annotated, Any, Literal

from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator, EmailStr, ConfigDict


def _validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str) and ObjectId.is_valid(v):
        return v
    raise ValueError("Invalid ObjectId")


PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


class BaseDocument(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    @classmethod
    def from_mongo(cls, doc: Optional[dict]):
        if doc is None:
            return None
        return cls(**doc)

    def to_mongo(self) -> dict:
        data = self.model_dump(by_alias=True, exclude_none=True)
        _id = data.pop("_id", None)
        if _id:
            data["_id"] = ObjectId(_id)
        return data


# ---------------- Users ----------------
Role = Literal["owner", "team_member"]


class User(BaseDocument):
    email: EmailStr
    password_hash: str
    name: str
    role: Role = "team_member"
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ---------------- Facebook Page ----------------
class FacebookPage(BaseDocument):
    meta_page_id: str
    name: str
    category: Optional[str] = None
    status: Literal["connected", "needs_reauth", "disconnected"] = "connected"
    is_demo: bool = True
    access_token_encrypted: Optional[str] = None
    connected_by: Optional[PyObjectId] = None
    connected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ---------------- Business Brain ----------------
class FAQItem(BaseModel):
    question: str
    answer: str


class BusinessBrain(BaseDocument):
    business_name: str = "Dillard's Irrigation Repair LLC"
    page_name: str = "Dillard's Irrigation Repair"
    location: str = "Sanford, Florida"
    service_area: str = "Sanford, Lake Mary, Longwood, Winter Springs"
    services: List[str] = Field(default_factory=lambda: [
        "Irrigation system repair", "Sprinkler head replacement",
        "Valve & controller repair", "Leak detection", "Seasonal system tune-ups",
    ])
    hours: str = "Mon-Fri 7:00 AM - 5:00 PM"
    contact_methods: str = "Facebook Messenger, phone call"
    common_problems: List[str] = Field(default_factory=lambda: [
        "Broken sprinkler heads", "Leaking valves", "Controller malfunctions",
    ])
    approved_phrases: List[str] = Field(default_factory=lambda: [
        "Locally owned and operated", "Free estimates on new installs",
    ])
    phrases_to_avoid: List[str] = Field(default_factory=lambda: [
        "Guaranteed lowest price", "Same day service always",
    ])
    faqs: List[FAQItem] = Field(default_factory=list)
    brand_voice: str = "Friendly, direct, local service-call tone. No jargon."
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ---------------- Media ----------------
class MediaAsset(BaseDocument):
    storage_path: str
    filename: str
    content_type: str
    tags: List[str] = Field(default_factory=list)
    alt_text: Optional[str] = None
    privacy_warning: Optional[str] = None
    is_before_after: bool = False
    uploaded_by: PyObjectId
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ---------------- Drafts / Posts ----------------
PostType = Literal[
    "seasonal_reminder", "field_tip", "service_update", "before_after",
    "emergency", "faq", "customer_education", "promotion",
]
DraftStatus = Literal[
    "draft", "needs_review", "approved", "scheduled", "published", "failed", "rejected",
]


class PostVariation(BaseModel):
    tone: str
    headline: str
    caption: str
    hashtags: List[str] = Field(default_factory=list)
    alt_text: Optional[str] = None
    explanation: Optional[str] = None


class QualityCheck(BaseModel):
    accuracy_score: int = 0
    clarity_score: int = 0
    cta_score: int = 0
    privacy_risk: Literal["low", "medium", "high"] = "low"
    warnings: List[str] = Field(default_factory=list)


class VersionEntry(BaseModel):
    caption: str
    edited_by: Optional[PyObjectId] = None
    edited_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Draft(BaseDocument):
    post_type: PostType
    notes: str
    media_ids: List[str] = Field(default_factory=list)
    variations: List[PostVariation] = Field(default_factory=list)
    selected_variation_index: Optional[int] = None
    final_headline: Optional[str] = None
    final_caption: Optional[str] = None
    final_hashtags: List[str] = Field(default_factory=list)
    quality_check: Optional[QualityCheck] = None
    status: DraftStatus = "draft"
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    meta_post_id: Optional[str] = None
    is_demo_publish: bool = True
    rejection_reason: Optional[str] = None
    version_history: List[VersionEntry] = Field(default_factory=list)
    created_by: PyObjectId
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ---------------- Leads ----------------
LeadStage = Literal["new", "contacted", "estimate", "scheduled", "completed", "closed"]


class Lead(BaseDocument):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    service: Optional[str] = None
    city: Optional[str] = None
    urgency: Literal["low", "medium", "high", "emergency"] = "medium"
    source: Literal["facebook_comment", "messenger", "manual"] = "manual"
    conversation_ref: Optional[str] = None
    stage: LeadStage = "new"
    notes: Optional[str] = None
    created_by: PyObjectId
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ---------------- Inbox ----------------
InboxType = Literal["comment", "mention", "messenger"]
Classification = Literal["lead", "question", "compliment", "complaint", "spam", "emergency", "pricing", "other"]


class InboxItem(BaseDocument):
    type: InboxType
    meta_id: str
    from_name: str
    message: str
    classification: Optional[Classification] = None
    suggested_reply: Optional[str] = None
    status: Literal["unread", "read", "replied", "needs_human"] = "unread"
    linked_lead_id: Optional[str] = None
    is_demo: bool = True
    created_time: datetime = Field(default_factory=lambda: datetime.now(UTC))
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ---------------- Audit ----------------
class AuditEvent(BaseDocument):
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    result: Literal["success", "failure"] = "success"
    details: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# ---------------- Insights ----------------
class DailyInsight(BaseDocument):
    date: str
    reach: int = 0
    impressions: int = 0
    reactions: int = 0
    comments: int = 0
    shares: int = 0
    clicks: int = 0
    follower_change: int = 0
    is_demo: bool = True
