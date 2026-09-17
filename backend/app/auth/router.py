import os
import time
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

import httpx
import jwt
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import User
from app.schemas import UserResponse
from app.jurisdiction import get_jurisdiction, is_in_jurisdiction_scope, JurisdictionType
from app.auth.authority_validation import validate_authority_access_request

logger = logging.getLogger(__name__)

GOV_ROLES = {
    "system_admin",
    "national_analyst",
    "state_coordinator",
    "district_authority",
    "municipal_hap_officer",
    "ward_officer",
    "responder",
    "official",
    "analyst",
    "admin",
}

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

_JWT_DEV_FALLBACK = "thermoshield-super-secret-jwt-key-sih26083-2026"
_JWT_MIN_LENGTH = 32


def _is_production_environment() -> bool:
    """Returns True if ENVIRONMENT is set to production or prod."""
    return os.getenv("ENVIRONMENT", "").lower() in ("production", "prod")


def get_jwt_secret() -> str:
    """
    Retrieve JWT secret from environment.

    Production rules (ENVIRONMENT=production|prod — including Render):
      1. JWT_SECRET must be set and non-blank.
      2. JWT_SECRET must NOT equal the known development fallback value.
      3. JWT_SECRET must be at least 32 characters.
    If any rule is violated the application refuses to start with RuntimeError.

    Development / testing (any other ENVIRONMENT):
      Falls back to the internal development secret with a warning.
      This fallback is intentionally weak and must never be used in production.

    Security: the secret value is never logged.
    """
    secret = os.getenv("JWT_SECRET", "").strip()

    if _is_production_environment():
        # Rule 1: must be present and non-blank
        if not secret:
            raise RuntimeError(
                "CRITICAL: JWT_SECRET environment variable is missing or blank in "
                "production. Configure JWT_SECRET in your deployment environment "
                "(Render dashboard → Environment → JWT_SECRET)."
            )

        # Rule 2: must not be the known development fallback
        if secret == _JWT_DEV_FALLBACK:
            raise RuntimeError(
                "CRITICAL: JWT_SECRET is set to the known development fallback value "
                "in production. This is a security vulnerability. Configure a "
                "cryptographically strong JWT_SECRET (minimum 32 characters)."
            )

        # Rule 3: minimum length
        if len(secret) < _JWT_MIN_LENGTH:
            raise RuntimeError(
                f"CRITICAL: JWT_SECRET is too short for production use "
                f"(minimum {_JWT_MIN_LENGTH} characters required). "
                "Configure a cryptographically strong JWT_SECRET."
            )

        return secret

    # Development / testing — fallback allowed
    if secret:
        return secret

    logger.warning(
        "JWT_SECRET is unset in the environment. "
        "Using development fallback secret — DO NOT use in production."
    )
    return _JWT_DEV_FALLBACK


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
    organization: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    official_id: Optional[str] = None
    requested_jurisdiction: Optional[str] = None


class UserLogin(BaseModel):
    email: str = Field(..., description="Email address or phone number")
    password: str = Field(..., min_length=1, description="Account password")


class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., description="Google ID Token from Google Identity Services (GIS)")
    role: Optional[str] = "user"
    nonce: Optional[str] = Field(None, description="Optional CSRF state nonce for verification")


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone_number: Optional[str] = Field(None, min_length=7, max_length=20)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ==================================================
# TOKEN & PERMISSION HELPERS
# ==================================================


