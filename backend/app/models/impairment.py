from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base


class Impairment(Base):
    __tablename__ = "impairments"

    id = Column(Integer, primary_key=True, index=True)
    system_id = Column(Integer, ForeignKey("systems.id"), nullable=False)
    status = Column(String, nullable=False, default="open")
    reason = Column(Text, nullable=False)

    # Opening
    opened_at = Column(DateTime, nullable=False)
    opened_by = Column(String, nullable=False)
    estimated_duration_hours = Column(Float)
    gps_lat = Column(Float)
    gps_lon = Column(Float)

    # AHJ Notification
    ahj_notified = Column(Boolean, default=False)
    ahj_notified_at = Column(DateTime)
    ahj_notification_method = Column(String)
    ahj_notification_ref = Column(String)
    ahj_notification_required = Column(Boolean)

    # Fire Watch
    fire_watch_assigned_to = Column(String)
    fire_watch_organization = Column(String)
    fire_watch_started_at = Column(DateTime)
    fire_watch_ended_at = Column(DateTime)
    fire_watch_hours_computed = Column(Float)

    # Restoration
    restored_at = Column(DateTime)
    restored_by = Column(String)
    restoration_notes = Column(Text)

    # Main drain test
    main_drain_test_performed = Column(Boolean, default=False)
    main_drain_psi_static = Column(Float)
    main_drain_psi_residual = Column(Float)
    main_drain_psi_differential = Column(Float)
    main_drain_test_pass = Column(Boolean)

    # Closure
    closed_at = Column(DateTime)
    closed_by = Column(String)
    closure_notes = Column(Text)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    system = relationship("System", back_populates="impairments")
    events = relationship(
        "ImpairmentEvent",
        back_populates="impairment",
        order_by="ImpairmentEvent.performed_at",
    )
