import logging
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import APIRouter, FastAPI  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

from database import client  # noqa: E402
from routers.analytics_router import router as analytics_router  # noqa: E402
from routers.approvals_router import router as approvals_router  # noqa: E402
from routers.audit_router import router as audit_router  # noqa: E402
from routers.auth_router import router as auth_router  # noqa: E402
from routers.business_brain_router import router as business_brain_router  # noqa: E402
from routers.calendar_router import router as calendar_router  # noqa: E402
from routers.composer_router import router as composer_router  # noqa: E402
from routers.dashboard_router import router as dashboard_router  # noqa: E402
from routers.inbox_router import router as inbox_router  # noqa: E402
from routers.leads_router import router as leads_router  # noqa: E402
from routers.media_router import router as media_router  # noqa: E402
from routers.meta_router import router as meta_router  # noqa: E402
from services import storage_service  # noqa: E402

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Dillard's Social Manager API")

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(meta_router)
api_router.include_router(business_brain_router)
api_router.include_router(media_router)
api_router.include_router(composer_router)
api_router.include_router(approvals_router)
api_router.include_router(calendar_router)
api_router.include_router(inbox_router)
api_router.include_router(leads_router)
api_router.include_router(analytics_router)
api_router.include_router(dashboard_router)
api_router.include_router(audit_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        await storage_service.init_storage()
    except Exception as exc:
        logger.warning(f"Object storage init failed (will retry lazily on first upload): {exc}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
