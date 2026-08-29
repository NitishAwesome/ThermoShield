from sqlalchemy.orm import Session

from app.database.models import User
from app.schemas import UserCreate

def create_user(
    db:Session,
    user_data: UserCreate
):
    user = User(
        name=user_data.name,
        phone_number=user_data.phone_number,      
        email=user_data.email,
        role=user_data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_users(db: Session):
    return db.query(User).all()

def get_user(
    db:Session,
    user_id: int
):
    return (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

def delete_user(
    db: Session,
    user_id: int
):
    user = get_user(db, user_id)
    if user is None:
        return False
    db.delete(user)
    db.commit()

    return True
    