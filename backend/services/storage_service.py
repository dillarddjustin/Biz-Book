import os
import uuid

import requests
from fastapi.concurrency import run_in_threadpool

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "dillards-social-manager"

_storage_key = None


def _sync_init_storage() -> str:
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


async def init_storage() -> str:
    return await run_in_threadpool(_sync_init_storage)


def _sync_put_object(path: str, data: bytes, content_type: str) -> dict:
    global _storage_key
    key = _storage_key or _sync_init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                         headers={"X-Storage-Key": key, "Content-Type": content_type},
                         data=data, timeout=120)
    if resp.status_code == 503:
        _storage_key = None
        key = _sync_init_storage()
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                             headers={"X-Storage-Key": key, "Content-Type": content_type},
                             data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


async def put_object(path: str, data: bytes, content_type: str) -> dict:
    return await run_in_threadpool(_sync_put_object, path, data, content_type)


def _sync_get_object(path: str):
    global _storage_key
    key = _storage_key or _sync_init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 503:
        _storage_key = None
        key = _sync_init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


async def get_object(path: str):
    return await run_in_threadpool(_sync_get_object, path)


def build_media_path(user_id: str, ext: str) -> str:
    return f"{APP_NAME}/uploads/{user_id}/{uuid.uuid4().hex}.{ext}"
