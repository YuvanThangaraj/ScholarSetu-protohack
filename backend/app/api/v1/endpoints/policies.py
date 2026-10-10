import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_official, AuthenticatedUser
from app.models.risk_flag import VerificationFlag
from app.models.audit import AuditEvent
from app.models.application import Application
from app.schemas.policy import RiskFlagResponse, RiskFlagResolveRequest

router = APIRouter(prefix="/policies", tags=["Policies & Verification Rules"])


@router.post(
    "/flags/{flag_id}/resolve",
    response_model=RiskFlagResponse,
    summary="Resolve or override an explainable verification flag",
)
async def resolve_verification_flag(
    flag_id: uuid.UUID,
    resolve_in: RiskFlagResolveRequest,
    db: AsyncSession = Depends(get_db),
    official: AuthenticatedUser = Depends(get_current_official),
):
    """
    Enables official reviewer to annotate and clear a specific discrepancy flag.
    """
    stmt = select(VerificationFlag).where(VerificationFlag.id == flag_id)
    res = await db.execute(stmt)
    flag = res.scalar_one_or_none()
    if not flag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flag not found")

    flag.is_resolved = resolve_in.is_resolved
    flag.resolution_notes = resolve_in.resolution_notes
    db.add(AuditEvent(application_id=flag.application_id, actor_id=official.user_id, actor_role=official.role, action="flag_resolved" if resolve_in.is_resolved else "flag_reopened", reason=resolve_in.resolution_notes))
    await db.commit()
    await db.refresh(flag)
    return flag
