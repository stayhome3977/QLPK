from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.routers import auth, clinic, reports
from app.seed import seed_defaults
from app.websocket.manager import manager

app = FastAPI(title=settings.APP_NAME)
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:  # noqa: BLE001
        # Existing MySQL schemas created by legacy SQL scripts can have signed/unsigned
        # mismatches that break SQLAlchemy auto-DDL. Keep API booting instead of crashing.
        logger.warning("Skipping automatic schema sync due to DDL error: %s", exc)
    db = SessionLocal()
    try:
        try:
            seed_defaults(db, settings.DEFAULT_ADMIN_EMAIL, settings.DEFAULT_ADMIN_PASSWORD)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Skipping default seed due to schema mismatch: %s", exc)
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)


app.include_router(auth.router)
app.include_router(clinic.router)
app.include_router(reports.router)

