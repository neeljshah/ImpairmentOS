from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db, engine
from app.models import Base
from seed import seed_db

router = APIRouter()


@router.post("/demo/reset")
def reset_demo(db: Session = Depends(get_db)):
    """Truncate all tables and re-seed with fresh demo data."""
    db.close()

    with engine.connect() as conn:
        conn.execute(text("PRAGMA foreign_keys = OFF"))
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.execute(text("PRAGMA foreign_keys = ON"))
        conn.commit()

    fresh_db = Session(bind=engine)
    try:
        seed_db(fresh_db)
    finally:
        fresh_db.close()

    return {"status": "reset", "message": "Demo data restored to initial state"}
