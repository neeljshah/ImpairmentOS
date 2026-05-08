from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from app.services.impairment_service import load_impairment
from app.services.packet_service import generate_packet_data

router = APIRouter()


@router.get("/impairments/{impairment_id}/packet")
def get_packet(impairment_id: int, db: Session = Depends(get_db)):
    """Return structured packet data for the audit record / PDF generation."""
    imp = load_impairment(db, impairment_id)
    return generate_packet_data(db, imp)
