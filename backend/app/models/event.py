from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base


class ImpairmentEvent(Base):
    __tablename__ = "impairment_events"

    id = Column(Integer, primary_key=True, index=True)
    impairment_id = Column(Integer, ForeignKey("impairments.id"), nullable=False)
    event_type = Column(String, nullable=False)
    from_status = Column(String)
    to_status = Column(String)
    performed_by = Column(String, nullable=False)
    performed_at = Column(DateTime, nullable=False, server_default=func.now())
    notes = Column(Text)
    metadata_json = Column(Text)

    impairment = relationship("Impairment", back_populates="events")
