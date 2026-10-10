import uuid
import math
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case

from app.core.database import get_db
from app.core.security import get_current_official, AuthenticatedUser
from app.models.application import Application, ApplicationStatus, RiskLevel
from app.models.profile import Profile
from app.models.scheme import Scheme
from app.models.document import Document
from app.models.risk_flag import VerificationFlag
from app.models.audit import AuditEvent
from app.schemas.application import (
    PaginatedApplicationQueue,
    ApplicationQueueItem,
    ApplicationAuditResponse,
    VerificationDecisionRequest,
    CrossDocSimilarityMetric,
)
from app.schemas.policy import SchemePolicyUpdate, SchemePolicyResponse
from app.schemas.ocr import OCRCorrectionRequest, DocumentResponse, AuditEventResponse
from app.services.cross_checker import cross_checker

router = APIRouter(prefix="/official", tags=["Officials & Nodal Officers"])


# -------------------------------------------------------------
# Officials Verification Queue
# -------------------------------------------------------------
@router.get(
    "/applications/queue",
    response_model=PaginatedApplicationQueue,
    summary="Paginated, filterable queue of pending applications sorted by risk level and date",
)
async def get_application_queue(
    status_filter: Optional[str] = Query(None, description="Filter by status: e.g. pending_review, action_required"),
    risk_filter: Optional[str] = Query(None, description="Filter by risk level: high, medium, low"),
    scheme_id: Optional[uuid.UUID] = Query(None, description="Filter by Scheme ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    official: AuthenticatedUser = Depends(get_current_official),
):
    """
    Returns an intelligently prioritized review queue:
    Sorts HIGH risk applications first, followed by MEDIUM and LOW, ordered chronologically.
    """
    query = (
        select(
            Application,
            Profile.full_name.label("student_name"),
            Profile.st_community_code.label("student_community"),
            Scheme.title.label("scheme_title"),
            func.count(VerificationFlag.id).label("flags_count"),
            func.count(case((VerificationFlag.is_resolved == False, VerificationFlag.id))).label("unresolved_flags_count"),
        )
        .join(Profile, Application.student_id == Profile.id)
        .join(Scheme, Application.scheme_id == Scheme.id)
        .outerjoin(VerificationFlag, Application.id == VerificationFlag.application_id)
        .group_by(Application.id, Profile.full_name, Profile.st_community_code, Scheme.title)
    )

    # Apply filters
    if status_filter:
        query = query.where(Application.status == status_filter.lower())
    else:
        # Default queue excludes drafts
        query = query.where(Application.status.in_([
            ApplicationStatus.SUBMITTED.value,
            ApplicationStatus.UNDER_REVIEW.value,
            ApplicationStatus.RESUBMITTED.value,
            ApplicationStatus.ACTION_REQUIRED.value,
            ApplicationStatus.IN_OCR.value,
        ]))

    if risk_filter:
        query = query.where(Application.risk_level == risk_filter.lower())
    if scheme_id:
        query = query.where(Application.scheme_id == scheme_id)

    # Order priority: HIGH risk first, then MEDIUM, then LOW; then oldest submitted first
    risk_priority = case(
        (Application.risk_level == RiskLevel.HIGH.value, 1),
        (Application.risk_level == RiskLevel.MEDIUM.value, 2),
        (Application.risk_level == RiskLevel.LOW.value, 3),
        else_=4,
    )
    query = query.order_by(risk_priority, Application.submitted_at.asc())

    # Count total
    count_subquery = select(func.count(Application.id)).select_from(Application)
    if status_filter:
        count_subquery = count_subquery.where(Application.status == status_filter.lower())
    if risk_filter:
        count_subquery = count_subquery.where(Application.risk_level == risk_filter.lower())
    if scheme_id:
        count_subquery = count_subquery.where(Application.scheme_id == scheme_id)

    total_count_res = await db.execute(count_subquery)
    total_count = total_count_res.scalar_one() or 0

    # Paginate
    offset = (page - 1) * page_size
    paginated_query = query.offset(offset).limit(page_size)
    results = await db.execute(paginated_query)
    rows = results.all()

    queue_items: List[ApplicationQueueItem] = []
    for app_row, s_name, s_community, sc_title, f_count, unf_count in rows:
        queue_items.append(
            ApplicationQueueItem(
                application_id=app_row.id,
                student_name=s_name,
                student_community=s_community,
                scheme_title=sc_title,
                status=app_row.status,
                risk_level=app_row.risk_level,
                submitted_at=app_row.submitted_at,
                flags_count=f_count,
                unresolved_flags_count=unf_count,
            )
        )

    total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1

    return PaginatedApplicationQueue(
        total_count=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=queue_items,
    )


# -------------------------------------------------------------
# Detailed Audit Payload Endpoint
# -------------------------------------------------------------
@router.get(
    "/applications/{id}/audit",
    response_model=ApplicationAuditResponse,
    summary="Comprehensive audit view: raw fields, OCR summary, similarity matrix, explainable flags",
)
async def get_application_audit(
    id: str,
    db: AsyncSession = Depends(get_db),
    official: AuthenticatedUser = Depends(get_current_official),
):
    """
    Supplies Officials with human-in-the-loop decision evidence:
    - Raw applicant profile & targeted scheme data
    - Side-by-side structured OCR values across all uploaded certificates
    - Cross-document fuzzy matching similarity matrix (RapidFuzz)
    - Full list of explainable verification risk flags with citations
    """
    try:
        app_uuid = uuid.UUID(id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application ID must be a valid UUID")
    app_stmt = select(Application).where(Application.id == app_uuid)

    app_res = await db.execute(app_stmt)
    application = app_res.scalars().first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    # Load Profile
    prof_res = await db.execute(select(Profile).where(Profile.id == application.student_id))
    profile = prof_res.scalar_one_or_none()

    # Load Scheme
    scheme_res = await db.execute(select(Scheme).where(Scheme.id == application.scheme_id))
    scheme = scheme_res.scalar_one_or_none()

    # Load Documents
    docs_res = await db.execute(select(Document).where(Document.application_id == application.id))
    documents = docs_res.scalars().all()

    # Load Flags
    flags_res = await db.execute(select(VerificationFlag).where(VerificationFlag.application_id == application.id))
    flags = flags_res.scalars().all()

    # Construct side-by-side OCR summary
    docs_ocr_summary: Dict[str, Any] = {}
    for d in documents:
        docs_ocr_summary[d.doc_type] = {
            "document_id": str(d.id),
            "file_name": d.file_name,
            "status": d.processing_status,
            "extracted_fields": d.ocr_extracted_data.get("extracted_fields", {}) if d.ocr_extracted_data else {},
            "confidence_score": d.ocr_extracted_data.get("confidence_score") if d.ocr_extracted_data else None,
        }

    # Generate live cross-document similarity matrix
    profile_dict = {
        "full_name": profile.full_name if profile else "",
        "annual_income": profile.annual_income if profile else 0.0,
        "institution_name": (profile.institution_name or profile.institution_code) if profile else "",
        "st_community_code": profile.st_community_code if profile else "",
    }
    raw_ocr_map = {d.doc_type: d.ocr_extracted_data for d in documents if d.ocr_extracted_data}
    cross_calc = cross_checker.evaluate_consistency(profile_dict, raw_ocr_map)
    
    matrix_metrics = [
        CrossDocSimilarityMetric(**m) for m in cross_calc.get("similarity_matrix", [])
    ]

    return ApplicationAuditResponse(
        application_id=application.id,
        status=application.status,
        risk_level=application.risk_level,
        submitted_at=application.submitted_at,
        student_profile=profile,
        scheme_details=scheme,
        documents_ocr_summary=docs_ocr_summary,
        cross_document_similarity_matrix=matrix_metrics,
        explainable_risk_flags=flags,
        official_remarks=application.official_remarks,
        verified_at=application.verified_at,
    )


# -------------------------------------------------------------
# Human-In-The-Loop Decision Endpoint
# -------------------------------------------------------------
@router.post(
    "/applications/{id}/verify",
    response_model=ApplicationAuditResponse,
    summary="Human-in-the-loop decision endpoint (APPROVE, REQUEST_DEFICIENCY, REJECT)",
)
async def verify_application(
    id: str,
    decision_in: VerificationDecisionRequest,
    db: AsyncSession = Depends(get_db),
    official: AuthenticatedUser = Depends(get_current_official),
):
    """
    Submits official human adjudication:
    - 'APPROVE': Grants scholarship qualification
    - 'REQUEST_DEFICIENCY': Requests revised certificate from candidate
    - 'REJECT': Disqualifies application with clear audit justification
    """
    valid_decisions = ["APPROVE", "REQUEST_DEFICIENCY", "REJECT"]
    decision_upper = decision_in.decision.upper()
    if decision_upper not in valid_decisions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid decision. Allowed actions: {valid_decisions}",
        )

    try:
        app_uuid = uuid.UUID(id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application ID must be a valid UUID")
    stmt = select(Application).where(Application.id == app_uuid)

    res = await db.execute(stmt)
    application = res.scalars().first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    # Map decision to application status
    old_status = application.status
    if decision_upper == "APPROVE":
        application.status = ApplicationStatus.APPROVED.value
    elif decision_upper == "REQUEST_DEFICIENCY":
        application.status = ApplicationStatus.ACTION_REQUIRED.value
    elif decision_upper == "REJECT":
        application.status = ApplicationStatus.REJECTED.value

    application.official_remarks = decision_in.comments
    application.verified_by = official.user_id
    application.verified_at = datetime.now(timezone.utc)
    db.add(AuditEvent(application_id=application.id, actor_id=official.user_id, actor_role=official.role, action=decision_upper.lower(), old_status=old_status, new_status=application.status, reason=decision_in.comments))

    await db.commit()
    await db.refresh(application)

    # Return refreshed audit payload
    return await get_application_audit(str(application.id), db, official)


@router.patch("/documents/{document_id}/ocr", response_model=DocumentResponse)
async def correct_ocr(document_id: uuid.UUID, correction: OCRCorrectionRequest, db: AsyncSession = Depends(get_db), official: AuthenticatedUser = Depends(get_current_official)):
    document = (await db.execute(select(Document).where(Document.id == document_id))).scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    data = dict(document.ocr_extracted_data or {})
    data["extracted_fields"] = correction.extracted_fields
    data["corrected_by"] = str(official.user_id)
    data["correction_reason"] = correction.reason
    data["correction_version"] = int(data.get("correction_version", 0)) + 1
    document.ocr_extracted_data = data
    db.add(AuditEvent(application_id=document.application_id, actor_id=official.user_id, actor_role=official.role, action="ocr_corrected", reason=correction.reason))
    await db.commit()
    await db.refresh(document)
    return document


@router.get("/applications/{id}/audit-history", response_model=List[AuditEventResponse])
async def get_audit_history(id: uuid.UUID, db: AsyncSession = Depends(get_db), official: AuthenticatedUser = Depends(get_current_official)):
    events = (await db.execute(select(AuditEvent).where(AuditEvent.application_id == id).order_by(AuditEvent.created_at.asc()))).scalars().all()
    return events


# -------------------------------------------------------------
# Dynamic Policy Rules Modification
# -------------------------------------------------------------
@router.put(
    "/policies/{scheme_id}",
    response_model=SchemePolicyResponse,
    summary="Update policy limits and criteria without restarting the service",
)
async def update_scheme_policy(
    scheme_id: uuid.UUID,
    policy_in: SchemePolicyUpdate,
    db: AsyncSession = Depends(get_db),
    official: AuthenticatedUser = Depends(get_current_official),
):
    """
    Hot-reloads and versions scholarship policy rules:
    Allows officials to adjust income limits, qualifying merit cutoffs, and eligible tribal quotas dynamically.
    """
    stmt = select(Scheme).where(Scheme.id == scheme_id)
    res = await db.execute(stmt)
    scheme = res.scalar_one_or_none()
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheme not found")

    update_data = policy_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(scheme, field, value)

    # Increment policy version
    scheme.version += 1
    await db.commit()
    await db.refresh(scheme)
    return scheme
