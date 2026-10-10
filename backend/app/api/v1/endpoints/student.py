import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_student, AuthenticatedUser
from app.models.profile import Profile
from app.models.scheme import Scheme
from app.models.application import Application, ApplicationStatus, RiskLevel
from app.models.document import Document, DocumentProcessingStatus
from app.models.risk_flag import VerificationFlag
from app.models.audit import AuditEvent
from app.schemas.student import (
    ProfileCreate,
    ProfileUpdate,
    ProfileResponse,
    StudentSchemeMatchResponse,
)
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationDetailResponse,
)
from app.schemas.policy import SchemePolicyResponse, RiskFlagResponse
from app.schemas.ocr import DocumentResponse, DocumentUploadResponse
from app.services.eligibility_engine import eligibility_engine
from app.services.storage_service import storage_service
from app.services.document_tasks import process_document_pipeline_task
from app.services.ocr_engine import ocr_engine

router = APIRouter(prefix="/student", tags=["Student Portal"])


# -------------------------------------------------------------
# Student Profile Management
# -------------------------------------------------------------
@router.get(
    "/profile",
    response_model=ProfileResponse,
    summary="Get current student profile",
)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_student),
):
    """Retrieve the logged-in student's profile."""
    stmt = select(Profile).where(Profile.user_id == user.user_id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found. Please create your profile first.",
        )
    return profile


@router.post(
    "/profile",
    response_model=ProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or initialize student profile",
)
async def create_my_profile(
    profile_in: ProfileCreate,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_student),
):
    """Register or initialize student demographic, academic, and tribal community details (upserts if already created)."""
    stmt = select(Profile).where(Profile.user_id == user.user_id)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        # Upsert: update existing profile fields
        existing.full_name = profile_in.full_name
        existing.st_community_code = profile_in.st_community_code.upper().strip()
        existing.annual_income = profile_in.annual_income
        existing.course_name = profile_in.course_name
        existing.institution_code = profile_in.institution_code
        existing.institution_name = profile_in.institution_name
        existing.gpa_marks = profile_in.gpa_marks
        if profile_in.phone_number:
            existing.phone_number = profile_in.phone_number
        await db.commit()
        await db.refresh(existing)
        return existing

    profile = Profile(
        user_id=user.user_id,
        full_name=profile_in.full_name,
        st_community_code=profile_in.st_community_code.upper().strip(),
        annual_income=profile_in.annual_income,
        course_name=profile_in.course_name,
        institution_code=profile_in.institution_code,
        institution_name=profile_in.institution_name,
        gpa_marks=profile_in.gpa_marks,
        phone_number=profile_in.phone_number,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


@router.put(
    "/profile",
    response_model=ProfileResponse,
    summary="Update existing student profile",
)
async def update_my_profile(
    profile_in: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_student),
):
    """Update profile fields for currently authenticated student."""
    stmt = select(Profile).where(Profile.user_id == user.user_id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found. Please create profile first.",
        )

    for field, val in profile_in.model_dump(exclude_unset=True).items():
        if val is not None:
            if field == "st_community_code":
                val = str(val).upper().strip()
            setattr(profile, field, val)
    await db.commit()
    await db.refresh(profile)
    return profile


# -------------------------------------------------------------
# Scheme Matching Endpoint
# -------------------------------------------------------------
@router.get(
    "/schemes/match",
    response_model=StudentSchemeMatchResponse,
    summary="Run AI matching algorithm based on student profile",
)
async def match_schemes_for_student(
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_student),
):
    """
    Evaluates student profile criteria against all active scholarship schemes.
    Returns:
    - Overall eligibility status for each scheme
    - Composite matching score (0-100%)
    - Granular criteria breakdown (Income ceiling, minimum marks, community eligibility)
    """
    stmt = select(Profile).where(Profile.user_id == user.user_id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found. Please complete profile registration before matching schemes.",
        )

    schemes_stmt = select(Scheme).where(Scheme.is_active == True)
    schemes_res = await db.execute(schemes_stmt)
    active_schemes = schemes_res.scalars().all()

    match_results = eligibility_engine.match_all_schemes(profile, active_schemes)
    eligible_count = sum(1 for m in match_results if m.is_eligible)

    return StudentSchemeMatchResponse(
        student_id=profile.id,
        student_name=profile.full_name,
        community_code=profile.st_community_code,
        annual_income=profile.annual_income,
        gpa_marks=profile.gpa_marks,
        total_schemes_evaluated=len(active_schemes),
        eligible_schemes_count=eligible_count,
        matches=match_results,
    )


