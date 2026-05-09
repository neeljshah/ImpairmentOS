from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse, JSONResponse

from database import SessionLocal
from seed import seed_db
from app.config import get_settings
from app.routes import impairments, dashboard, properties, packets, export, deficiencies, demo

settings = get_settings()

STATIC_DIR = Path(__file__).resolve().parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
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


@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    return {"status": "ok"}


app.include_router(impairments.router)
app.include_router(dashboard.router)
app.include_router(properties.router)
app.include_router(packets.router)
app.include_router(export.router)
app.include_router(deficiencies.router)
app.include_router(demo.router)

if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.exception_handler(404)
    async def spa_not_found(request: Request, _exc):
        if "text/html" in request.headers.get("accept", ""):
            index = STATIC_DIR / "index.html"
            if index.is_file():
                return FileResponse(index)
        return JSONResponse({"detail": "Not Found"}, status_code=404)
else:

    @app.get("/")
    def root():
        return {"status": "ImpairmentOS API running"}
