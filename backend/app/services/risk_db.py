from sqlalchemy.orm import Session

from app.database.models import Risk
from app.schemas import RiskCreate


def create_risk(
    db: Session,
    risk_data: RiskCreate
):
    risk = Risk(
        location_id=risk_data.location_id,
        temperature_c=risk_data.temperature_c,
        thermal_stress=risk_data.thermal_stress,
        heat_index=risk_data.heat_index,
        wbgt=risk_data.wbgt,
        predicted_health_impact_proxy=(
            risk_data.predicted_health_impact_proxy
        ),
        risk_score=risk_data.risk_score,
        risk_level=risk_data.risk_level
    )

    db.add(risk)
    db.commit()
    db.refresh(risk)

    return risk


def get_risks(db: Session):
    return db.query(Risk).all()


def get_risk(
    db: Session,
    risk_id: int
):
    return (
        db.query(Risk)
        .filter(Risk.id == risk_id)
        .first()
    )


def get_location_risks(
    db: Session,
    location_id: int
):
    return (
        db.query(Risk)
        .filter(Risk.location_id == location_id)
        .order_by(Risk.created_at.desc())
        .all()
    )


def delete_risk(
    db: Session,
    risk_id: int
):
    risk = get_risk(db, risk_id)

    if risk is None:
        return False

    db.delete(risk)
    db.commit()

    return True