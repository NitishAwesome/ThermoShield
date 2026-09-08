import os
import time
import logging
from typing import Optional
from datetime import datetime, timedelta

import jwt
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import User
from app.schemas import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

security = HTTPBearer(auto_error=False)


# ==================================================
# JWT SECRET RESOLUTION
# ==================================================

def get_jwt_secret() -> str:
    """
    Retrieve JWT secret from environment.
    Provides a stable fallback key if not explicitly set in the cloud environment,
    ensuring sign-in and registration always work without crashing.
    """
    secret = os.getenv("JWT_SECRET")
    if secret and secret.strip():
        return secret.strip()

    logger.warning("JWT_SECRET is unset in the environment. Using system fallback secret.")
    return "thermoshield-super-secret-jwt-key-sih26083-2026"


# ==================================================
# PASSWORD HASHING HELPERS
# ==================================================

def hash_password(password: str) -> str:
    """Hash plaintext password using bcrypt with salt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against a stored bcrypt hash safely."""
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        # Protect against malformed hashes or legacy unmigrated sentinel strings
        return False


# ==================================================
# SCHEMAS
# ==================================================

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone_number: str = Field(..., min_length=7, max_length=20)
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")
    role: Optional[str] = "user"


class UserLogin(BaseModel):
    email: str = Field(..., description="Email address or phone number")
    password: str = Field(..., min_length=1, description="Account password")


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ==================================================
# TOKEN HELPERS
# ==================================================

def create_access_token(user: User) -> str:
    """Generate a signed JWT token containing user identity claims."""
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": str(user.id),
        "user_id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "phone_number": user.phone_number,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    secret = get_jwt_secret()
    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Validate and decode a JWT token."""
    secret = get_jwt_secret()
    try:
        payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """FastAPI dependency to retrieve the authenticated user from the Bearer token."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing user identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account no longer exists.",
        )
    
    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """FastAPI dependency to optionally retrieve user if token is provided, else None."""
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("user_id")
        if user_id is None:
            return None
        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None


def require_roles(*allowed_roles: str):
    """Factory dependency for role-based authorization."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (current_user.role or "user").strip().lower()
        normalized = [r.strip().lower() for r in allowed_roles]
        if user_role not in normalized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: action requires one of the following roles: {allowed_roles}."
            )
        return current_user
    return role_checker


require_admin_or_official = require_roles("admin", "official")


# ==================================================
# AUTH ENDPOINTS
# ==================================================

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user account with secure password hashing and return a JWT access token.
    Enforces minimum password requirements and verifies uniqueness of email/phone.
    """
    cleaned_email = user_data.email.strip().lower()
    cleaned_phone = user_data.phone_number.strip()
    cleaned_name = user_data.name.strip()
    role = (user_data.role or "user").strip().lower()

    if len(user_data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    if not cleaned_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required."
        )

    # Check for existing email
    existing_by_email = db.query(User).filter(User.email.ilike(cleaned_email)).first()
    if existing_by_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{cleaned_email}' already exists. Please log in instead."
        )

    # Check for existing phone number
    existing_by_phone = db.query(User).filter(User.phone_number == cleaned_phone).first()
    if existing_by_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with phone number '{cleaned_phone}' already exists."
        )

    # Hash password securely
    hashed = hash_password(user_data.password)

    new_user = User(
        name=cleaned_name,
        email=cleaned_email,
        phone_number=cleaned_phone,
        password_hash=hashed,
        role=role
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating user during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating your account. Please try again."
        )

    access_token = create_access_token(new_user)

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )


@router.post("/login", response_model=AuthResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """
    Log in an existing user using email or phone number and verified password.
    Returns generic unauthorized error on mismatch to prevent account enumeration.
    """
    identifier = login_data.email.strip()
    password = login_data.password

    if not identifier or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email/phone number and password are required."
        )

    # Query user by email (case-insensitive) or phone number
    user = (
        db.query(User)
        .filter(
            (User.email.ilike(identifier.lower())) |
            (User.phone_number == identifier)
        )
        .first()
    )

    # Constant-time comparison / generic error message to prevent enumeration
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/phone number or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(user)

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Retrieve the profile of the currently authenticated user.
    Returns safe user information only (never exposes password hashes or tokens).
    """
    return UserResponse.model_validate(current_user)
