from sqlalchemy.orm import Session

from app.database.models import Alert
from app.schemas import AlertCreate


def create_alert(
    db: Session,
    alert_data: AlertCreate
):
    alert = Alert(
        user_id=alert_data.user_id,
        location_id=alert_data.location_id,
        risk_level=alert_data.risk_level,
        risk_score=alert_data.risk_score,
        message=alert_data.message,
        status=alert_data.status,
        phone_number=alert_data.phone_number,
        reference_id=alert_data.reference_id
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)

    return alert


def get_alerts(db: Session):
    return db.query(Alert).all()


def get_alert(
    db: Session,
    alert_id: int
):
    return (
        db.query(Alert)
        .filter(Alert.id == alert_id)
        .first()
    )


def get_user_alerts(
    db: Session,
    user_id: int
):
    return (
        db.query(Alert)
        .filter(Alert.user_id == user_id)
        .order_by(Alert.created_at.desc())
        .all()
    )


def get_location_alerts(
    db: Session,
    location_id: int
):
    return (
        db.query(Alert)
        .filter(Alert.location_id == location_id)
        .order_by(Alert.created_at.desc())
        .all()
    )


def delete_alert(
    db: Session,
    alert_id: int
):
    alert = get_alert(db, alert_id)

    if alert is None:
        return False

    db.delete(alert)
    db.commit()

    return True