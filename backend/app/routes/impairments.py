from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
from schemas import (
    ImpairmentOut,
    CreateImpairmentRequest,
    NotifyAHJRequest,
    FireWatchRequest,
    FireWatchEndRequest,
    RestoreRequest,
    TestRequest,
    CloseRequest,
    AddNoteRequest,
)
from app.models import Impairment, System, Property
from app.core.timestamp_service import TimestampService
from app.core.exceptions import InvalidTransitionError, ComplianceViolationError
from app.state.middleware import TransitionMiddleware
from app.services.impairment_service import load_impairment
from app.services.event_service import record_event
from state_machine import ImpairmentStateMachine

router = APIRouter(prefix="/impairments")


@router.post("", response_model=ImpairmentOut)
def create_impairment(req: CreateImpairmentRequest, db: Session = Depends(get_db)):
    system = (
        db.query(System)
        .options(joinedload(System.property).joinedload(Property.jurisdiction))
        .filter(System.id == req.system_id)
        .first()
    )
    if not system:
        raise HTTPException(status_code=404, detail="System not found")

    jur = system.property.jurisdiction
    opened_at = req.opened_at or TimestampService.now_utc()

    imp = Impairment(
        system_id=req.system_id,
        status="open",
        reason=req.reason,
        opened_at=opened_at,
        opened_by=req.opened_by,
        estimated_duration_hours=req.estimated_duration_hours,
        gps_lat=req.gps_lat,
        gps_lon=req.gps_lon,
        ahj_notification_required=jur.ahj_notification_required,
        ahj_notified=False,
        main_drain_test_performed=False,
    )
    db.add(imp)
    db.flush()

    record_event(
        db, imp.id, "created",
        performed_by=req.opened_by,
        from_status=None,
        to_status="open",
        notes=f"Impairment opened. Reason: {req.reason}",
        metadata={"gps_lat": req.gps_lat, "gps_lon": req.gps_lon},
        performed_at=opened_at,
    )
    db.commit()

    return load_impairment(db, imp.id)


@router.get("", response_model=List[ImpairmentOut])
def list_impairments(db: Session = Depends(get_db)):
    return (
        db.query(Impairment)
        .options(
            joinedload(Impairment.system)
            .joinedload(System.property)
            .joinedload(Property.jurisdiction),
            joinedload(Impairment.events),
        )
        .order_by(Impairment.opened_at.desc())
        .all()
    )


@router.get("/{impairment_id}", response_model=ImpairmentOut)
def get_impairment(impairment_id: int, db: Session = Depends(get_db)):
    return load_impairment(db, impairment_id)


@router.post("/{impairment_id}/notify-ahj", response_model=ImpairmentOut)
def notify_ahj(
    impairment_id: int,
    req: NotifyAHJRequest,
    db: Session = Depends(get_db),
):
    imp = load_impairment(db, impairment_id)
    if imp.status in ("closed", "closed_incomplete"):
        raise HTTPException(status_code=400, detail="Impairment is already closed")

    notified_at = req.notified_at or TimestampService.now_utc()

    imp.ahj_notified = True
    imp.ahj_notified_at = notified_at
    imp.ahj_notification_method = req.method
    imp.ahj_notification_ref = req.ref
    imp.updated_at = TimestampService.now_utc()

    record_event(
        db, imp.id, "ahj_notified",
        performed_by=req.notified_by,
        from_status=imp.status,
        to_status=imp.status,
        notes=f"AHJ notified via {req.method}. Ref: {req.ref or 'N/A'}",
        performed_at=notified_at,
    )
    db.commit()

    return load_impairment(db, impairment_id)