# -------------------------------------------------------------
# Application Submission & Management
# -------------------------------------------------------------
@router.post(
    "/applications",
    response_model=ApplicationDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Draft or submit a new scheme application",
)
async def create_application(
    app_in: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_student),
):
    """Creates a scholarship application draft for a specific scheme."""
    # Find student profile
    profile_stmt = select(Profile).where(Profile.user_id == user.user_id)
    profile_res = await db.execute(profile_stmt)
    profile = profile_res.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student profile must be created before applying for schemes.",
        )

    # Check scheme exists
    scheme_stmt = select(Scheme).where(Scheme.id == app_in.scheme_id, Scheme.is_active == True)
    scheme_res = await db.execute(scheme_stmt)
    scheme = scheme_res.scalar_one_or_none()
    if not scheme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specified scholarship scheme not found or is currently inactive.",
        )

    # Check existing application for same scheme
    existing_stmt = select(Application).where(
        Application.student_id == profile.id,
        Application.scheme_id == app_in.scheme_id,
        Application.status.notin_([ApplicationStatus.REJECTED.value]),
    )
    existing_res = await db.execute(existing_stmt)
    existing_app = existing_res.scalar_one_or_none()
    if existing_app:
        docs = (await db.execute(select(Document).where(Document.application_id == existing_app.id))).scalars().all()
        flags = (await db.execute(select(VerificationFlag).where(VerificationFlag.application_id == existing_app.id))).scalars().all()
        return _build_application_detail(existing_app, profile, scheme, docs, flags)

    new_app = Application(
        student_id=profile.id,
        scheme_id=app_in.scheme_id,
        status=ApplicationStatus.DRAFT.value,
        risk_level=RiskLevel.LOW.value,
    )
    db.add(new_app)
    await db.commit()
    await db.refresh(new_app)
    db.add(AuditEvent(application_id=new_app.id, actor_id=user.user_id, actor_role=user.role, action="created", new_status=new_app.status, reason="Application draft created"))
    await db.commit()
    return _build_application_detail(new_app, profile, scheme, [], [])


@router.post("/applications/{id}/submit", response_model=ApplicationResponse)
async def submit_application(id: uuid.UUID, db: AsyncSession = Depends(get_db), user: AuthenticatedUser = Depends(get_current_student)):
    """Validate and submit an owned draft/resubmission for official review."""
    profile = (await db.execute(select(Profile).where(Profile.user_id == user.user_id))).scalar_one_or_none()
    app = (await db.execute(select(Application).where(Application.id == id, Application.student_id == (profile.id if profile else None)))).scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.status not in {ApplicationStatus.DRAFT.value, ApplicationStatus.ACTION_REQUIRED.value, ApplicationStatus.RESUBMITTED.value}:
        raise HTTPException(status_code=409, detail=f"Application cannot be submitted from status '{app.status}'")
    docs = (await db.execute(select(Document).where(Document.application_id == app.id))).scalars().all()
    required = {"caste_cert", "income_cert", "marksheet"}
    uploaded = {d.doc_type for d in docs}
    missing = sorted(required - uploaded)
    if missing:
        raise HTTPException(status_code=422, detail={"message": "Required documents are missing", "missing_documents": missing})
    if any(d.processing_status != DocumentProcessingStatus.PROCESSED.value for d in docs):
        raise HTTPException(status_code=409, detail="All uploaded documents must finish OCR before submission")
    old = app.status
    app.status = ApplicationStatus.RESUBMITTED.value if old == ApplicationStatus.ACTION_REQUIRED.value else ApplicationStatus.SUBMITTED.value
    app.submitted_at = datetime.now(timezone.utc)
    db.add(AuditEvent(application_id=app.id, actor_id=user.user_id, actor_role=user.role, action="submitted", old_status=old, new_status=app.status, reason="Required profile data and documents validated"))
    await db.commit()
    await db.refresh(app)
    return app


def _build_application_detail(app: Application, profile: Optional[Profile], scheme: Optional[Scheme], documents: list, flags: list) -> ApplicationDetailResponse:
    return ApplicationDetailResponse(
        id=app.id,
        student_id=app.student_id,
        scheme_id=app.scheme_id,
        status=app.status,
        risk_level=app.risk_level,
        submitted_at=app.submitted_at,
        official_remarks=app.official_remarks,
        verified_by=app.verified_by,
        verified_at=app.verified_at,
        created_at=app.created_at,
        updated_at=app.updated_at,
        student=ProfileResponse.model_validate(profile) if profile else None,
        scheme=SchemePolicyResponse.model_validate(scheme) if scheme else None,
        documents=[DocumentResponse.model_validate(d) for d in documents],
        verification_flags=[RiskFlagResponse.model_validate(f) for f in flags],
    )


