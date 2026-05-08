from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from app.models import Property, Impairment, System
from app.services.packet_service import generate_packet_data

router = APIRouter()


@router.get("/properties/{property_id}/export")
def export_property_records(
    property_id: int,
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """Export all impairment records for a property within a date range."""
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    try:
        start = datetime.strptime(start_date, "%Y-%m-%d") if start_date else datetime(2000, 1, 1)
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59) if end_date else datetime.now()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    system_ids = [s.id for s in prop.systems]
    if not system_ids:
        impairments = []
    else:
        impairments = (
            db.query(Impairment)
            .filter(
                Impairment.system_id.in_(system_ids),
                Impairment.opened_at >= start,
                Impairment.opened_at <= end,
            )
            .order_by(Impairment.opened_at.desc())
            .all()
        )

    packets = [generate_packet_data(db, imp) for imp in impairments]

    closed_statuses = {"closed", "closed_incomplete"}
    closed_count = sum(1 for i in impairments if i.status in closed_statuses)
    open_count = sum(1 for i in impairments if i.status not in closed_statuses)
    incomplete_count = sum(1 for i in impairments if i.status == "closed_incomplete")

    total_duration = sum(p["duration_hours"] for p in packets if p["duration_hours"] > 0)
    avg_duration = round(total_duration / len(packets), 2) if packets else 0

    compliant_count = sum(1 for p in packets if p["all_compliant"])
    compliance_rate = round(compliant_count / len(packets), 2) if packets else 1.0

    jur = prop.jurisdiction

    return {
        "property": {
            "name": prop.name,
            "address": prop.address,
            "owner_entity": prop.owner_entity,
            "property_manager": prop.property_manager,
            "carrier_name": prop.carrier_name,
            "carrier_account": prop.carrier_account,
        },
        "jurisdiction": {
            "name": jur.name,
            "nfpa25_edition": jur.nfpa25_edition,
            "local_code_ref": jur.local_code_ref,
            "ahj_contact_name": jur.ahj_contact_name,
            "ahj_contact_phone": jur.ahj_contact_phone,
            "ahj_contact_email": jur.ahj_contact_email,
        },
        "date_range": {
            "start": start.strftime("%Y-%m-%d"),
            "end": end.strftime("%Y-%m-%d"),
        },
        "summary": {
            "total_impairments": len(impairments),
            "closed": closed_count,
            "open": open_count,
            "closed_incomplete": incomplete_count,
            "avg_duration_hours": avg_duration,
            "compliance_rate": compliance_rate,
        },
        "impairments": [{"packet": p} for p in packets],
    }