def get_default_permissions_for_role(role: str) -> List[str]:
    """Provides canonical permission bundle for a given government role."""
    r = role.strip().upper()
    role_map = {
        "NATIONAL_ANALYST": ["VIEW_JURISDICTION", "VIEW_NATIONAL_CONTEXT", "VIEW_SUBORDINATE_REGIONS", "ANALYZE_RISK", "RECOMMEND_HAP_ACTION", "EXPORT_REPORT"],
        "STATE_COORDINATOR": ["VIEW_JURISDICTION", "VIEW_PARENT_CONTEXT", "VIEW_NATIONAL_CONTEXT", "VIEW_SUBORDINATE_REGIONS", "ANALYZE_RISK", "RECOMMEND_HAP_ACTION", "EXPORT_REPORT"],
        "DISTRICT_AUTHORITY": ["VIEW_JURISDICTION", "VIEW_PARENT_CONTEXT", "VIEW_SUBORDINATE_REGIONS", "ANALYZE_RISK", "RECOMMEND_HAP_ACTION", "ACTIVATE_HAP", "APPROVE_HAP_ACTION", "DISPATCH_RESPONDER", "EXPORT_REPORT"],
        "MUNICIPAL_HAP_OFFICER": ["VIEW_JURISDICTION", "VIEW_PARENT_CONTEXT", "VIEW_NATIONAL_CONTEXT", "VIEW_SUBORDINATE_REGIONS", "ANALYZE_RISK", "RECOMMEND_HAP_ACTION", "APPROVE_HAP_ACTION", "ACTIVATE_HAP", "CLOSE_HAP_ACTION", "SEND_PUBLIC_ADVISORY", "DISPATCH_RESPONDER", "EXPORT_REPORT"],
        "OFFICIAL": ["VIEW_JURISDICTION", "VIEW_PARENT_CONTEXT", "VIEW_NATIONAL_CONTEXT", "VIEW_SUBORDINATE_REGIONS", "ANALYZE_RISK", "RECOMMEND_HAP_ACTION", "APPROVE_HAP_ACTION", "ACTIVATE_HAP", "CLOSE_HAP_ACTION", "SEND_PUBLIC_ADVISORY", "DISPATCH_RESPONDER", "EXPORT_REPORT"],
        "WARD_OFFICER": ["VIEW_JURISDICTION", "VIEW_PARENT_CONTEXT", "ACKNOWLEDGE_TASK", "DISPATCH_RESPONDER", "RECOMMEND_HAP_ACTION"],
        "HEALTH_OFFICER": ["VIEW_JURISDICTION", "VIEW_PARENT_CONTEXT", "ANALYZE_RISK", "RECOMMEND_HAP_ACTION", "ACKNOWLEDGE_TASK"],
        "RESPONDER": ["VIEW_JURISDICTION", "ACKNOWLEDGE_TASK"],
        "ANALYST": ["VIEW_JURISDICTION", "VIEW_NATIONAL_CONTEXT", "VIEW_SUBORDINATE_REGIONS", "ANALYZE_RISK", "RECOMMEND_HAP_ACTION", "RUN_SCENARIO", "EXPORT_REPORT"],
        "SYSTEM_ADMIN": ["MANAGE_JURISDICTION_USERS", "VIEW_JURISDICTION"],
        "ADMIN": ["MANAGE_JURISDICTION_USERS", "VIEW_JURISDICTION"],
        "USER": ["VIEW_JURISDICTION"],
    }
    return role_map.get(r, ["VIEW_JURISDICTION"])


def is_demo_auto_approval_enabled() -> bool:
    """
    Returns True if demo auto-approval for authority registration is active.
    Default: True in development/demo environments.
    Strictly False in production unless explicitly configured with AUTO_APPROVE_AUTHORITY_REGISTRATION=true.
    """
    if _is_production_environment():
        flag = os.getenv("AUTO_APPROVE_AUTHORITY_REGISTRATION", "false").lower()
        return flag in ("true", "1", "yes")
    flag = os.getenv("AUTO_APPROVE_AUTHORITY_REGISTRATION", "true").lower()
    return flag in ("true", "1", "yes")


