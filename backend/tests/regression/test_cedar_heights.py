"""
Regression tests — Cedar Heights Apartments scenario.

AHJ never notified, duration 5.8h, main drain not recorded.
Both violations must block closure at every API layer.

Uses an in-memory DB seeded with exact Cedar Heights data.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base, Jurisdiction, Property, System, Impairment, ImpairmentEvent
from database import get_db
import main as app_module

TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture(scope="module")
def cedar_client():
    engine = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Seed Cedar Heights data
    db = TestSession()
    _seed_cedar_heights(db)
    db.close()

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app_module.app.dependency_overrides[get_db] = override_get_db
    with TestClient(app_module.app, raise_server_exceptions=True) as c:
        yield c
    app_module.app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def _seed_cedar_heights(db):
    hartwell = Jurisdiction(
        name="City of Hartwell",
        state="MA",
        nfpa25_edition="2017",
        ahj_notification_required=True,
        notification_threshold_hours=0,
        fire_watch_required=True,
        main_drain_on_restore=True,
        ahj_contact_name="Marshal Elena Reyes",
        local_code_ref="Hartwell Fire Code §17-4.7",
        timezone="America/New_York",
    )
    db.add(hartwell)
    db.flush()

    cedar = Property(
        name="Cedar Heights Apartments",
        address="1411 Cedar Avenue, Hartwell, MA 01801",
        jurisdiction_id=hartwell.id,
        owner_entity="Halberd Realty Holdings LLC",
        property_manager="Steeplechase Property Management",
        carrier_name="Continental Mutual Insurance",
        carrier_account="CM-2024-FP-00892",
    )
    db.add(cedar)
    db.flush()

    sprinkler = System(
        property_id=cedar.id,
        system_type="wet_sprinkler",
        zone="9th Floor Zone",
        description="Wet pipe sprinkler system serving 9th floor residential units",
    )
    db.add(sprinkler)
    db.flush()

    opened_at = datetime(2026, 1, 12, 7, 40)
    fw_start = datetime(2026, 1, 12, 8, 0)
    fw_end = datetime(2026, 1, 12, 13, 30)
    restored_at = datetime(2026, 1, 12, 13, 30)

    imp = Impairment(
        system_id=sprinkler.id,
        status="repair_in_progress",
        reason="Frozen pipe at vertical riser — replacing 6ft section",
        opened_at=opened_at,
        opened_by="M. DiSalvo",
        estimated_duration_hours=6.0,
        gps_lat=42.3601,
        gps_lon=-71.0589,
        ahj_notified=False,
        ahj_notification_required=True,
        fire_watch_assigned_to="Carlos Rivera",
        fire_watch_organization="Steeplechase Property Management",
        fire_watch_started_at=fw_start,
        fire_watch_ended_at=fw_end,
        fire_watch_hours_computed=5.5,
        restored_at=restored_at,
        restored_by="M. DiSalvo",
        restoration_notes="Replaced 6ft section of vertical riser. Pressure good.",
        main_drain_test_performed=False,
    )
    db.add(imp)
    db.flush()

    db.add(ImpairmentEvent(
        impairment_id=imp.id,
        event_type="created",
        from_status=None,
        to_status="open",
        performed_by="M. DiSalvo",
        performed_at=opened_at,
        notes="Frozen pipe discovered at vertical riser.",
    ))
    db.commit()

    # Store ID for tests
    _seed_cedar_heights.impairment_id = imp.id


_seed_cedar_heights.impairment_id = None


@pytest.fixture(scope="module")
def imp_id():
    return _seed_cedar_heights.impairment_id


# ── Regression tests ──────────────────────────────────────────────────────────

class TestCedarHeightsCompliance:
    def test_compliance_endpoint_shows_ahj_violation(self, cedar_client, imp_id):
        resp = cedar_client.get(f"/impairments/{imp_id}/compliance")
        assert resp.status_code == 200
        data = resp.json()
        types = [v["type"] for v in data["violations"]]
        assert "ahj_notification" in types

    def test_compliance_endpoint_shows_main_drain_violation(self, cedar_client, imp_id):
        resp = cedar_client.get(f"/impairments/{imp_id}/compliance")
        data = resp.json()
        types = [v["type"] for v in data["violations"]]
        assert "main_drain_test" in types

    def test_cannot_close_returns_422(self, cedar_client, imp_id):
        resp = cedar_client.post(f"/impairments/{imp_id}/close", json={
            "closed_by": "M. DiSalvo",
        })
        assert resp.status_code == 422

    def test_cannot_close_detail_mentions_ahj(self, cedar_client, imp_id):
        resp = cedar_client.post(f"/impairments/{imp_id}/close", json={
            "closed_by": "M. DiSalvo",
        })
        detail = str(resp.json()["detail"])
        assert "AHJ" in detail or "ahj" in detail.lower()

    def test_can_close_is_false(self, cedar_client, imp_id):
        resp = cedar_client.get(f"/impairments/{imp_id}/compliance")
        assert resp.json()["can_close"] is False

    def test_duration_over_4h(self, cedar_client, imp_id):
        resp = cedar_client.get(f"/impairments/{imp_id}/compliance")
        assert resp.json()["duration_hours"] > 4.0

    def test_packet_shows_ahj_missing(self, cedar_client, imp_id):
        resp = cedar_client.get(f"/impairments/{imp_id}/packet")
        assert resp.status_code == 200
        items = resp.json()["compliance_items"]
        ahj_item = next((i for i in items if "AHJ" in i["label"]), None)
        assert ahj_item is not None
        assert ahj_item["status"] == "missing"

    def test_packet_shows_main_drain_missing(self, cedar_client, imp_id):
        resp = cedar_client.get(f"/impairments/{imp_id}/packet")
        items = resp.json()["compliance_items"]
        drain_item = next((i for i in items if "Main Drain" in i["label"]), None)
        assert drain_item is not None
        assert drain_item["status"] == "missing"

    def test_packet_all_compliant_is_false(self, cedar_client, imp_id):
        resp = cedar_client.get(f"/impairments/{imp_id}/packet")
        assert resp.json()["all_compliant"] is False


class TestCedarHeightsRemediation:
    """Verify Cedar Heights CAN be closed after violations are resolved."""

    def test_after_ahj_and_drain_closure_succeeds(self, cedar_client, imp_id):
        # Record AHJ notification
        resp = cedar_client.post(f"/impairments/{imp_id}/notify-ahj", json={
            "method": "phone",
            "ref": "HFD-2026-0112",
            "notified_by": "M. DiSalvo",
        })
        assert resp.status_code == 200
        assert resp.json()["ahj_notified"] is True

        # Record main drain test
        resp = cedar_client.post(f"/impairments/{imp_id}/test", json={
            "psi_static": 95.0,
            "psi_residual": 88.0,
            "performed_by": "M. DiSalvo",
        })
        assert resp.status_code == 200
        assert resp.json()["main_drain_test_performed"] is True

        # Compliance should now be clear
        comp = cedar_client.get(f"/impairments/{imp_id}/compliance").json()
        assert comp["can_close"] is True

        # Advance state: still in repair_in_progress — need to restore first
        restore = cedar_client.post(f"/impairments/{imp_id}/restore", json={
            "restored_by": "M. DiSalvo",
        })
        assert restore.status_code == 200

        # Now close
        close = cedar_client.post(f"/impairments/{imp_id}/close", json={
            "closed_by": "Office Manager",
            "closure_notes": "Retroactive closure after compliance review",
        })
        assert close.status_code == 200
        assert close.json()["status"] == "closed"
