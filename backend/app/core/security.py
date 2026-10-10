import uuid
import logging
from typing import Optional, Dict, Any, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings

logger = logging.getLogger(__name__)

security_scheme = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# Dev-mode synthetic users (only used when ENVIRONMENT == "development")
# ---------------------------------------------------------------------------
_DEV_STUDENT_UUID = uuid.UUID("d3b07384-d113-40e1-a080-69018447d2a5")
_DEV_OFFICIAL_UUID = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
_DEMO_ANANYA_UUID = uuid.UUID("4c8d2a8f-9c4f-4d39-8f0c-2c0f2e8a1001")
_DEMO_RAHUL_UUID = uuid.UUID("4c8d2a8f-9c4f-4d39-8f0c-2c0f2e8a1002")

_DEV_TOKENS: Dict[str, Dict[str, Any]] = {
    "dev-student": {
        "sub": str(_DEV_STUDENT_UUID),
        "email": "student@dev.local",
        "role": "student",
        "roles": ["student"],
        "user_metadata": {"full_name": "Ramesh Koram (Dev)", "name": "Ramesh Koram (Dev)"},
        "app_metadata": {"role": "student", "roles": ["student"]},
    },
    "dev-official": {
        "sub": str(_DEV_OFFICIAL_UUID),
        "email": "official@dev.local",
        "role": "official",
        "roles": ["official"],
        "user_metadata": {"full_name": "Verification Officer (Dev)", "name": "Verification Officer (Dev)"},
        "app_metadata": {"role": "official", "roles": ["official"]},
    },
    "demo-ananya-kumar": {
        "sub": str(_DEMO_ANANYA_UUID),
        "email": "student.demo@example.com",
        "role": "student",
        "roles": ["student"],
        "user_metadata": {"full_name": "Ananya Kumar", "name": "Ananya Kumar"},
        "app_metadata": {"role": "student", "roles": ["student"]},
    },
    "demo-rahul-sharma": {
        "sub": str(_DEMO_RAHUL_UUID),
        "email": "officer.demo@example.com",
        "role": "official",
        "roles": ["official"],
        "user_metadata": {"full_name": "Rahul Sharma", "name": "Rahul Sharma"},
        "app_metadata": {"role": "official", "roles": ["official"]},
    },
}

_DEV_DEMO_EMAIL_TO_TOKEN = {
    "student.demo@example.com": "demo-ananya-kumar",
    "officer.demo@example.com": "demo-rahul-sharma",
}

_DEV_DEMO_PASSWORDS = {
    "student.demo@example.com": "AnanyaDemo!2026",
    "officer.demo@example.com": "RahulDemo!2026",
}


def _is_dev_mode() -> bool:
    return settings.ENVIRONMENT.lower() in ("development", "dev")


class AuthenticatedUser:
    def __init__(self, payload: Dict[str, Any]):
        self.raw_payload = payload
        try:
            self.user_id = uuid.UUID(str(payload["sub"]))
        except (KeyError, ValueError, TypeError):
            raise HTTPException(status_code=401, detail="Token subject must be a UUID")
        self.email = payload.get("email")
        app_metadata = payload.get("app_metadata") or {}
        user_metadata = payload.get("user_metadata") or {}
        self.role = str(app_metadata.get("role") or payload.get("role") or user_metadata.get("role") or "").lower()
        claim_roles = app_metadata.get("roles") or payload.get("roles") or []
        self.roles = list(({self.role, *[str(r).lower() for r in claim_roles if r]} - {""}))
        self.full_name = user_metadata.get("full_name") or user_metadata.get("name")

    def is_official(self) -> bool:
        return bool({"official", "admin", "reviewer", "nodal_officer"}.intersection(self.roles))

    def is_student(self) -> bool:
        return bool({"student"}.intersection(self.roles))


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)) -> AuthenticatedUser:
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token", headers={"WWW-Authenticate": "Bearer"})

    token = credentials.credentials

    # --- Dev-mode token bypass ---
    if _is_dev_mode() and token in _DEV_TOKENS:
        logger.info("DEV AUTH: Authenticated via dev token '%s'", token)
        return AuthenticatedUser(_DEV_TOKENS[token])

    # --- Production JWT validation ---
    if not settings.SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=503, detail="Authentication is not configured")
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            audience=settings.JWT_AUDIENCE,
            options={"verify_aud": bool(settings.JWT_AUDIENCE)},
        )
        return AuthenticatedUser(payload)
    except (JWTError, HTTPException) as exc:
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(status_code=401, detail="Invalid or expired authentication credentials", headers={"WWW-Authenticate": "Bearer"})


def require_role(allowed_roles: List[str]):
    async def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        allowed = {r.lower() for r in allowed_roles}
        if not (allowed.intersection(current_user.roles) or ("admin" in current_user.roles)):
            raise HTTPException(status_code=403, detail="Insufficient role for this operation")
        return current_user
    return role_checker


async def get_current_official(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    if not user.is_official():
        raise HTTPException(status_code=403, detail="Official access privileges required")
    return user


async def get_current_student(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    if not user.is_student():
        raise HTTPException(status_code=403, detail="Student access privileges required")
    return user
