from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from database import get_db
from schemas import JurisdictionOut
from app.models import Jurisdiction, Property, Impairment, Deficiency
from state_machine import ImpairmentStateMachine

router = APIRouter()


@router.get("/properties/overview")
def property_overview(db: Session = Depends(get_db)):
    """Portfolio-level compliance status for all properties."""
    props = (
        db.query(Property)
        .options(joinedload(Property.jurisdiction), joinedload(Property.systems))
        .all()
    )
    cutoff_90d = datetime.now() - timedelta(days=90)
    result = []

    for p in props:
        system_ids = [s.id for s in p.systems]
        active_imps = []
        recent_imps = []
        last_imp_date = None

        if system_ids:
            active_imps = (
                db.query(Impairment)
                .filter(
                    Impairment.system_id.in_(system_ids),
                    Impairment.status.notin_(["closed", "closed_incomplete"]),
                )
                .all()
            )
            recent_imps = (
                db.query(Impairment)
                .filter(
                    Impairment.system_id.in_(system_ids),
                    Impairment.opened_at >= cutoff_90d,
                )
                .all()
            )
            latest = (
                db.query(Impairment)
                .filter(Impairment.system_id.in_(system_ids))
                .order_by(Impairment.opened_at.desc())
                .first()
            )
            last_imp_date = latest.opened_at.isoformat() if latest else None

        violation_count = 0
        has_violations = False
        jur = p.jurisdiction
        for imp in active_imps:
            sm = ImpairmentStateMachine(imp, jur)
            v = sm.get_compliance_violations()
            if v:
                has_violations = True
                violation_count += len(v)

        if has_violations:
            compliance_status = "red"
        elif active_imps:
            compliance_status = "amber"
        else:
            compliance_status = "green"

        result.append({
            "id": p.id,
            "name": p.name,
            "address": p.address,
            "jurisdiction_name": jur.name,
            "nfpa25_edition": jur.nfpa25_edition,
            "compliance_status": compliance_status,
            "active_impairments_count": len(active_imps),
            "open_deficiencies_count": db.query(Deficiency).filter(
                Deficiency.property_id == p.id,
                Deficiency.status != "resolved",
            ).count(),
            "violation_count": violation_count,
            "total_impairments_90d": len(recent_imps),
            "last_impairment_date": last_imp_date,
        })

    order = {"red": 0, "amber": 1, "green": 2}
    result.sort(key=lambda x: order.get(x["compliance_status"], 3))
    return result


@router.get("/jurisdictions", response_model=List[JurisdictionOut])
def list_jurisdictions(db: Session = Depends(get_db)):
    return db.query(Jurisdiction).all()


@router.get("/properties")
def list_properties(db: Session = Depends(get_db)):
    props = (
        db.query(Property)
        .options(joinedload(Property.jurisdiction), joinedload(Property.systems))
        .all()
    )
    result = []
    for p in props:
        result.append({
            "id": p.id,
            "name": p.name,
            "address": p.address,
            "jurisdiction_id": p.jurisdiction_id,
            "jurisdiction": {
                "id": p.jurisdiction.id,
                "name": p.jurisdiction.name,
                "state": p.jurisdiction.state,
                "nfpa25_edition": p.jurisdiction.nfpa25_edition,
                "ahj_notification_required": p.jurisdiction.ahj_notification_required,
                "notification_threshold_hours": p.jurisdiction.notification_threshold_hours,
                "fire_watch_required": p.jurisdiction.fire_watch_required,
                "main_drain_on_restore": p.jurisdiction.main_drain_on_restore,
                "ahj_contact_name": p.jurisdiction.ahj_contact_name,
                "ahj_contact_phone": p.jurisdiction.ahj_contact_phone,
                "ahj_contact_email": p.jurisdiction.ahj_contact_email,
                "local_code_ref": p.jurisdiction.local_code_ref,
            },
            "owner_entity": p.owner_entity,
            "property_manager": p.property_manager,
            "carrier_name": p.carrier_name,
            "systems": [
                {
                    "id": s.id,
                    "system_type": s.system_type,
                    "zone": s.zone,
                    "description": s.description,
                }
                for s in p.systems
            ],
        })
    return result
