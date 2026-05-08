from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from database import get_db
from schemas import DashboardResponse
from app.models import Impairment, System, Property
from app.core.timestamp_service import TimestampService
from app.services.impairment_service import get_compliance_alerts

router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(db: Session = Depends(get_db)):
    # SQLite stores naive UTC strings — strip tzinfo only for this column comparison
    cutoff = TimestampService.now_utc().replace(tzinfo=None) - timedelta(days=90)

    active = (
        db.query(Impairment)
        .options(
            joinedload(Impairment.system)
            .joinedload(System.property)
            .joinedload(Property.jurisdiction),
            joinedload(Impairment.events),
        )
        .filter(Impairment.status.notin_(["closed", "closed_incomplete"]))
        .order_by(Impairment.opened_at.desc())
        .all()
    )

    recently_closed = (
        db.query(Impairment)
        .options(
            joinedload(Impairment.system)
            .joinedload(System.property)
            .joinedload(Property.jurisdiction),
            joinedload(Impairment.events),
        )
        .filter(
            Impairment.status.in_(["closed", "closed_incomplete"]),
            Impairment.closed_at >= cutoff,
        )
        .order_by(Impairment.closed_at.desc())
        .all()
    )

    alerts = get_compliance_alerts(db)

    return DashboardResponse(
        active_impairments=active,
        recently_closed=recently_closed,
        compliance_alerts=alerts,
    )
