from app.core.timestamp_service import TimestampService
from app.services.impairment_service import load_impairment
from state_machine import ImpairmentStateMachine


def generate_packet_data(db, imp):
    """Generate the full packet data dict for a given impairment ORM object."""
    jur = imp.system.property.jurisdiction
    prop = imp.system.property
    sm = ImpairmentStateMachine(imp, jur)

    duration_hours = sm._duration_hours()
    violations = sm.get_compliance_violations()

    compliance_items = []

    if jur.ahj_notification_required:
        threshold_text = (
            "all impairments" if jur.notification_threshold_hours == 0
            else f"impairments > {jur.notification_threshold_hours}h"
        )
        compliance_items.append({
            "label": f"AHJ Notification ({jur.local_code_ref or 'jurisdiction rules'})",
            "required": True,
            "condition": threshold_text,
            "status": "complete" if imp.ahj_notified else "missing",
            "detail": (
                f"Notified {imp.ahj_notification_method} at "
                f"{imp.ahj_notified_at.strftime('%H:%M') if imp.ahj_notified_at else 'N/A'}. "
                f"Ref: {imp.ahj_notification_ref or 'N/A'}"
                if imp.ahj_notified else "NOT NOTIFIED"
            ),
        })
    else:
        compliance_items.append({
            "label": "AHJ Notification",
            "required": False,
            "condition": f"Not required (under {jur.notification_threshold_hours}h threshold)",
            "status": "not_required",
            "detail": "Impairment duration below notification threshold",
        })

    if jur.fire_watch_required:
        fw_complete = imp.fire_watch_started_at and imp.fire_watch_ended_at
        compliance_items.append({
            "label": "Fire Watch (NFPA 25 §15.5.1)",
            "required": True,
            "condition": "all impairments",
            "status": "complete" if fw_complete else ("partial" if imp.fire_watch_started_at else "missing"),
            "detail": (
                f"{imp.fire_watch_assigned_to} ({imp.fire_watch_organization or 'N/A'}) "
                f"{imp.fire_watch_started_at.strftime('%H:%M') if imp.fire_watch_started_at else '?'}"
                f"–{imp.fire_watch_ended_at.strftime('%H:%M') if imp.fire_watch_ended_at else 'ONGOING'}"
            ),
        })

    drain_required = jur.main_drain_on_restore and duration_hours > 4
    compliance_items.append({
        "label": "Main Drain Test (NFPA 25 §13.2.5)",
        "required": drain_required,
        "condition": "impairments > 4 hours",
        "status": (
            "complete" if imp.main_drain_test_performed else
            ("not_required" if not drain_required else "missing")
        ),
        "detail": (
            f"Static: {imp.main_drain_psi_static} PSI | "
            f"Residual: {imp.main_drain_psi_residual} PSI | "
            f"{'PASS' if imp.main_drain_test_pass else 'FAIL'}"
            if imp.main_drain_test_performed
            else ("Duration < 4h — not required" if not drain_required else "NOT PERFORMED")
        ),
    })

    compliance_items.append({
        "label": "Supervisor Sign-off",
        "required": True,
        "condition": "all impairments",
        "status": "complete" if imp.closed_by else "missing",
        "detail": imp.closed_by or "NOT SIGNED",
    })

    hours = int(duration_hours)
    mins = int((duration_hours - hours) * 60)

    return {
        "impairment_number": f"IMP-{imp.opened_at.year}-{imp.id:04d}",
        "generated_at": TimestampService.now_utc().isoformat(),
        "status": imp.status,
        "property": {
            "name": prop.name,
            "address": prop.address,
            "owner_entity": prop.owner_entity,
            "property_manager": prop.property_manager,
            "carrier_name": prop.carrier_name,
            "carrier_account": prop.carrier_account,
        },
        "system": {
            "type": imp.system.system_type,
            "zone": imp.system.zone,
            "description": imp.system.description,
        },
        "jurisdiction": {
            "name": jur.name,
            "nfpa25_edition": jur.nfpa25_edition,
            "local_code_ref": jur.local_code_ref,
            "ahj_contact": jur.ahj_contact_name,
        },
        "timeline": {
            "opened_at": imp.opened_at.isoformat(),
            "opened_by": imp.opened_by,
            "reason": imp.reason,
            "ahj_notified_at": imp.ahj_notified_at.isoformat() if imp.ahj_notified_at else None,
            "fire_watch_started_at": imp.fire_watch_started_at.isoformat() if imp.fire_watch_started_at else None,
            "fire_watch_ended_at": imp.fire_watch_ended_at.isoformat() if imp.fire_watch_ended_at else None,
            "restored_at": imp.restored_at.isoformat() if imp.restored_at else None,
            "closed_at": imp.closed_at.isoformat() if imp.closed_at else None,
        },
        "duration_str": f"{hours}h {mins}m",
        "duration_hours": round(duration_hours, 2),
        "compliance_items": compliance_items,
        "compliance_violations": violations,
        "all_compliant": len(violations) == 0,
        "events": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "performed_by": e.performed_by,
                "performed_at": e.performed_at.isoformat(),
                "notes": e.notes,
                "from_status": e.from_status,
                "to_status": e.to_status,
            }
            for e in sorted(imp.events, key=lambda x: x.performed_at)
        ],
        "impairment": {
            "id": imp.id,
            "ahj_notified": imp.ahj_notified,
            "ahj_notification_method": imp.ahj_notification_method,
            "ahj_notification_ref": imp.ahj_notification_ref,
            "fire_watch_assigned_to": imp.fire_watch_assigned_to,
            "fire_watch_organization": imp.fire_watch_organization,
            "fire_watch_hours_computed": imp.fire_watch_hours_computed,
            "restored_by": imp.restored_by,
            "restoration_notes": imp.restoration_notes,
            "main_drain_test_performed": imp.main_drain_test_performed,
            "main_drain_psi_static": imp.main_drain_psi_static,
            "main_drain_psi_residual": imp.main_drain_psi_residual,
            "main_drain_psi_differential": imp.main_drain_psi_differential,
            "main_drain_test_pass": imp.main_drain_test_pass,
            "closed_by": imp.closed_by,
            "closure_notes": imp.closure_notes,
        },
    }