@router.post("/{impairment_id}/fire-watch", response_model=ImpairmentOut)
def start_fire_watch(
    impairment_id: int,
    req: FireWatchRequest,
    db: Session = Depends(get_db),
):
    imp = load_impairment(db, impairment_id)
    if imp.status in ("closed", "closed_incomplete"):
        raise HTTPException(status_code=400, detail="Impairment is already closed")

    jur = imp.system.property.jurisdiction
    sm = ImpairmentStateMachine(imp, jur)

    started_at = req.started_at or TimestampService.now_utc()
    prev_status = imp.status

    imp.fire_watch_assigned_to = req.assigned_to
    imp.fire_watch_organization = req.organization
    imp.fire_watch_started_at = started_at
    imp.updated_at = TimestampService.now_utc()

    if imp.status == "open":
        try:
            new_state = TransitionMiddleware.execute_transition(sm, "start_fire_watch")
            imp.status = new_state
        except (InvalidTransitionError, ComplianceViolationError) as exc:
            raise HTTPException(status_code=422, detail=str(exc))

    record_event(
        db, imp.id, "fire_watch_started",
        performed_by=req.performed_by,
        from_status=prev_status,
        to_status=imp.status,
        notes=f"Fire watch assigned to {req.assigned_to} ({req.organization or 'N/A'})",
        performed_at=started_at,
    )
    db.commit()

    return load_impairment(db, impairment_id)


@router.post("/{impairment_id}/fire-watch/end", response_model=ImpairmentOut)
def end_fire_watch(
    impairment_id: int,
    req: FireWatchEndRequest,
    db: Session = Depends(get_db),
):
    imp = load_impairment(db, impairment_id)
    if imp.status in ("closed", "closed_incomplete"):
        raise HTTPException(status_code=400, detail="Impairment is already closed")

    ended_at = req.ended_at or TimestampService.now_utc()
    imp.fire_watch_ended_at = ended_at

    if imp.fire_watch_started_at:
        imp.fire_watch_hours_computed = TimestampService.duration_hours(
            imp.fire_watch_started_at, ended_at
        )

    imp.updated_at = TimestampService.now_utc()

    record_event(
        db, imp.id, "fire_watch_ended",
        performed_by=req.performed_by,
        from_status=imp.status,
        to_status=imp.status,
        notes=f"Fire watch ended. Hours: {imp.fire_watch_hours_computed:.2f}" if imp.fire_watch_hours_computed is not None else "Fire watch ended.",
        performed_at=ended_at,
    )
    db.commit()

    return load_impairment(db, impairment_id)


