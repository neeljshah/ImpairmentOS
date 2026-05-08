from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from app.models import Property, Deficiency

router = APIRouter()

VALID_STATUSES = {"open", "proposal_sent", "customer_declined", "repair_scheduled", "resolved"}

class DeficiencyStatusUpdate(BaseModel):
    status: str
    resolved_by: Optional[str] = None
    notes: Optional[str] = None
    proposal_response: Optional[str] = None


def _serialize(d: Deficiency) -> dict:
    days_open = None
    if d.resolved_at:
        days_open = (d.resolved_at - d.reported_at).days
    else:
        days_open = (datetime.now() - d.reported_at).days

    return {
        "id": d.id,
        "property_id": d.property_id,
        "system_id": d.system_id,
        "system_type": d.system.system_type if d.system else None,
        "system_zone": d.system.zone if d.system else None,
        "reported_by": d.reported_by,
        "reported_at": d.reported_at.isoformat(),
        "description": d.description,
        "severity": d.severity,
        "status": d.status,
        "proposal_sent_at": d.proposal_sent_at.isoformat() if d.proposal_sent_at else None,
        "proposal_response": d.proposal_response,
        "resolved_at": d.resolved_at.isoformat() if d.resolved_at else None,
        "resolved_by": d.resolved_by,
        "nfpa_reference": d.nfpa_reference,
        "notes": d.notes,
        "on_itm_report": d.on_itm_report,
        "days_open": days_open,
    }


@router.get("/properties/{property_id}/deficiencies")
def list_property_deficiencies(property_id: int, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    deficiencies = (
        db.query(Deficiency)
        .filter(Deficiency.property_id == property_id)
        .order_by(Deficiency.reported_at.desc())
        .all()
    )
    return [_serialize(d) for d in deficiencies]


@router.patch("/deficiencies/{deficiency_id}/status")
def update_deficiency_status(deficiency_id: int, body: DeficiencyStatusUpdate, db: Session = Depends(get_db)):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")
    d = db.query(Deficiency).filter(Deficiency.id == deficiency_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Deficiency not found")
    d.status = body.status
    if body.status == "resolved":
        d.resolved_at = datetime.now()
        if body.resolved_by:
            d.resolved_by = body.resolved_by
    elif body.status == "proposal_sent":
        d.proposal_sent_at = datetime.now()
    if body.notes is not None:
        d.notes = body.notes
    if body.proposal_response is not None:
        d.proposal_response = body.proposal_response
    db.commit()
    db.refresh(d)
    return _serialize(d)


@router.get("/deficiencies/summary")
def deficiency_summary(db: Session = Depends(get_db)):
    """Open deficiency count per property."""
    deficiencies = db.query(Deficiency).filter(Deficiency.status != "resolved").all()
    counts: dict[int, int] = {}
    for d in deficiencies:
        counts[d.property_id] = counts.get(d.property_id, 0) + 1
    return counts
