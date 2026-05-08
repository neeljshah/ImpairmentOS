from typing import List

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models import Impairment, System, Property, Jurisdiction
from state_machine import ImpairmentStateMachine


def load_impairment(db: Session, impairment_id: int) -> Impairment:
    imp = (
        db.query(Impairment)
        .options(
            joinedload(Impairment.system)
            .joinedload(System.property)
            .joinedload(Property.jurisdiction),
            joinedload(Impairment.events),
        )
        .filter(Impairment.id == impairment_id)
        .first()
    )
    if not imp:
        raise HTTPException(status_code=404, detail="Impairment not found")
    return imp


def get_compliance_alerts(db: Session) -> list:
    from schemas import ComplianceAlert

    alerts = []
    active = (
        db.query(Impairment)
        .options(
            joinedload(Impairment.system)
            .joinedload(System.property)
            .joinedload(Property.jurisdiction)
        )
        .filter(Impairment.status.notin_(["closed", "closed_incomplete"]))
        .all()
    )
    for imp in active:
        jur = imp.system.property.jurisdiction
        sm = ImpairmentStateMachine(imp, jur)
        violations = sm.get_compliance_violations()
        sys_desc = f"{imp.system.property.name} — {imp.system.zone or imp.system.system_type}"
        for v in violations:
            alerts.append(
                ComplianceAlert(
                    impairment_id=imp.id,
                    property_name=imp.system.property.name,
                    system_description=sys_desc,
                    alert_type=v["type"],
                    message=v["message"],
                    severity=v["severity"],
                )
            )
    return alerts
