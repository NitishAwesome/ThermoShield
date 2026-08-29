from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, DateTime, Boolean
)

from sqlalchemy.orm import relationship

from .connection import Base

# --------------------------------------------------
# USER MODEL
# --------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        nullable=False
    )

    phone_number = Column(
        String(20),
        nullable=False,
        unique=True
    )

    email = Column(
        String(255),
        nullable=False,
        unique=True,
        index=True
    )

    role = Column(
        String(20),
        nullable=False,
        default="user"
    )

    alerts = relationship(
        "Alert",
        back_populates="user"
    )


# --------------------------------------------------
# LOCATION MODEL
# --------------------------------------------------

class Location(Base):
    __tablename__ = "locations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        nullable=False,
        unique=True
    )

    latitude = Column(
        Float,
        nullable=False
    )

    longitude = Column(
        Float,
        nullable=False
    )

    risks = relationship(
        "Risk",
        back_populates="location"
    )

    alerts = relationship(
        "Alert",
        back_populates="location"
    )

    interventions = relationship(
        "Intervention",
        back_populates="location"
    )

# --------------------------------------------------
# RISK MODEL
# --------------------------------------------------

class Risk(Base):
    __tablename__ = "risks"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    location_id = Column(
        Integer,
        ForeignKey("locations.id"),
        nullable=False,
        index=True
    )

    location = relationship(
        "Location",
        back_populates="risks"
    )

    temperature_c = Column(
        Float,
        nullable=False
    )

    thermal_stress = Column(
        Float,
        nullable=False
    )

    heat_index = Column(
        Float,
        nullable=True
    )

    wbgt = Column(
        Float,
        nullable=True
    )

    predicted_health_impact_proxy = Column(
        Float,
        nullable=True
    )

    risk_score = Column(
        Float,
        nullable=False
    )

    risk_level = Column(
        String(20),
        nullable=False
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )

# --------------------------------------------------
# ALERT MODEL
# --------------------------------------------------

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    location_id = Column(
        Integer,
        ForeignKey("locations.id"),
        nullable=False,
        index=True
    )

    user = relationship(
        "User",
        back_populates="alerts"
    )

    location = relationship(
        "Location",
        back_populates="alerts"
    )

    risk_level = Column(
        String(20),
        nullable=False
    )

    risk_score = Column(
        Float,
        nullable=False
    )

    message = Column(
        String(500),
        nullable=False
    )

    status = Column(
        String(20),
        nullable=False,
        default="PENDING"
    )

    phone_number = Column(
        String(20),
        nullable=True
    )

    reference_id = Column(
        String(100),
        nullable=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )

# --------------------------------------------------
# INTERVENTION MODEL
# --------------------------------------------------

class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    location_id = Column(
        Integer,
        ForeignKey("locations.id"),
        nullable=False,
        index=True
    )

    risk_id = Column(
        Integer,
        ForeignKey("risks.id"),
        nullable=False,
        index=True
    )

    location = relationship(
        "Location",
        back_populates="interventions"
    )

    risk = relationship(
        "Risk"
    )

    cooling_center = Column(
        Boolean,
        nullable=False,
        default=False
    )

    hydration_station = Column(
        Boolean,
        nullable=False,
        default=False
    )

    outdoor_work_restriction = Column(
        Boolean,
        nullable=False,
        default=False
    )

    before_risk_score = Column(
        Float,
        nullable=False
    )

    after_risk_score = Column(
        Float,
        nullable=False
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )