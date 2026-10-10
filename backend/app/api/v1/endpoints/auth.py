from typing import Dict, Any, Literal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.config import settings
from app.core.security import get_current_user, AuthenticatedUser, _DEV_DEMO_EMAIL_TO_TOKEN, _DEV_DEMO_PASSWORDS, _DEV_TOKENS

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])


class DemoLoginRequest(BaseModel):
    email: str
    role: Literal["student", "official"]
    password: str


@router.post("/demo-login", summary="Development-only login for seeded demo accounts")
async def demo_login(payload: DemoLoginRequest) -> Dict[str, Any]:
    if settings.ENVIRONMENT.lower() not in ("development", "dev"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo login is disabled")
    token = _DEV_DEMO_EMAIL_TO_TOKEN.get(str(payload.email).lower())
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown demo account")
    if _DEV_DEMO_PASSWORDS.get(str(payload.email).lower()) != payload.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid demo credentials")
    claims = _DEV_TOKENS[token]
    if claims["role"] != payload.role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This demo account belongs to a different portal")
    return {"access_token": token, "token_type": "bearer", "expires_in": None, "user": {"user_id": claims["sub"], "email": claims["email"], "full_name": claims["user_metadata"]["full_name"], "role": claims["role"]}}


@router.get("/me", summary="Get authenticated identity from Supabase JWT")
async def get_my_identity(
    user: AuthenticatedUser = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Validates the bearer token against Supabase JWT secret and returns token claims and user profile.
    """
    return {
        "user_id": str(user.user_id),
        "email": user.email,
        "role": user.role,
        "roles": user.roles,
        "is_official": user.is_official(),
        "is_student": user.is_student(),
        "full_name": user.full_name,
    }