@router.post("/{impairment_id}/restore", response_model=ImpairmentOut)
def restore_impairment(
    impairment_id: int,
    req: RestoreRequest,
    db: Session = Depends(get_db),
):
    imp = load_impairment(db, impairment_id)
    if imp.status in ("closed", "closed_incomplete"):
        raise HTTPException(status_code=400, detail="Impairment is already closed")

    jur = imp.system.property.jurisdiction
    sm = ImpairmentStateMachine(imp, jur)

    restored_at = req.restored_at or TimestampService.now_utc()
    prev_status = imp.status

    imp.restored_at = restored_at
    imp.restored_by = req.restored_by
    imp.restoration_notes = req.restoration_notes
    imp.updated_at = TimestampService.now_utc()

    try:
        if imp.status in ("open", "fire_watch_active"):
            imp.status = TransitionMiddleware.execute_transition(sm, "begin_repair")
        if imp.status == "repair_in_progress":
            imp.status = TransitionMiddleware.execute_transition(sm, "begin_restoration_test")
        elif imp.status not in ("restoration_testing", "pending_closure"):
            raise HTTPException(
                status_code=422,
                detail=f"Cannot restore from state '{imp.status}'",
            )
    except (InvalidTransitionError, ComplianceViolationError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    record_event(
        db, imp.id, "repair_completed",
        performed_by=req.restored_by,
        from_status=prev_status,
        to_status=imp.status,
        notes=f"System restored. {req.restoration_notes or ''}",
        performed_at=restored_at,
    )
    db.commit()

    return load_impairment(db, impairment_id)


@router.post("/{impairment_id}/test", response_model=ImpairmentOut)
def record_test(
    impairment_id: int,
    req: TestRequest,
    db: Session = Depends(get_db),
):
    imp = load_impairment(db, impairment_id)
    if imp.status in ("closed", "closed_incomplete"):
        raise HTTPException(status_code=400, detail="Impairment is already closed")

    diff = req.psi_static - req.psi_residual
    pass_result = req.pass_result if req.pass_result is not None else diff <= 10

    imp.main_drain_test_performed = True
    imp.main_drain_psi_static = req.psi_static
    imp.main_drain_psi_residual = req.psi_residual
    imp.main_drain_psi_differential = diff
    imp.main_drain_test_pass = pass_result
    imp.updated_at = TimestampService.now_utc()

    record_event(
        db, imp.id, "restoration_test_recorded",
        performed_by=req.performed_by,
        from_status=imp.status,
        to_status=imp.status,
        notes=(
            f"Main drain test. Static: {req.psi_static} PSI, "
            f"Residual: {req.psi_residual} PSI, "
            f"Diff: {diff:.1f} PSI. Result: {'PASS' if pass_result else 'FAIL'}"
        ),
    )
    db.commit()

    return load_impairment(db, impairment_id)


@router.post("/{impairment_id}/close", response_model=ImpairmentOut)
def close_impairment(
    impairment_id: int,
    req: CloseRequest,
    db: Session = Depends(get_db),
):
    imp = load_impairment(db, impairment_id)
    if imp.status in ("closed", "closed_incomplete"):
        raise HTTPException(status_code=400, detail="Impairment is already closed")

    jur = imp.system.property.jurisdiction
    sm = ImpairmentStateMachine(imp, jur)

    prev_status = imp.status

    try:
        if imp.status == "restoration_testing":
            imp.status = TransitionMiddleware.execute_transition(sm, "mark_pending_closure")
        if imp.status == "pending_closure":
            imp.status = TransitionMiddleware.execute_transition(sm, "close_impairment")
        elif imp.status != "closed":
            violations = sm.get_compliance_violations()
            blocking = [v for v in violations if v["blocks_closure"]]
            if blocking:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "error": "Cannot close impairment — compliance requirements not met",
                        "violations": [v["message"] for v in blocking],
                    },
                )
            imp.status = "closed"
    except (InvalidTransitionError, ComplianceViolationError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Cannot close impairment — compliance requirements not met",
                "violations": [str(exc)],
            },
        )
    imp.closed_at = TimestampService.now_utc()
    imp.closed_by = req.closed_by
    imp.closure_notes = req.closure_notes
    imp.updated_at = TimestampService.now_utc()

    record_event(
        db, imp.id, "closed",
        performed_by=req.closed_by,
        from_status=prev_status,
        to_status="closed",
        notes=f"Impairment closed. {req.closure_notes or ''}",
    )
    db.commit()

    return load_impairment(db, impairment_id)


@router.post("/{impairment_id}/note", response_model=ImpairmentOut)
def add_note(
    impairment_id: int,
    req: AddNoteRequest,
    db: Session = Depends(get_db),
):
    imp = load_impairment(db, impairment_id)
    if imp.status in ("closed", "closed_incomplete"):
        raise HTTPException(status_code=400, detail="Impairment is already closed")

    record_event(
        db, imp.id, "note_added",
        performed_by=req.performed_by,
        from_status=imp.status,
        to_status=imp.status,
        notes=req.note,
    )
    db.commit()

    return load_impairment(db, impairment_id)


@router.get("/{impairment_id}/compliance")
def get_compliance(impairment_id: int, db: Session = Depends(get_db)):
    imp = load_impairment(db, impairment_id)
    jur = imp.system.property.jurisdiction
    sm = ImpairmentStateMachine(imp, jur)
    violations = sm.get_compliance_violations()
    duration = sm._duration_hours()

    return {
        "impairment_id": impairment_id,
        "jurisdiction": jur.name,
        "nfpa25_edition": jur.nfpa25_edition,
        "local_code_ref": jur.local_code_ref,
        "duration_hours": round(duration, 2),
        "violations": violations,
        "can_close": len([v for v in violations if v["blocks_closure"]]) == 0,
        "checks": {
            "ahj_notification_required": jur.ahj_notification_required,
            "ahj_notification_threshold_hours": jur.notification_threshold_hours,
            "ahj_notified": imp.ahj_notified,
            "fire_watch_required": jur.fire_watch_required,
            "fire_watch_started": imp.fire_watch_started_at is not None,
            "fire_watch_ended": imp.fire_watch_ended_at is not None,
            "main_drain_required_if_over_4h": jur.main_drain_on_restore,
            "main_drain_test_performed": imp.main_drain_test_performed,
        },
    }
