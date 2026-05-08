from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import SessionLocal
from seed import seed_db
from app.config import get_settings
from app.routes import impairments, dashboard, properties, packets, export, deficiencies, demo

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema is managed by Alembic — do NOT call create_all() here.
    db = SessionLocal()
    try:
        seed_db(db)
    finally:
        db.close()
    yield


app = FastAPI(title=settings.app_title, version=settings.app_version, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ImpairmentOS API running"}


app.include_router(impairments.router)
app.include_router(dashboard.router)
app.include_router(properties.router)
app.include_router(packets.router)
app.include_router(export.router)
app.include_router(deficiencies.router)
app.include_router(demo.router)
