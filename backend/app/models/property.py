from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base


class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    jurisdiction_id = Column(Integer, ForeignKey("jurisdictions.id"), nullable=False)
    owner_name = Column(String)
    owner_entity = Column(String)
    property_manager = Column(String)
    pm_contact_name = Column(String)
    pm_contact_email = Column(String)
    carrier_name = Column(String)
    carrier_account = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    jurisdiction = relationship("Jurisdiction", back_populates="properties")
    systems = relationship("System", back_populates="property")