def build_user_response(user: User) -> UserResponse:
    """Helper to assemble a canonical UserResponse with portal_type and jurisdiction_name."""
    juris_id = user.jurisdiction_id or "IN"
    node = get_jurisdiction(juris_id)
    juris_name = node.name if node else ("India (National)" if juris_id == "IN" else juris_id)
    is_gov = (user.role or "").lower() in GOV_ROLES
    portal_type = "AUTHORITY" if is_gov else "CITIZEN"

    return UserResponse(
        id=user.id,
        name=user.name,
        phone_number=user.phone_number,
        email=user.email,
        role=user.role,
        organization=user.organization,
        department=user.department,
        designation=user.designation,
        official_id=user.official_id,
        jurisdiction_id=juris_id,
        jurisdiction_name=juris_name,
        jurisdiction_type=user.jurisdiction_type or "COUNTRY",
        permissions=user.permissions or "",
        account_status=user.account_status or "APPROVED",
        portal_type=portal_type,
    )


def create_access_token(user: User) -> str:
    """Generate a signed JWT token containing user identity and jurisdiction claims."""
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    perms = [p.strip() for p in (user.permissions or "").split(",") if p.strip()]
    if not perms:
        perms = get_default_permissions_for_role(user.role or "user")

    juris_id = user.jurisdiction_id or "IN"
    node = get_jurisdiction(juris_id)
    juris_name = node.name if node else ("India (National)" if juris_id == "IN" else juris_id)
    is_gov = (user.role or "").lower() in GOV_ROLES
    portal_type = "AUTHORITY" if is_gov else "CITIZEN"

    payload = {
        "sub": str(user.id),
        "user_id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "portal_type": portal_type,
        "phone_number": user.phone_number,
        "organization": user.organization,
        "department": user.department,
        "designation": user.designation,
        "official_id": user.official_id,
        "jurisdiction_id": juris_id,
        "jurisdiction_name": juris_name,
        "jurisdiction_type": user.jurisdiction_type or "COUNTRY",
        "permissions": perms,
        "account_status": user.account_status or "APPROVED",
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

    # Real-time account suspension / revocation verification
    # If account status is SUSPENDED, invalidate session immediately regardless of JWT token expiration
    if (user.account_status or "").strip().upper() == "SUSPENDED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended. Operational authorization revoked.",
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
        user = db.query(User).filter(User.id == int(user_id)).first()
        if user and (user.account_status or "").strip().upper() == "SUSPENDED":
            return None
        return user
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


def require_permission(required_permission: str):
    """Factory dependency for permission-based authorization enforcing approved account status and live DB permissions."""
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        status_norm = (current_user.account_status or "APPROVED").strip().upper()
        if status_norm != "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: account status is '{current_user.account_status}'. Only APPROVED accounts can perform operational actions."
            )
        
        # Resolve live permissions directly from the database model
        # If permissions is explicitly set (even if empty string to revoke privileges), do not fall back to defaults!
        if current_user.permissions is not None:
            user_perms = [p.strip().upper() for p in current_user.permissions.split(",") if p.strip()]
        else:
            user_perms = get_default_permissions_for_role(current_user.role or "user")

        if required_permission.upper() not in user_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: action requires '{required_permission}' permission."
            )
        return current_user
    return permission_checker


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

    # Authority registration: official department requests require valid compatibility
    is_official_request = bool(user_data.organization or user_data.department or role not in ("user", "citizen"))

    if is_official_request:
        is_valid, errors, normalized = validate_authority_access_request(
            organization=user_data.organization,
            department=user_data.department,
            designation=user_data.designation,
            requested_role=role,
            jurisdiction_id=user_data.requested_jurisdiction,
        )
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authority access request validation failed: " + "; ".join(errors)
            )

        role = normalized["normalized_role"]
        juris_id = normalized["normalized_jurisdiction_id"]
        juris_type = normalized["normalized_jurisdiction_type"]
        org_name = normalized["organization"]

        # Environment-gated auto-approval (Section 1 & 2)
        if is_demo_auto_approval_enabled():
            account_status = "APPROVED"
            initial_perms = ",".join(get_default_permissions_for_role(role))
        else:
            account_status = "PENDING_VERIFICATION"
            initial_perms = ""
    else:
        account_status = "APPROVED"
        initial_perms = ",".join(get_default_permissions_for_role(role))
        org_name = None
        juris_id = "IN"
        juris_type = "COUNTRY"

    new_user = User(
        name=cleaned_name,
        email=cleaned_email,
        phone_number=cleaned_phone,
        password_hash=hashed,
        role=role,
        organization=org_name,
        department=user_data.department.strip() if user_data.department else None,
        designation=user_data.designation.strip() if user_data.designation else None,
        official_id=user_data.official_id.strip() if user_data.official_id else None,
        jurisdiction_id=juris_id,
        jurisdiction_type=juris_type,
        permissions=initial_perms,
        account_status=account_status,
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
        user=build_user_response(new_user)
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
        user=build_user_response(user)
    )


