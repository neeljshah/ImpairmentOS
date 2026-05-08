from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base


class Deficiency(Base):
    __tablename__ = "deficiencies"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    system_id = Column(Integer, ForeignKey("systems.id"), nullable=True)
    reported_by = Column(String, nullable=False)
    reported_at = Column(DateTime, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String, nullable=False, default="non_critical")
    status = Column(String, nullable=False, default="open")
    proposal_sent_at = Column(DateTime, nullable=True)
    proposal_response = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String, nullable=True)
    nfpa_reference = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    on_itm_report = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, server_default=func.now())

    property = relationship("Property", backref="deficiencies")
    system = relationship("System", backref="deficiencies")
