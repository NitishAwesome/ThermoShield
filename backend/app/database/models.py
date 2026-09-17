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
        unique=True,
        index=True
    )

    email = Column(
        String(255),
        nullable=False,
        unique=True,
        index=True
    )

    role = Column(
        String(50),
        nullable=False,
        default="user"
    )

    organization = Column(
        String(150),
        nullable=True
    )

    department = Column(
        String(100),
        nullable=True
    )

    designation = Column(
        String(100),
        nullable=True
    )

    official_id = Column(
        String(50),
        nullable=True
    )

    jurisdiction_id = Column(
        String(50),
        nullable=True,
        default="IN"
    )

    jurisdiction_type = Column(
        String(30),
        nullable=True,
        default="COUNTRY"
    )

    permissions = Column(
        String(500),
        nullable=True,
        default=""
    )

    account_status = Column(
        String(30),
        nullable=False,
        default="APPROVED"
    )

    password_hash = Column(
        String(255),
        nullable=False,
        default=""
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
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
        unique=True,
        index=True
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
        nullable=False,
        index=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True
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
        default="PENDING",
        index=True
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
        default=datetime.utcnow,
        index=True
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
        default=datetime.utcnow,
        index=True
    )


# --------------------------------------------------
# HEAT ACTION PLAN AUDIT LOG MODEL
# --------------------------------------------------

class HAPActionAuditLog(Base):
    __tablename__ = "hap_action_audit_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    action_id = Column(
        String(100),
        nullable=False,
        index=True
    )

    jurisdiction_id = Column(
        String(50),
        nullable=False,
        index=True
    )

    action_key = Column(
        String(100),
        nullable=False
    )

    recommended_action = Column(
        String(255),
        nullable=True
    )

    created_by = Column(
        String(100),
        nullable=False
    )

    approved_by = Column(
        String(100),
        nullable=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="PENDING_APPROVAL",
        index=True
    )

    reason_comment = Column(
        String(500),
        nullable=True
    )

    risk_snapshot_score = Column(
        Float,
        nullable=True
    )

    risk_snapshot_level = Column(
        String(20),
        nullable=True
    )

    activated_at = Column(
        DateTime,
        nullable=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True
    )