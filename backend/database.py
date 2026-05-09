from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Base  # noqa: F401 — re-exported for main.py compat
import app.models  # noqa: F401 — registers all model classes with Base.metadata
from app.config import get_settings

SQLALCHEMY_DATABASE_URL = get_settings().database_url

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Bootstrap: create tables that don't yet exist. Alembic handles additive
# migrations on top of this baseline — safe to call repeatedly.
Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
