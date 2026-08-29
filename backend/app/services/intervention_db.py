from sqlalchemy.orm import Session

from app.database.models import Intervention
from app.schemas import InterventionCreate


# --------------------------------------------------
# CREATE INTERVENTION
# --------------------------------------------------

def create_intervention(
    db: Session,
    intervention_data: InterventionCreate
):
    intervention = Intervention(
        location_id=intervention_data.location_id,
        risk_id=intervention_data.risk_id,
        cooling_center=intervention_data.cooling_center,
        hydration_station=intervention_data.hydration_station,
        outdoor_work_restriction=(
            intervention_data.outdoor_work_restriction
        ),
        before_risk_score=intervention_data.before_risk_score,
        after_risk_score=intervention_data.after_risk_score
    )

    db.add(intervention)
    db.commit()
    db.refresh(intervention)

    return intervention


# --------------------------------------------------
# GET ALL INTERVENTIONS
# --------------------------------------------------

def get_interventions(db: Session):
    return (
        db.query(Intervention)
        .order_by(Intervention.created_at.desc())
        .all()
    )


# --------------------------------------------------
# GET INTERVENTION BY ID
# --------------------------------------------------

def get_intervention(
    db: Session,
    intervention_id: int
):
    return (
        db.query(Intervention)
        .filter(Intervention.id == intervention_id)
        .first()
    )


# --------------------------------------------------
# GET INTERVENTIONS BY LOCATION
# --------------------------------------------------

def get_location_interventions(
    db: Session,
    location_id: int
):
    return (
        db.query(Intervention)
        .filter(
            Intervention.location_id == location_id
        )
        .order_by(Intervention.created_at.desc())
        .all()
    )


# --------------------------------------------------
# GET INTERVENTIONS BY RISK
# --------------------------------------------------

def get_risk_interventions(
    db: Session,
    risk_id: int
):
    return (
        db.query(Intervention)
        .filter(
            Intervention.risk_id == risk_id
        )
        .order_by(Intervention.created_at.desc())
        .all()
    )


# --------------------------------------------------
# DELETE INTERVENTION
# --------------------------------------------------

def delete_intervention(
    db: Session,
    intervention_id: int
):
    intervention = get_intervention(
        db,
        intervention_id
    )

    if intervention is None:
        return False

    db.delete(intervention)
    db.commit()

    return True