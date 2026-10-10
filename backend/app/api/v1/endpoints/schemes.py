import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user, require_role, AuthenticatedUser
from app.models.scheme import Scheme
from app.schemas.policy import SchemePolicyCreate, SchemePolicyResponse, SchemePolicyUpdate

router = APIRouter(prefix="/schemes", tags=["Scholarship Schemes"])


@router.get(
    "",
    response_model=List[SchemePolicyResponse],
    summary="List all active scholarship schemes",
)
async def list_schemes(
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve list of government scholarship schemes available for ST candidates."""
    query = select(Scheme)
    if is_active is not None:
        query = query.where(Scheme.is_active == is_active)
    query = query.order_by(Scheme.title.asc())
    res = await db.execute(query)
    return res.scalars().all()


@router.get(
    "/{id}",
    response_model=SchemePolicyResponse,
    summary="Get scholarship scheme by ID",
)
async def get_scheme(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Fetch details, quota limits, and qualification rules for a specific scheme."""
    stmt = select(Scheme).where(Scheme.id == id)
    res = await db.execute(stmt)
    scheme = res.scalar_one_or_none()
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")
    return scheme


@router.post(
    "",
    response_model=SchemePolicyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new scholarship scheme (Official/Admin only)",
)
async def create_scheme(
    scheme_in: SchemePolicyCreate,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(require_role(["official", "admin"])),
):
    """Register a new scholarship program with eligibility ceilings."""
    scheme = Scheme(
        title=scheme_in.title,
        code=scheme_in.code,
        ministry=scheme_in.ministry,
        description=scheme_in.description,
        max_income_limit=scheme_in.max_income_limit,
        min_marks_percentage=scheme_in.min_marks_percentage,
        eligible_communities=scheme_in.eligible_communities,
        is_active=scheme_in.is_active,
        scholarship_amount=scheme_in.scholarship_amount,
        version=1,
    )
    db.add(scheme)
    await db.commit()
    await db.refresh(scheme)
    return scheme
