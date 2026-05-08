from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class JurisdictionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    state: str
    nfpa25_edition: str
    ahj_notification_required: bool
    notification_threshold_hours: float
    fire_watch_required: bool
    main_drain_on_restore: bool
    ahj_contact_name: Optional[str]
    ahj_contact_phone: Optional[str]
    ahj_contact_email: Optional[str]
    local_code_ref: Optional[str]
    timezone: Optional[str] = "America/New_York"


class PropertyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    address: str
    jurisdiction_id: int
    owner_name: Optional[str]
    owner_entity: Optional[str]
    property_manager: Optional[str]
    carrier_name: Optional[str]
    jurisdiction: JurisdictionOut


class SystemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    property_id: int
    system_type: str
    zone: Optional[str]
    description: Optional[str]
    property: PropertyOut


class ImpairmentEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    impairment_id: int
    event_type: str
    from_status: Optional[str]
    to_status: Optional[str]
    performed_by: str
    performed_at: datetime
    notes: Optional[str]
    metadata_json: Optional[str]


class ImpairmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    system_id: int
    status: str
    reason: str
    opened_at: datetime
    opened_by: str
    estimated_duration_hours: Optional[float]
    gps_lat: Optional[float]
    gps_lon: Optional[float]
    ahj_notified: bool
    ahj_notified_at: Optional[datetime]
    ahj_notification_method: Optional[str]
    ahj_notification_ref: Optional[str]
    ahj_notification_required: Optional[bool]
    fire_watch_assigned_to: Optional[str]
    fire_watch_organization: Optional[str]
    fire_watch_started_at: Optional[datetime]
    fire_watch_ended_at: Optional[datetime]
    fire_watch_hours_computed: Optional[float]
    restored_at: Optional[datetime]
    restored_by: Optional[str]
    restoration_notes: Optional[str]
    main_drain_test_performed: bool
    main_drain_psi_static: Optional[float]
    main_drain_psi_residual: Optional[float]
    main_drain_psi_differential: Optional[float]
    main_drain_test_pass: Optional[bool]
    closed_at: Optional[datetime]
    closed_by: Optional[str]
    closure_notes: Optional[str]
    created_at: datetime
    system: SystemOut
    events: List[ImpairmentEventOut] = []


# Request bodies

class CreateImpairmentRequest(BaseModel):
    system_id: int
    reason: str
    opened_by: str
    estimated_duration_hours: Optional[float] = None
    gps_lat: Optional[float] = None
    gps_lon: Optional[float] = None
    opened_at: Optional[datetime] = None


class NotifyAHJRequest(BaseModel):
    method: str  # phone, email, portal, in_person
    ref: Optional[str] = None
    notified_by: str
    notified_at: Optional[datetime] = None


class FireWatchRequest(BaseModel):
    assigned_to: str
    organization: Optional[str] = None
    started_at: Optional[datetime] = None
    performed_by: str


class FireWatchEndRequest(BaseModel):
    ended_at: Optional[datetime] = None
    performed_by: str


class RestoreRequest(BaseModel):
    restored_by: str
    restoration_notes: Optional[str] = None
    restored_at: Optional[datetime] = None


class TestRequest(BaseModel):
    psi_static: float
    psi_residual: float
    performed_by: str
    pass_result: Optional[bool] = None


class CloseRequest(BaseModel):
    closed_by: str
    closure_notes: Optional[str] = None


class AddNoteRequest(BaseModel):
    note: str
    performed_by: str


class ComplianceAlert(BaseModel):
    impairment_id: int
    property_name: str
    system_description: str
    alert_type: str
    message: str
    severity: str  # "error" | "warning"


class DashboardResponse(BaseModel):
    active_impairments: List[ImpairmentOut]
    recently_closed: List[ImpairmentOut]
    compliance_alerts: List[ComplianceAlert]
