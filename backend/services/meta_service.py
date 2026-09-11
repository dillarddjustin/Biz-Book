import os
import random
import uuid
from datetime import datetime, timedelta, UTC

import requests
from cryptography.fernet import Fernet
from fastapi.concurrency import run_in_threadpool

META_APP_ID = os.environ.get("META_APP_ID", "").strip()
META_APP_SECRET = os.environ.get("META_APP_SECRET", "").strip()
META_GRAPH_VERSION = os.environ.get("META_GRAPH_VERSION", "v21.0").strip()
META_CALLBACK_URL = os.environ.get("META_CALLBACK_URL", "").strip()
GRAPH_BASE = f"https://graph.facebook.com/{META_GRAPH_VERSION}"

_fernet = Fernet(os.environ["FERNET_KEY"].encode())

REQUIRED_SCOPES = [
    "pages_show_list", "pages_read_engagement", "pages_read_user_content",
    "pages_manage_posts", "pages_manage_engagement", "read_insights",
]


def is_configured() -> bool:
    return bool(META_APP_ID and META_APP_SECRET and META_CALLBACK_URL)


def encrypt_token(token: str) -> str:
    return _fernet.encrypt(token.encode()).decode()


def decrypt_token(token: str) -> str:
    return _fernet.decrypt(token.encode()).decode()


def build_login_url(state: str) -> str:
    params = {
        "client_id": META_APP_ID,
        "redirect_uri": META_CALLBACK_URL,
        "state": state,
        "scope": ",".join(REQUIRED_SCOPES),
        "response_type": "code",
    }
    query = "&".join(f"{k}={requests.utils.quote(str(v))}" for k, v in params.items())
    return f"https://www.facebook.com/{META_GRAPH_VERSION}/dialog/oauth?{query}"


def _sync_exchange_code(code: str) -> str:
    resp = requests.get(f"{GRAPH_BASE}/oauth/access_token", params={
        "client_id": META_APP_ID, "client_secret": META_APP_SECRET,
        "redirect_uri": META_CALLBACK_URL, "code": code,
    }, timeout=20)
    resp.raise_for_status()
    return resp.json()["access_token"]


async def exchange_code_for_token(code: str) -> str:
    return await run_in_threadpool(_sync_exchange_code, code)


def _sync_discover_pages(user_token: str) -> list:
    resp = requests.get(f"{GRAPH_BASE}/me/accounts", params={
        "fields": "id,name,category,tasks,access_token", "access_token": user_token,
    }, timeout=20)
    resp.raise_for_status()
    return resp.json().get("data", [])


async def discover_pages(user_token: str) -> list:
    return await run_in_threadpool(_sync_discover_pages, user_token)


def _sync_publish_text(page_token: str, page_id: str, message: str) -> dict:
    resp = requests.post(f"{GRAPH_BASE}/{page_id}/feed", data={
        "message": message, "access_token": page_token,
    }, timeout=30)
    resp.raise_for_status()
    return resp.json()


async def publish_text_post(page: dict, message: str) -> dict:
    if page.get("is_demo", True):
        return {"id": f"demo_{uuid.uuid4().hex[:12]}", "is_demo": True}
    token = decrypt_token(page["access_token_encrypted"])
    result = await run_in_threadpool(_sync_publish_text, token, page["meta_page_id"], message)
    result["is_demo"] = False
    return result


def demo_insights(days: int = 14) -> list:
    today = datetime.now(UTC).date()
    out = []
    for i in range(days):
        d = today - timedelta(days=days - 1 - i)
        out.append({
            "date": d.isoformat(),
            "reach": random.randint(80, 420),
            "impressions": random.randint(150, 900),
            "reactions": random.randint(2, 35),
            "comments": random.randint(0, 12),
            "shares": random.randint(0, 6),
            "clicks": random.randint(1, 20),
            "follower_change": random.randint(-1, 4),
            "is_demo": True,
        })
    return out


def demo_inbox_seed() -> list:
    now = datetime.now(UTC)
    return [
        {"type": "comment", "meta_id": f"demo_c_{uuid.uuid4().hex[:8]}", "from_name": "Maria Gonzalez",
         "message": "My sprinklers in the backyard aren't turning on, can you guys help this week?",
         "status": "unread", "is_demo": True, "created_time": now - timedelta(hours=2), "created_at": now},
        {"type": "messenger", "meta_id": f"demo_m_{uuid.uuid4().hex[:8]}", "from_name": "Tom Whitfield",
         "message": "How much would it cost to fix a broken valve?",
         "status": "unread", "is_demo": True, "created_time": now - timedelta(hours=5), "created_at": now},
        {"type": "comment", "meta_id": f"demo_c_{uuid.uuid4().hex[:8]}", "from_name": "Sandra Lee",
         "message": "Y'all did a great job on our system last spring, thank you!",
         "status": "unread", "is_demo": True, "created_time": now - timedelta(days=1), "created_at": now},
        {"type": "mention", "meta_id": f"demo_mn_{uuid.uuid4().hex[:8]}", "from_name": "Kevin Park",
         "message": "Shoutout to Dillard's Irrigation Repair for the emergency fix this morning!",
         "status": "unread", "is_demo": True, "created_time": now - timedelta(days=2), "created_at": now},
    ]
