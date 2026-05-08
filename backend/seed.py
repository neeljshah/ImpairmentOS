"""
Seed the database with Hartwell scenario data and a clean Wessex comparison.
Runs on startup only when the DB is empty.
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import (
    Jurisdiction, Property, System, Impairment,
    ImpairmentEvent, ComplianceRule, Deficiency,
)


def seed_db(db: Session):
    if db.query(Jurisdiction).count() > 0:
        return  # Already seeded

    # ── Jurisdictions ────────────────────────────────────────────

    hartwell = Jurisdiction(
        name="City of Hartwell",
        state="MA",
        nfpa25_edition="2017",
        ahj_notification_required=True,
        notification_threshold_hours=0,   # ALL impairments require notification
        fire_watch_required=True,
        main_drain_on_restore=True,
        ahj_contact_name="Marshal Elena Reyes",
        ahj_contact_phone="(508) 555-0147",
        ahj_contact_email="ereyes@hartwellfire.gov",
        local_code_ref="Hartwell Fire Code §17-4.7",
        timezone="America/New_York",
        notes="Replaced Marshal Donnelly in 2024. Enforcement-heavy approach.",
    )
    wessex = Jurisdiction(
        name="City of Wessex",
        state="MA",
        nfpa25_edition="2014",
        ahj_notification_required=True,
        notification_threshold_hours=4,   # Only notify if > 4 hours
        fire_watch_required=True,
        main_drain_on_restore=True,
        ahj_contact_name="Capt. James Whitfield",
        ahj_contact_phone="(617) 555-0233",
        ahj_contact_email="jwhitfield@wessexfire.gov",
        local_code_ref="Wessex Fire Code §12-3.2",
        timezone="America/New_York",
        notes="4-hour notification threshold. More lenient enforcement.",
    )
    dunmoor = Jurisdiction(
        name="Town of Dunmoor",
        state="MA",
        nfpa25_edition="2020",
        ahj_notification_required=True,
        notification_threshold_hours=0,   # ALL impairments require notification
        fire_watch_required=True,
        main_drain_on_restore=True,
        ahj_contact_name="Chief Patricia Okafor",
        ahj_contact_phone="(978) 555-0088",
        ahj_contact_email="pokafor@dunmoorfire.gov",
        local_code_ref="Dunmoor Fire Prevention Ordinance §8-5.1",
        timezone="America/New_York",
        notes="Adopted NFPA 25-2020. Strict documentation requirements.",
    )
    db.add_all([hartwell, wessex, dunmoor])
    db.flush()

    # ── Compliance Rules ─────────────────────────────────────────

    rules = [
        ComplianceRule(
            jurisdiction_id=hartwell.id,
            rule_code="HFC-17-4.7",
            rule_source="Hartwell Fire Code",
            description="All impairments must be reported to the AHJ immediately upon discovery.",
            trigger_event="impairment_opened",
            trigger_condition="always",
            required_action="ahj_notification",
            deadline_hours=0,
            blocks_transition_to="closed",
            severity="required",
        ),
        ComplianceRule(
            jurisdiction_id=hartwell.id,
            rule_code="NFPA25-15.5.2",
            rule_source="NFPA 25 (2017)",
            description="A fire watch shall be implemented immediately upon system impairment.",
            trigger_event="impairment_opened",
            trigger_condition="always",
            required_action="fire_watch",
            deadline_hours=0,
            blocks_transition_to="closed",
            severity="required",
        ),
        ComplianceRule(
            jurisdiction_id=hartwell.id,
            rule_code="NFPA25-13.2.5",
            rule_source="NFPA 25 (2017)",
            description="Main drain test required following restoration of impairment exceeding 4 hours.",
            trigger_event="system_restored",
            trigger_condition="duration_hours > 4",
            required_action="main_drain_test",
            deadline_hours=1,
            blocks_transition_to="closed",
            severity="required",
        ),
        ComplianceRule(
            jurisdiction_id=wessex.id,
            rule_code="WFC-12-3.2",
            rule_source="Wessex Fire Code",
            description="AHJ notification required for impairments exceeding 4 hours.",
            trigger_event="impairment_opened",
            trigger_condition="duration_hours > 4",
            required_action="ahj_notification",
            deadline_hours=4,
            blocks_transition_to="closed",
            severity="required",
        ),
        ComplianceRule(
            jurisdiction_id=wessex.id,
            rule_code="NFPA25-13.2.5",
            rule_source="NFPA 25 (2014)",
            description="Main drain test required following restoration of impairment exceeding 4 hours.",
            trigger_event="system_restored",
            trigger_condition="duration_hours > 4",
            required_action="main_drain_test",
            deadline_hours=1,
            blocks_transition_to="closed",
            severity="required",
        ),
        ComplianceRule(
            jurisdiction_id=dunmoor.id,
            rule_code="DFPO-8-5.1",
            rule_source="Dunmoor Fire Prevention Ordinance",
            description="All impairments must be reported to the AHJ within 30 minutes.",
            trigger_event="impairment_opened",
            trigger_condition="always",
            required_action="ahj_notification",
            deadline_hours=0.5,
            blocks_transition_to="closed",
            severity="required",
        ),
    ]
    db.add_all(rules)
    db.flush()

    # ── Properties ───────────────────────────────────────────────

    cedar_heights = Property(
        name="Cedar Heights Apartments",
        address="1411 Cedar Avenue, Hartwell, MA 01801",
        jurisdiction_id=hartwell.id,
        owner_name="Dominic Vance",
        owner_entity="Halberd Realty Holdings LLC",
        property_manager="Steeplechase Property Management",
        pm_contact_name="Sarah Okonkwo",
        pm_contact_email="sokonkwo@steeplechase-pm.com",
        carrier_name="Continental Mutual Insurance",
        carrier_account="CM-2024-FP-00892",
    )
    wessex_office = Property(
        name="Wessex Office Park — Building B",
        address="200 Meridian Drive, Wessex, MA 02134",
        jurisdiction_id=wessex.id,
        owner_name="Westgate Properties LLC",
        owner_entity="Westgate Properties LLC",
        property_manager="Apex Facility Services",
        pm_contact_name="Tom Harding",
        pm_contact_email="tharding@apexfacility.com",
        carrier_name="Harbor Shield Insurance",
        carrier_account="HS-2024-FP-00341",
    )
    dunmoor_medical = Property(
        name="Dunmoor Medical Plaza",
        address="45 Garrison Road, Dunmoor, MA 01956",
        jurisdiction_id=dunmoor.id,
        owner_name="Garrison Health Properties LLC",
        owner_entity="Garrison Health Properties LLC",
        property_manager="MedFacilities Group",
        pm_contact_name="Angela Torres",
        pm_contact_email="atorres@medfacilities.com",
        carrier_name="National Fire & Casualty",
        carrier_account="NFC-2024-FP-00517",
    )
    hartwell_commons = Property(
        name="Hartwell Commons Shopping Center",
        address="700 Main Street, Hartwell, MA 01801",
        jurisdiction_id=hartwell.id,
        owner_name="Hartwell Retail Partners LLC",
        owner_entity="Hartwell Retail Partners LLC",
        property_manager="Summit Property Group",
        pm_contact_name="Greg Sullivan",
        pm_contact_email="gsullivan@summitpg.com",
        carrier_name="Continental Mutual Insurance",
        carrier_account="CM-2024-FP-01134",
    )
    db.add_all([cedar_heights, wessex_office, dunmoor_medical, hartwell_commons])
    db.flush()

    # ── Systems ──────────────────────────────────────────────────

    # Cedar Heights systems
    wet_sprinkler_9th = System(
        property_id=cedar_heights.id,
        system_type="wet_sprinkler",
        zone="9th Floor Zone",
        description="Wet pipe sprinkler system serving 9th floor residential units",
        install_year=2008,
        last_annual_test_date=datetime(2025, 3, 15).date(),
    )
    fire_pump = System(
        property_id=cedar_heights.id,
        system_type="fire_pump",
        zone="Basement",
        description="Electric fire pump, model Aurora 410A",
        install_year=2008,
    )
    standpipe = System(
        property_id=cedar_heights.id,
        system_type="standpipe",
        zone="Building-wide",
        description="Class I standpipe system with hose connections at each floor landing",
        install_year=2008,
    )
    fire_alarm = System(
        property_id=cedar_heights.id,
        system_type="fire_alarm",
        zone="Building-wide",
        description="Addressable fire alarm system with pull stations and smoke detectors",
        install_year=2010,
    )

    # Wessex Office Park system
    wessex_sprinkler = System(
        property_id=wessex_office.id,
        system_type="wet_sprinkler",
        zone="Riser — East Wing",
        description="Wet pipe sprinkler system serving east wing floors 1-4",
        install_year=2012,
        last_annual_test_date=datetime(2025, 11, 20).date(),
    )

    # Dunmoor Medical Plaza systems
    dunmoor_dry_sprinkler = System(
        property_id=dunmoor_medical.id,
        system_type="dry_sprinkler",
        zone="North Wing — Floors 1-3",
        description="Dry pipe sprinkler system serving unheated north wing storage",
        install_year=2015,
        last_annual_test_date=datetime(2025, 9, 8).date(),
    )
    dunmoor_standpipe = System(
        property_id=dunmoor_medical.id,
        system_type="standpipe",
        zone="Stairwell A & B",
        description="Class III standpipe with hose connections at each landing",
        install_year=2015,
    )
    hartwell_commons_sprinkler = System(
        property_id=hartwell_commons.id,
        system_type="wet_sprinkler",
        zone="Food Court Wing",
        description="Wet pipe sprinkler system serving food court and retail corridors",
        install_year=2011,
        last_annual_test_date=datetime(2025, 7, 22).date(),
    )
    db.add_all([wet_sprinkler_9th, fire_pump, standpipe, fire_alarm,
                wessex_sprinkler, dunmoor_dry_sprinkler, dunmoor_standpipe,
                hartwell_commons_sprinkler])
    db.flush()

    # ── Day -116 Cedar Heights Impairment (BROKEN STATE) ─────────
    # Opened 07:40, fire watch 08:00–13:30, restored ~13:30
    # AHJ NOT notified, main drain test NOT formally recorded
    # This is the impairment from the Beacon Fire & Safety scenario

    # Anchor: "today" is 2026-05-08, Day -116 would be ~2026-01-12
    day_minus_116 = datetime(2026, 1, 12)
    opened_at = day_minus_116.replace(hour=7, minute=40)
    ahj_SHOULD_HAVE_been_notified = day_minus_116.replace(hour=7, minute=55)
    fw_start = day_minus_116.replace(hour=8, minute=0)
    fw_end = day_minus_116.replace(hour=13, minute=30)
    restored_at = day_minus_116.replace(hour=13, minute=30)

    cedar_impairment = Impairment(
        system_id=wet_sprinkler_9th.id,
        status="repair_in_progress",   # Broken state: stuck mid-workflow
        reason="Frozen pipe at vertical riser — replacing 6ft section",
        opened_at=opened_at,
        opened_by="M. DiSalvo",
        estimated_duration_hours=6.0,
        gps_lat=42.3601,
        gps_lon=-71.0589,
        # AHJ NOT notified — this is the compliance failure
        ahj_notified=False,
        ahj_notification_required=True,
        # Fire watch was assigned
        fire_watch_assigned_to="Carlos Rivera",
        fire_watch_organization="Steeplechase Property Management",
        fire_watch_started_at=fw_start,
        fire_watch_ended_at=fw_end,
        fire_watch_hours_computed=5.5,
        # System was restored but main drain test NOT formally recorded
        restored_at=restored_at,
        restored_by="M. DiSalvo",
        restoration_notes="Replaced 6ft section of vertical riser. Pressure good.",
        main_drain_test_performed=False,  # Mike says he did it, no formal record
    )
    db.add(cedar_impairment)
    db.flush()

    cedar_events = [
        ImpairmentEvent(
            impairment_id=cedar_impairment.id,
            event_type="created",
            from_status=None,
            to_status="open",
            performed_by="M. DiSalvo",
            performed_at=opened_at,
            notes="Frozen pipe discovered at vertical riser. System isolated.",
            metadata_json='{"gps_lat": 42.3601, "gps_lon": -71.0589, "device": "iPhone 14"}',
        ),
        ImpairmentEvent(
            impairment_id=cedar_impairment.id,
            event_type="fire_watch_started",
            from_status="open",
            to_status="fire_watch_active",
            performed_by="M. DiSalvo",
            performed_at=fw_start,
            notes="Fire watch assigned to Carlos Rivera, Steeplechase Property Management.",
        ),
        ImpairmentEvent(
            impairment_id=cedar_impairment.id,
            event_type="repair_started",
            from_status="fire_watch_active",
            to_status="repair_in_progress",
            performed_by="M. DiSalvo",
            performed_at=day_minus_116.replace(hour=8, minute=15),
            notes="Pipe section ordered. Repair team on-site.",
        ),
        ImpairmentEvent(
            impairment_id=cedar_impairment.id,
            event_type="repair_completed",
            from_status="repair_in_progress",
            to_status="repair_in_progress",
            performed_by="M. DiSalvo",
            performed_at=restored_at,
            notes="Replaced 6ft section of vertical riser. Pressure good. Fire watch ended.",
        ),
        ImpairmentEvent(
            impairment_id=cedar_impairment.id,
            event_type="fire_watch_ended",
            from_status="repair_in_progress",
            to_status="repair_in_progress",
            performed_by="Carlos Rivera",
            performed_at=fw_end,
            notes="Fire watch concluded. System restored.",
        ),
        ImpairmentEvent(
            impairment_id=cedar_impairment.id,
            event_type="note_added",
            from_status="repair_in_progress",
            to_status="repair_in_progress",
            performed_by="M. DiSalvo",
            performed_at=day_minus_116.replace(hour=13, minute=35),
            notes="Main drain test on restoration — pressure good. [NOTE: No formal record submitted to AHJ]",
        ),
    ]
    db.add_all(cedar_events)

    # ── Clean Completed Wessex Impairment (for comparison) ───────
    # A properly-handled 2h 15m impairment — all steps complete

    wessex_opened = datetime(2026, 3, 24, 9, 0)
    wessex_restored = wessex_opened + timedelta(hours=2, minutes=15)

    wessex_impairment = Impairment(
        system_id=wessex_sprinkler.id,
        status="closed",
        reason="Control valve repair — packing gland replacement",
        opened_at=wessex_opened,
        opened_by="T. Beacon",
        estimated_duration_hours=3.0,
        gps_lat=42.3522,
        gps_lon=-71.1284,
        # Under 4 hours, Wessex doesn't require AHJ notification
        ahj_notified=False,
        ahj_notification_required=False,  # Under 4-hour Wessex threshold
        fire_watch_assigned_to="Building Security (Apex)",
        fire_watch_organization="Apex Facility Services",
        fire_watch_started_at=wessex_opened + timedelta(minutes=10),
        fire_watch_ended_at=wessex_restored + timedelta(minutes=5),
        fire_watch_hours_computed=2.25,
        restored_at=wessex_restored,
        restored_by="T. Beacon",
        restoration_notes="Replaced packing gland on OS&Y valve. No leaks.",
        # Under 4 hours — main drain test not required
        main_drain_test_performed=False,
        closed_at=wessex_restored + timedelta(minutes=15),
        closed_by="T. Beacon",
        closure_notes="All steps complete. System fully operational.",
    )
    db.add(wessex_impairment)
    db.flush()

    wessex_events = [
        ImpairmentEvent(
            impairment_id=wessex_impairment.id,
            event_type="created",
            from_status=None,
            to_status="open",
            performed_by="T. Beacon",
            performed_at=wessex_opened,
            notes="OS&Y valve packing gland failure. Valve closed for repair.",
        ),
        ImpairmentEvent(
            impairment_id=wessex_impairment.id,
            event_type="fire_watch_started",
            from_status="open",
            to_status="fire_watch_active",
            performed_by="T. Beacon",
            performed_at=wessex_opened + timedelta(minutes=10),
            notes="Fire watch assigned to Apex building security.",
        ),
        ImpairmentEvent(
            impairment_id=wessex_impairment.id,
            event_type="repair_started",
            from_status="fire_watch_active",
            to_status="repair_in_progress",
            performed_by="T. Beacon",
            performed_at=wessex_opened + timedelta(minutes=20),
            notes="Packing gland replacement in progress.",
        ),
        ImpairmentEvent(
            impairment_id=wessex_impairment.id,
            event_type="repair_completed",
            from_status="repair_in_progress",
            to_status="restoration_testing",
            performed_by="T. Beacon",
            performed_at=wessex_restored,
            notes="Replacement complete. System pressurized.",
        ),
        ImpairmentEvent(
            impairment_id=wessex_impairment.id,
            event_type="fire_watch_ended",
            from_status="restoration_testing",
            to_status="restoration_testing",
            performed_by="T. Beacon",
            performed_at=wessex_restored + timedelta(minutes=5),
            notes="Fire watch concluded. Under 4 hours — main drain test not required.",
        ),
        ImpairmentEvent(
            impairment_id=wessex_impairment.id,
            event_type="closed",
            from_status="pending_closure",
            to_status="closed",
            performed_by="T. Beacon",
            performed_at=wessex_restored + timedelta(minutes=15),
            notes="Impairment closed. Duration 2h 15m. All steps complete.",
        ),
    ]
    db.add_all(wessex_events)

    # ── Active Dunmoor Medical Plaza Impairment ───────────────────
    # Opened today at 06:30, AHJ notified (Dunmoor requires notification
    # for all impairments within 30 min), fire watch active, repair in progress.

    dunmoor_opened = datetime(2026, 5, 8, 6, 30)
    dunmoor_fw_start = dunmoor_opened + timedelta(minutes=5)
    dunmoor_ahj_notified = dunmoor_opened + timedelta(minutes=22)

    dunmoor_impairment = Impairment(
        system_id=dunmoor_dry_sprinkler.id,
        status="fire_watch_active",
        reason="Dry pipe valve actuator failure — valve cycling unexpectedly",
        opened_at=dunmoor_opened,
        opened_by="J. Kowalski",
        estimated_duration_hours=4.0,
        gps_lat=42.5189,
        gps_lon=-70.8967,
        ahj_notified=True,
        ahj_notified_at=dunmoor_ahj_notified,
        ahj_notification_method="phone",
        ahj_notification_ref="Spoke to Chief Okafor — ref DFD-2026-0508",
        ahj_notification_required=True,
        fire_watch_assigned_to="MedFacilities Night Security",
        fire_watch_organization="MedFacilities Group",
        fire_watch_started_at=dunmoor_fw_start,
        main_drain_test_performed=False,
    )
    db.add(dunmoor_impairment)
    db.flush()

    dunmoor_events = [
        ImpairmentEvent(
            impairment_id=dunmoor_impairment.id,
            event_type="created",
            from_status=None,
            to_status="open",
            performed_by="J. Kowalski",
            performed_at=dunmoor_opened,
            notes="Dry pipe valve actuator cycling. System isolated for inspection.",
            metadata_json='{"gps_lat": 42.5189, "gps_lon": -70.8967}',
        ),
        ImpairmentEvent(
            impairment_id=dunmoor_impairment.id,
            event_type="fire_watch_started",
            from_status="open",
            to_status="fire_watch_active",
            performed_by="J. Kowalski",
            performed_at=dunmoor_fw_start,
            notes="Fire watch assigned to MedFacilities night security per DFPO §8-5.1.",
        ),
        ImpairmentEvent(
            impairment_id=dunmoor_impairment.id,
            event_type="ahj_notified",
            from_status="fire_watch_active",
            to_status="fire_watch_active",
            performed_by="J. Kowalski",
            performed_at=dunmoor_ahj_notified,
            notes="Notified Chief Okafor by phone within 30-min DFPO requirement. Ref: DFD-2026-0508.",
        ),
    ]
    db.add_all(dunmoor_events)

    # ── Hartwell Commons — Clean Closed Impairment ───────────────
    # Control valve repair, 3 hours, fully compliant — all steps done
    hc_opened = datetime(2026, 4, 15, 10, 0)
    hc_restored = hc_opened + timedelta(hours=3)

    hartwell_commons_impairment = Impairment(
        system_id=hartwell_commons_sprinkler.id,
        status="closed",
        reason="Control valve repair — actuator motor replacement",
        opened_at=hc_opened,
        opened_by="G. Sullivan",
        estimated_duration_hours=3.0,
        ahj_notified=True,
        ahj_notified_at=hc_opened + timedelta(minutes=8),
        ahj_notification_method="email",
        ahj_notification_ref="Sent to ereyes@hartwellfire.gov — ref HFD-2026-0415",
        ahj_notification_required=True,
        fire_watch_assigned_to="Summit Security Detail",
        fire_watch_organization="Summit Property Group",
        fire_watch_started_at=hc_opened + timedelta(minutes=10),
        fire_watch_ended_at=hc_restored + timedelta(minutes=5),
        fire_watch_hours_computed=3.1,
        restored_at=hc_restored,
        restored_by="G. Sullivan",
        restoration_notes="Actuator replaced. Valve confirmed operational.",
        main_drain_test_performed=False,  # Under 4 hours — not required
        closed_at=hc_restored + timedelta(minutes=20),
        closed_by="G. Sullivan",
        closure_notes="All steps complete. Under 4-hour threshold — main drain test not required.",
    )
    db.add(hartwell_commons_impairment)
    db.flush()

    hc_events = [
        ImpairmentEvent(
            impairment_id=hartwell_commons_impairment.id,
            event_type="created",
            from_status=None,
            to_status="open",
            performed_by="G. Sullivan",
            performed_at=hc_opened,
            notes="Actuator motor failure on main control valve. Valve closed for repair.",
        ),
        ImpairmentEvent(
            impairment_id=hartwell_commons_impairment.id,
            event_type="ahj_notified",
            from_status="open",
            to_status="open",
            performed_by="G. Sullivan",
            performed_at=hc_opened + timedelta(minutes=8),
            notes="Emailed Marshal Reyes per Hartwell Fire Code §17-4.7. Ref: HFD-2026-0415.",
        ),
        ImpairmentEvent(
            impairment_id=hartwell_commons_impairment.id,
            event_type="fire_watch_started",
            from_status="open",
            to_status="fire_watch_active",
            performed_by="G. Sullivan",
            performed_at=hc_opened + timedelta(minutes=10),
            notes="Fire watch assigned to Summit Security Detail.",
        ),
        ImpairmentEvent(
            impairment_id=hartwell_commons_impairment.id,
            event_type="repair_started",
            from_status="fire_watch_active",
            to_status="repair_in_progress",
            performed_by="G. Sullivan",
            performed_at=hc_opened + timedelta(minutes=20),
            notes="Actuator motor replacement in progress.",
        ),
        ImpairmentEvent(
            impairment_id=hartwell_commons_impairment.id,
            event_type="repair_completed",
            from_status="repair_in_progress",
            to_status="restoration_testing",
            performed_by="G. Sullivan",
            performed_at=hc_restored,
            notes="Motor replaced. Valve operational. System repressurized.",
        ),
        ImpairmentEvent(
            impairment_id=hartwell_commons_impairment.id,
            event_type="fire_watch_ended",
            from_status="restoration_testing",
            to_status="restoration_testing",
            performed_by="G. Sullivan",
            performed_at=hc_restored + timedelta(minutes=5),
            notes="Fire watch concluded. Duration 3h 5m — under 4hr threshold, main drain not required.",
        ),
        ImpairmentEvent(
            impairment_id=hartwell_commons_impairment.id,
            event_type="closed",
            from_status="pending_closure",
            to_status="closed",
            performed_by="G. Sullivan",
            performed_at=hc_restored + timedelta(minutes=20),
            notes="Impairment closed clean. All Hartwell requirements satisfied.",
        ),
    ]
    db.add_all(hc_events)

    # ── Cedar Heights — Fire Alarm closed_incomplete ──────────────
    # Short impairment, panel returned to normal, customer declined follow-up
    fa_opened = datetime(2026, 2, 28, 14, 15)
    fa_fw_start = fa_opened + timedelta(minutes=12)
    fa_fw_end = fa_opened + timedelta(hours=1, minutes=40)
    fa_closed = fa_opened + timedelta(hours=1, minutes=55)

    cedar_alarm_impairment = Impairment(
        system_id=fire_alarm.id,
        status="closed_incomplete",
        reason="Fire alarm panel — intermittent fault code (zone 7 supervisory)",
        opened_at=fa_opened,
        opened_by="M. DiSalvo",
        estimated_duration_hours=2.0,
        ahj_notified=True,
        ahj_notified_at=fa_opened + timedelta(minutes=6),
        ahj_notification_method="phone",
        ahj_notification_ref="Called Marshal Reyes — ref HFD-2026-0228",
        ahj_notification_required=True,
        fire_watch_assigned_to="Carlos Rivera",
        fire_watch_organization="Steeplechase Property Management",
        fire_watch_started_at=fa_fw_start,
        fire_watch_ended_at=fa_fw_end,
        fire_watch_hours_computed=1.47,
        restored_at=fa_fw_end,
        restored_by="M. DiSalvo",
        restoration_notes="Panel reset to normal. Fault code cleared — cause undetermined.",
        main_drain_test_performed=False,  # Under 4 hours — not required
        closed_at=fa_closed,
        closed_by="M. DiSalvo",
        closure_notes="Customer declined further investigation. Panel returned to normal operation. Recommended follow-up at next annual.",
    )
    db.add(cedar_alarm_impairment)
    db.flush()

    alarm_events = [
        ImpairmentEvent(
            impairment_id=cedar_alarm_impairment.id,
            event_type="created",
            from_status=None,
            to_status="open",
            performed_by="M. DiSalvo",
            performed_at=fa_opened,
            notes="Zone 7 supervisory fault. Panel pulled offline for inspection.",
        ),
        ImpairmentEvent(
            impairment_id=cedar_alarm_impairment.id,
            event_type="ahj_notified",
            from_status="open",
            to_status="open",
            performed_by="M. DiSalvo",
            performed_at=fa_opened + timedelta(minutes=6),
            notes="Called Marshal Reyes per HFC §17-4.7. Ref: HFD-2026-0228.",
        ),
        ImpairmentEvent(
            impairment_id=cedar_alarm_impairment.id,
            event_type="fire_watch_started",
            from_status="open",
            to_status="fire_watch_active",
            performed_by="M. DiSalvo",
            performed_at=fa_fw_start,
            notes="Fire watch assigned to Carlos Rivera.",
        ),
        ImpairmentEvent(
            impairment_id=cedar_alarm_impairment.id,
            event_type="fire_watch_ended",
            from_status="fire_watch_active",
            to_status="fire_watch_active",
            performed_by="Carlos Rivera",
            performed_at=fa_fw_end,
            notes="Panel returned to normal operation. Fire watch concluded.",
        ),
        ImpairmentEvent(
            impairment_id=cedar_alarm_impairment.id,
            event_type="closed_incomplete",
            from_status="fire_watch_active",
            to_status="closed_incomplete",
            performed_by="M. DiSalvo",
            performed_at=fa_closed,
            notes="Closed incomplete — customer declined further investigation. Follow-up recommended at next annual inspection.",
        ),
    ]
    db.add_all(alarm_events)

    # ── Deficiencies ─────────────────────────────────────────────
    # Today = 2026-05-08
    # Day -78 = 2026-02-19, Day -74 = 2026-02-23

    cedar_standpipe_deficiency = Deficiency(
        property_id=cedar_heights.id,
        system_id=standpipe.id,
        reported_by="M. DiSalvo",
        reported_at=datetime(2026, 2, 19, 10, 30),
        description="Corrosion on 9th floor west stairwell standpipe hose connection threads. Not failed but deteriorating — threads are compromised enough to prevent proper hose coupling under pressure.",
        severity="non_critical",
        status="proposal_sent",
        proposal_sent_at=datetime(2026, 2, 23, 9, 0),
        proposal_response="No response from property owner. Follow-up sent Day -68. Tom DiSalvo: 'Let it sit — they'll come around.'",
        on_itm_report=False,
        nfpa_reference="NFPA 25 §5.2",
        notes="CRITICAL: This deficiency does not appear on the ITM report. AHJ has no record of it.",
    )

    cedar_pump_deficiency = Deficiency(
        property_id=cedar_heights.id,
        system_id=fire_pump.id,
        reported_by="K. Fielding (Continental Mutual Insurance)",
        reported_at=datetime(2025, 3, 19, 0, 0),
        description="Fire pump Aurora 410A approaching end of expected service life (installed 2008, rated 20-year lifespan). Recommend replacement or full overhaul within 36 months to ensure reliability.",
        severity="non_critical",
        status="open",
        on_itm_report=False,
        nfpa_reference="Carrier Rec 5.2-A",
        notes="Carrier recommendation from annual renewal inspection. Owner was notified but has taken no action.",
    )

    wessex_gauge_deficiency = Deficiency(
        property_id=wessex_office.id,
        system_id=wessex_sprinkler.id,
        reported_by="T. Beacon",
        reported_at=datetime.now() - timedelta(days=60),
        description="Pressure gauge on 2nd floor riser reading low — replaced with calibrated replacement gauge.",
        severity="non_critical",
        status="resolved",
        resolved_at=datetime.now() - timedelta(days=55),
        resolved_by="T. Beacon",
        on_itm_report=True,
        nfpa_reference="NFPA 25 §5.3.1",
    )

    db.add_all([cedar_standpipe_deficiency, cedar_pump_deficiency, wessex_gauge_deficiency])
    db.commit()
    print("Database seeded: 3 properties, 5 impairments, 3 deficiencies across Hartwell/Wessex/Dunmoor")
