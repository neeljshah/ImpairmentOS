import json
from datetime import datetime
from sqlalchemy.orm import Session

from app.models import ImpairmentEvent
from app.core.timestamp_service import TimestampService


def record_event(
    db: Session,
    impairment_id: int,
    event_type: str,
    performed_by: str,
    from_status: str = None,
    to_status: str = None,
    notes: str = None,
    metadata: dict = None,
    performed_at: datetime = None,
) -> None:
    event = ImpairmentEvent(
        impairment_id=impairment_id,
        event_type=event_type,
        from_status=from_status,
        to_status=to_status,
        performed_by=performed_by,
        performed_at=performed_at or TimestampService.now_utc(),
        notes=notes,
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    db.add(event)