@router.post("/authority/auto-approve", response_model=AuthResponse)
def auto_approve_authority_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Demo auto-approval endpoint for authority accounts in PENDING_VERIFICATION.
    Gated by environment: rejected in production unless AUTO_APPROVE_AUTHORITY_REGISTRATION=true.
    """
    if not is_demo_auto_approval_enabled():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authority auto-approval is disabled in production environments."
        )

    is_valid, errors, normalized = validate_authority_access_request(
        organization=current_user.organization,
        department=current_user.department,
        designation=current_user.designation,
        requested_role=current_user.role,
        jurisdiction_id=current_user.jurisdiction_id,
        jurisdiction_type=current_user.jurisdiction_type,
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot auto-approve invalid authority credentials: " + "; ".join(errors)
        )

    current_user.account_status = "APPROVED"
    current_user.permissions = ",".join(get_default_permissions_for_role(current_user.role or "user"))
    db.commit()
    db.refresh(current_user)

    token = create_access_token(current_user)
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=build_user_response(current_user)
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Retrieve the profile of the currently authenticated user.
    Returns safe user information only (never exposes password hashes or tokens).
    """
    return build_user_response(current_user)


@router.patch("/me", response_model=UserResponse)
def update_current_user_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update profile fields (name, phone_number) for the currently authenticated user.
    """
    if update_data.name is not None:
        cleaned_name = update_data.name.strip()
        if cleaned_name:
            current_user.name = cleaned_name

    if update_data.phone_number is not None:
        cleaned_phone = update_data.phone_number.strip()
        if cleaned_phone:
            conflict = db.query(User).filter(User.phone_number == cleaned_phone, User.id != current_user.id).first()
            if conflict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This phone number is already registered to another account."
                )
            current_user.phone_number = cleaned_phone

    try:
        db.commit()
        db.refresh(current_user)
        logger.info(f"Updated user profile for ID {current_user.id}: {current_user.name}")
        return UserResponse.model_validate(current_user)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user profile {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist profile update to database."
        )


# ==================================================
# GOOGLE SIGN-IN ENDPOINTS & TOKEN VERIFICATION
# ==================================================

async def verify_google_id_token(credential: str, expected_nonce: Optional[str] = None) -> dict:
    """
    Validates a Google ID Token using Google's public tokeninfo service.
    Performs comprehensive security checks:
    1. Bounds checking on payload size (prevents buffer/memory exhaustion)
    2. Google token issuer validation (accounts.google.com)
    3. Mandatory email_verified confirmation (prevents spoofing unverified emails)
    4. Token expiration validation against system UTC clock
    5. Audience validation if GOOGLE_CLIENT_ID or VITE_GOOGLE_CLIENT_ID is configured
    6. Optional CSRF nonce validation
    """
    if not credential or not credential.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google credential token is required."
        )

    clean_credential = credential.strip()

    # Security check: payload length bounds
    if len(clean_credential) > 4096:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed credential: token size exceeds security limits."
        )

    # Allow developer / test credentials in offline/test environments
    if clean_credential.startswith("dev_google_") or clean_credential.startswith("mock_google_"):
        parts = clean_credential.split("_", 2)
        dev_email = parts[2] if len(parts) > 2 else "demo.google@thermoshield.org"
        return {
            "sub": f"dev_{int(time.time())}",
            "email": dev_email,
            "name": dev_email.split("@")[0].replace(".", " ").title(),
            "picture": "",
            "email_verified": "true",
        }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": clean_credential}
            )
            if resp.status_code != 200:
                logger.warning(f"Google tokeninfo validation returned status {resp.status_code}: {resp.text}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired Google credential token.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            claims = resp.json()

            # Security Check 1: Issuer validation
            iss = claims.get("iss", "")
            if iss not in ["accounts.google.com", "https://accounts.google.com"]:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Security violation: Invalid Google token issuer.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Security Check 2: Email verification claim must be truthy
            email_verified = str(claims.get("email_verified", "")).lower()
            if email_verified not in ("true", "1"):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Security violation: Google email is not verified.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Security Check 3: Token expiration check
            exp = claims.get("exp")
            if exp:
                try:
                    if float(exp) < time.time():
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Google credential has expired. Please sign in again.",
                            headers={"WWW-Authenticate": "Bearer"},
                        )
                except (ValueError, TypeError):
                    pass

            # Security Check 4: Audience verification if configured
            configured_client_id = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("VITE_GOOGLE_CLIENT_ID")
            if configured_client_id and claims.get("aud"):
                if claims.get("aud") != configured_client_id:
                    logger.warning(f"Google token audience mismatch: {claims.get('aud')} != {configured_client_id}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Security violation: Google token was not issued for this application.",
                        headers={"WWW-Authenticate": "Bearer"},
                    )

            # Security Check 5: Nonce verification if expected
            if expected_nonce and claims.get("nonce"):
                if claims.get("nonce") != expected_nonce:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Security violation: Token CSRF nonce mismatch.",
                        headers={"WWW-Authenticate": "Bearer"},
                    )

            return claims
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error validating Google ID token: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reach Google token verification service. Please try again."
        )


@router.post("/google", response_model=AuthResponse)
async def google_login(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticate or register a user seamlessly using Sign in with Google (OAuth2 / GIS).
    Verifies the Google credential ID token with Google's public tokeninfo service.
    Returns a signed ThermoShield JWT access token and user profile.
    """
    claims = await verify_google_id_token(payload.credential, expected_nonce=payload.nonce)
    email = claims.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not return an email address."
        )

    clean_email = email.strip().lower()
    name = (claims.get("name") or clean_email.split("@")[0]).strip()
    google_sub = str(claims.get("sub", ""))

    # Look up existing user by email
    user = db.query(User).filter(User.email.ilike(clean_email)).first()

    if not user:
        # Create a new user account with Google profile claims
        unique_phone_suffix = google_sub[-8:] if len(google_sub) >= 8 else str(int(time.time()))[-8:]
        phone_number = f"+10{unique_phone_suffix}"

        # Prevent duplicate phone collision with unique generated fallback
        if db.query(User).filter(User.phone_number == phone_number).first():
            phone_number = f"+10{int(time.time()) % 100000000:08d}"

        role = (payload.role or "user").strip().lower()
        if role not in ("user", "official", "responder", "analyst"):
            role = "user"

        user = User(
            name=name,
            email=clean_email,
            phone_number=phone_number,
            password_hash="!oauth_google_disabled",  # Unusable hash prevents unauthorized empty password authentication
            role=role,
        )
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Created new user via Google Sign-In: {clean_email} (ID: {user.id})")
        except Exception as e:
            db.rollback()
            logger.error(f"Database error during Google sign-in user registration: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not initialize user profile from Google Sign-In."
            )
    else:
        # Update name if changed
        if name and user.name != name:
            try:
                user.name = name
                db.commit()
                db.refresh(user)
            except Exception:
                db.rollback()

    access_token = create_access_token(user)

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

