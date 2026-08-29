from sqlalchemy.orm import Session

from app.database.models import Location
from app.schemas import LocationCreate

def create_location(
    db: Session,
    location_data: LocationCreate
):
    location = Location(
        name=location_data.name,
        latitude=location_data.latitude,
        longitude=location_data.longitude
    )
    db.add(location)
    db.commit()
    db.refresh(location)
    return location

def get_locations(db: Session):
    return db.query(Location).all()

def get_location(
        db: Session,
        location_id: int
):
    return (
        db.query(Location)
        .filter(Location.id == location_id)
        .first()
    )

def get_location_by_coordinates(
    db: Session,
    latitude: float,
    longitude: float
):
    return (
        db.query(Location)
        .filter(
            Location.latitude == latitude,
            Location.longitude == longitude
        )
        .first()
    )

def delete_location(
        db: Session,
        location_id: int
):
    location = get_location(db, location_id)
    if location is None:
        return False
    db.delete(location)
    db.commit()
    return True