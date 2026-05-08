from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base


class System(Base):
    __tablename__ = "systems"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    system_type = Column(String, nullable=False)
    zone = Column(String)
    description = Column(Text)
    install_year = Column(Integer)
    last_annual_test_date = Column(Date)
    created_at = Column(DateTime, server_default=func.now())

    property = relationship("Property", back_populates="systems")
    impairments = relationship("Impairment", back_populates="system")
