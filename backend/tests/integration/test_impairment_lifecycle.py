"""
Integration tests — golden-path impairment lifecycle through the HTTP API.

Uses FastAPI's TestClient with an in-memory SQLite database so the real
impairmentos.db is never touched.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base
from database import get_db
import main as app_module


# ── In-memory DB fixture ──────────────────────────────────────────────────────

TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def db_engine():
    # StaticPool: all connections share one underlying connection — required for
    # in-memory SQLite so that create_all tables are visible to every session.
    engine = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestSession()
    yield session
    session.close()


@pytest.fixture(scope="function")
def client(db_engine):
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)

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


# ── Seed helpers ──────────────────────────────────────────────────────────────

def seed_minimal(client: TestClient) -> dict:
    """
    POST a jurisdiction, property, system, then return their IDs via the
    properties endpoint.  Returns {jurisdiction_id, property_id, system_id}.
    """
    from sqlalchemy.orm import sessionmaker
    from app.models import Jurisdiction, Property, System

    # Reach into the override to seed directly
    db_gen = client.app.dependency_overrides[get_db]()
    db = next(db_gen)

    jur = Jurisdiction(
        name="Test County",
        state="MA",
        nfpa25_edition="2017",
        ahj_notification_required=False,
        notification_threshold_hours=4,
        fire_watch_required=True,
        main_drain_on_restore=True,
        timezone="America/New_York",
    )
    db.add(jur)
    db.flush()

    prop = Property(
        name="Test Building",
        address="1 Test St, Boston MA",
        jurisdiction_id=jur.id,
    )
    db.add(prop)
    db.flush()

    sys_obj = System(
        property_id=prop.id,
        system_type="wet_sprinkler",
        zone="Zone 1",
        description="Test system",
    )
    db.add(sys_obj)
    db.commit()

    return {
        "jurisdiction_id": jur.id,
        "property_id": prop.id,
        "system_id": sys_obj.id,
    }


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestCreateImpairment:
    def test_create_returns_201_shape(self, client):
        ids = seed_minimal(client)
        resp = client.post("/impairments", json={
            "system_id": ids["system_id"],
            "reason": "Valve repair",
            "opened_by": "T. Technician",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "open"
        assert data["reason"] == "Valve repair"
        assert data["ahj_notified"] is False
        assert data["main_drain_test_performed"] is False

    def test_create_unknown_system_returns_404(self, client):
        resp = client.post("/impairments", json={
            "system_id": 9999,
            "reason": "Test",
            "opened_by": "T. Technician",
        })
        assert resp.status_code == 404

    def test_create_records_opened_event(self, client):
        ids = seed_minimal(client)
        resp = client.post("/impairments", json={
            "system_id": ids["system_id"],
            "reason": "Pipe leak",
            "opened_by": "M. DiSalvo",
        })
        data = resp.json()
        events = data["events"]
        assert len(events) == 1
        assert events[0]["event_type"] == "created"
        assert events[0]["to_status"] == "open"


class TestFireWatch:
    def test_start_fire_watch_transitions_to_fire_watch_active(self, client):
        ids = seed_minimal(client)
        imp = client.post("/impairments", json={
            "system_id": ids["system_id"],
            "reason": "Test",
            "opened_by": "T. Tech",
        }).json()

        resp = client.post(f"/impairments/{imp['id']}/fire-watch", json={
            "assigned_to": "J. Guard",
            "performed_by": "T. Tech",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "fire_watch_active"

    def test_end_fire_watch_computes_hours(self, client):
        ids = seed_minimal(client)
        imp = client.post("/impairments", json={
            "system_id": ids["system_id"],
            "reason": "Test",
            "opened_by": "T. Tech",
        }).json()

        client.post(f"/impairments/{imp['id']}/fire-watch", json={
            "assigned_to": "J. Guard",
            "performed_by": "T. Tech",
            "started_at": "2026-05-08T08:00:00Z",
        })
        resp = client.post(f"/impairments/{imp['id']}/fire-watch/end", json={
            "performed_by": "T. Tech",
            "ended_at": "2026-05-08T10:00:00Z",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert abs(data["fire_watch_hours_computed"] - 2.0) < 0.01


class TestRestoreAndTest:
    def test_restore_from_open_reaches_restoration_testing(self, client):
        ids = seed_minimal(client)
        imp = client.post("/impairments", json={
            "system_id": ids["system_id"],
            "reason": "Test",
            "opened_by": "T. Tech",
        }).json()

        resp = client.post(f"/impairments/{imp['id']}/restore", json={
            "restored_by": "T. Tech",
            "restoration_notes": "All good",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "restoration_testing"

    def test_main_drain_test_marks_performed(self, client):
        ids = seed_minimal(client)
        imp = client.post("/impairments", json={
            "system_id": ids["system_id"],
            "reason": "Test",
            "opened_by": "T. Tech",
        }).json()
        client.post(f"/impairments/{imp['id']}/restore", json={"restored_by": "T. Tech"})

        resp = client.post(f"/impairments/{imp['id']}/test", json={
            "psi_static": 100.0,
            "psi_residual": 95.0,
            "performed_by": "T. Tech",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["main_drain_test_performed"] is True
        assert data["main_drain_psi_differential"] == pytest.approx(5.0)
        assert data["main_drain_test_pass"] is True

    def test_psi_differential_over_10_fails(self, client):
        ids = seed_minimal(client)
        imp = client.post("/impairments", json={
            "system_id": ids["system_id"],
            "reason": "Test",
            "opened_by": "T. Tech",
        }).json()
        client.post(f"/impairments/{imp['id']}/restore", json={"restored_by": "T. Tech"})

        resp = client.post(f"/impairments/{imp['id']}/test", json={
            "psi_static": 100.0,
            "psi_residual": 85.0,
            "performed_by": "T. Tech",
        })
        assert resp.json()["main_drain_test_pass"] is False


class TestGoldenPath:
    """Full lifecycle: open → fire_watch → restore → test → close."""

    def test_complete_under_4h_no_ahj_required(self, client):
        ids = seed_minimal(client)

        # Create
        imp = client.post("/impairments", json={
            "system_id": ids["system_id"],
            "reason": "OS&Y valve repair",
            "opened_by": "T. Beacon",
            "opened_at": "2026-05-08T09:00:00Z",
        }).json()
        imp_id = imp["id"]

        # Fire watch
        client.post(f"/impairments/{imp_id}/fire-watch", json={
            "assigned_to": "Security Team",
            "performed_by": "T. Beacon",
            "started_at": "2026-05-08T09:10:00Z",
        })
        client.post(f"/impairments/{imp_id}/fire-watch/end", json={
            "performed_by": "T. Beacon",
            "ended_at": "2026-05-08T11:20:00Z",
        })

        # Restore (2h 20m → under 4h → no main drain required)
        client.post(f"/impairments/{imp_id}/restore", json={
            "restored_by": "T. Beacon",
            "restored_at": "2026-05-08T11:15:00Z",
        })

        # Compliance check: no violations expected (under 4h, AHJ not required)
        comp = client.get(f"/impairments/{imp_id}/compliance").json()
        assert comp["can_close"] is True
        assert comp["violations"] == []

        # Close
        resp = client.post(f"/impairments/{imp_id}/close", json={
            "closed_by": "T. Beacon",
            "closure_notes": "Clean closure",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "closed"

    def test_closed_impairment_cannot_be_modified(self, client):
        ids = seed_minimal(client)
        imp = client.post("/impairments", json={
            "system_id": ids["system_id"],
            "reason": "Test",
            "opened_by": "T. Tech",
        }).json()
        imp_id = imp["id"]

        client.post(f"/impairments/{imp_id}/restore", json={"restored_by": "T. Tech"})
        client.post(f"/impairments/{imp_id}/close", json={"closed_by": "T. Tech"})

        resp = client.post(f"/impairments/{imp_id}/notify-ahj", json={
            "method": "phone",
            "notified_by": "T. Tech",
        })
        assert resp.status_code == 400
        assert "already closed" in resp.json()["detail"]


class TestAHJNotification:
    def test_ahj_notification_recorded(self, client):
        ids = seed_minimal(client)
        imp = client.post("/impairments", json={
            "system_id": ids["system_id"],
            "reason": "Test",
            "opened_by": "T. Tech",
        }).json()

        resp = client.post(f"/impairments/{imp['id']}/notify-ahj", json={
            "method": "phone",
            "ref": "REF-001",
            "notified_by": "T. Tech",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["ahj_notified"] is True
        assert data["ahj_notification_method"] == "phone"
        assert data["ahj_notification_ref"] == "REF-001"


class TestDashboard:
    def test_dashboard_returns_structure(self, client):
        resp = client.get("/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        assert "active_impairments" in data
        assert "recently_closed" in data
        assert "compliance_alerts" in data

    def test_closed_impairment_moves_to_recently_closed(self, client):
        ids = seed_minimal(client)
        imp = client.post("/impairments", json={
            "system_id": ids["system_id"],
            "reason": "Test",
            "opened_by": "T. Tech",
        }).json()
        imp_id = imp["id"]

        client.post(f"/impairments/{imp_id}/restore", json={"restored_by": "T. Tech"})
        client.post(f"/impairments/{imp_id}/close", json={"closed_by": "T. Tech"})

        dash = client.get("/dashboard").json()
        active_ids = [i["id"] for i in dash["active_impairments"]]
        closed_ids = [i["id"] for i in dash["recently_closed"]]
        assert imp_id not in active_ids
        assert imp_id in closed_ids


class TestPacket:
    def test_packet_returns_expected_keys(self, client):
        ids = seed_minimal(client)
        imp = client.post("/impairments", json={
            "system_id": ids["system_id"],
            "reason": "Test",
            "opened_by": "T. Tech",
        }).json()

        resp = client.get(f"/impairments/{imp['id']}/packet")
        assert resp.status_code == 200
        data = resp.json()
        assert "impairment_number" in data
        assert "compliance_items" in data
        assert "timeline" in data
        assert "events" in data
        assert data["impairment_number"].startswith("IMP-")