@router.get(
    "/applications",
    response_model=List[ApplicationDetailResponse],
    summary="Get all applications for the logged-in student",
)
async def get_my_applications(
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_student),
):
    """Retrieve all current applications, status, scheme details, documents, and risk flags."""
    profile_stmt = select(Profile).where(Profile.user_id == user.user_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if not profile:
        return []

    stmt = select(Application).where(Application.student_id == profile.id).order_by(Application.submitted_at.desc())
    res = await db.execute(stmt)
    apps = res.scalars().all()

    results: List[ApplicationDetailResponse] = []
    for app in apps:
        scheme_stmt = select(Scheme).where(Scheme.id == app.scheme_id)
        scheme = (await db.execute(scheme_stmt)).scalar_one_or_none()

        docs_stmt = select(Document).where(Document.application_id == app.id)
        docs = (await db.execute(docs_stmt)).scalars().all()

        flags_stmt = select(VerificationFlag).where(VerificationFlag.application_id == app.id)
        flags = (await db.execute(flags_stmt)).scalars().all()

        results.append(_build_application_detail(app, profile, scheme, docs, flags))

    return results


@router.post(
    "/applications/{id}/upload-document",
    response_model=DocumentUploadResponse,
    summary="Upload document file and trigger background OCR job",
)
async def upload_document_for_application(
    id: uuid.UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    doc_type: str = Form(..., description="Document type: caste_cert, income_cert, marksheet, bonafide"),
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_student),
):
    """
    Accepts document binary file, stores to Supabase/cloud bucket, creates Document record,
    updates application status to 'in_ocr', and launches asynchronous background OCR processing.
    """
    valid_doc_types = ["caste_cert", "income_cert", "marksheet", "bonafide"]
    if doc_type.lower() not in valid_doc_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid doc_type. Must be one of: {valid_doc_types}",
        )

    # Verify application ownership
    profile = (await db.execute(select(Profile).where(Profile.user_id == user.user_id))).scalar_one_or_none()
    app_stmt = select(Application).where(Application.id == id, Application.student_id == (profile.id if profile else None))
    app_res = await db.execute(app_stmt)
    application = app_res.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if application.status not in {ApplicationStatus.DRAFT.value, ApplicationStatus.ACTION_REQUIRED.value}:
        raise HTTPException(status_code=409, detail=f"Documents cannot be changed while the application is '{application.status}'")

    file_bytes = await file.read()
    try:
        ocr_engine.validate_file(file_bytes, file.content_type, file.filename or "")
    except ValueError as exc:
        raise HTTPException(status_code=415, detail=str(exc))

    # 1. Upload to Storage
    storage_path = await storage_service.upload_document_file(
        application_id=application.id,
        doc_type=doc_type.lower(),
        filename=file.filename or "doc.pdf",
        file_bytes=file_bytes,
        mime_type=file.content_type or "",
    )

    # 2. Persist Document record (a new upload replaces any earlier file of the same type)
    for old_doc in (await db.execute(select(Document).where(Document.application_id == application.id, Document.doc_type == doc_type.lower()))).scalars().all():
        await db.delete(old_doc)
    doc_record = Document(
        application_id=application.id,
        doc_type=doc_type.lower(),
        file_name=file.filename,
        file_path=storage_path,
        mime_type=file.content_type,
        file_size_bytes=str(len(file_bytes)),
        processing_status=DocumentProcessingStatus.PENDING.value,
    )
    db.add(doc_record)
    
    # 3. Status is left untouched: only POST /applications/{id}/submit moves it forward.
    await db.commit()
    await db.refresh(doc_record)

    # 4. Trigger Background OCR and Cross-Checking Job
    background_tasks.add_task(
        process_document_pipeline_task,
        document_id=doc_record.id,
        file_bytes=file_bytes,
        doc_type=doc_type.lower(),
        filename=file.filename or "doc.pdf",
        mime_type=file.content_type,
    )

    return DocumentUploadResponse(
        document_id=doc_record.id,
        application_id=application.id,
        doc_type=doc_record.doc_type,
        processing_status=DocumentProcessingStatus.PENDING.value,
        message="Document uploaded successfully. Background OCR and Cross-Checking initiated.",
    )


@router.get(
    "/applications/{id}/status",
    response_model=ApplicationDetailResponse,
    summary="Fetch application status timeline, documents, and deficiency requests",
)
async def get_application_status(
    id: str,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_student),
):
    """Returns detailed status, list of uploaded documents, and verification flags."""
    try:
        app_uuid = uuid.UUID(id)
        profile_stmt = select(Profile).where(Profile.user_id == user.user_id)
        profile_res = await db.execute(profile_stmt)
        owner = profile_res.scalar_one_or_none()
        stmt = select(Application).where(Application.id == app_uuid, Application.student_id == (owner.id if owner else None))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application ID must be a valid UUID")

    res = await db.execute(stmt)
    application = res.scalars().first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    # Eagerly load associated records
    profile_stmt = select(Profile).where(Profile.id == application.student_id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()

    scheme_stmt = select(Scheme).where(Scheme.id == application.scheme_id)
    scheme = (await db.execute(scheme_stmt)).scalar_one_or_none()

    docs_stmt = select(Document).where(Document.application_id == application.id)
    documents = (await db.execute(docs_stmt)).scalars().all()

    flags_stmt = select(VerificationFlag).where(VerificationFlag.application_id == application.id)
    flags = (await db.execute(flags_stmt)).scalars().all()

    return _build_application_detail(application, profile, scheme, documents, flags)
