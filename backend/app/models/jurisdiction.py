from sqlalchemy import Column, Integer, String, Boolean, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base


class Jurisdiction(Base):
    __tablename__ = "jurisdictions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    state = Column(String, nullable=False)
    nfpa25_edition = Column(String, nullable=False)
    ahj_notification_required = Column(Boolean, default=True)
    notification_threshold_hours = Column(Float, default=0)
    fire_watch_required = Column(Boolean, default=True)
    main_drain_on_restore = Column(Boolean, default=True)
    ahj_contact_name = Column(String)
    ahj_contact_phone = Column(String)
    ahj_contact_email = Column(String)
    local_code_ref = Column(String)
    timezone = Column(String, default="America/New_York")
    notes = Column(Text)

    properties = relationship("Property", back_populates="jurisdiction")
    compliance_rules = relationship("ComplianceRule", back_populates="jurisdiction")


class ComplianceRule(Base):
    __tablename__ = "compliance_rules"

    id = Column(Integer, primary_key=True, index=True)
    jurisdiction_id = Column(Integer, ForeignKey("jurisdictions.id"), nullable=False)
    rule_code = Column(String, nullable=False)
    rule_source = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    trigger_event = Column(String)
    trigger_condition = Column(String)
    required_action = Column(String, nullable=False)
    deadline_hours = Column(Float)
    blocks_transition_to = Column(String)
    severity = Column(String, default="required")

    jurisdiction = relationship("Jurisdiction", back_populates="compliance_rules")
