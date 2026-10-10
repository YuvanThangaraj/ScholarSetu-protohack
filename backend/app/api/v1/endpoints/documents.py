import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user, AuthenticatedUser
from app.models.document import Document
from app.models.application import Application
from app.models.profile import Profile
from app.services.storage_service import storage_service
from app.schemas.ocr import DocumentResponse

router = APIRouter(prefix="/documents", tags=["Document AI & Certificates"])


@router.get(
    "/{id}",
    response_model=DocumentResponse,
    summary="Get document details and extracted OCR status",
)
async def get_document(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieves document processing status and raw/structured OCR fields."""
    stmt = select(Document).join(Application).join(Profile).where(Document.id == id)
    res = await db.execute(stmt)
    document = res.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if not user.is_official():
        app = (await db.execute(select(Application).where(Application.id == document.application_id))).scalar_one_or_none()
        owner = (await db.execute(select(Profile).where(Profile.id == app.student_id, Profile.user_id == user.user_id))).scalar_one_or_none() if app else None
        if not owner:
            raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.get(
    "/application/{application_id}",
    response_model=List[DocumentResponse],
    summary="List all documents associated with an application",
)
async def get_application_documents(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Returns all certificate records and OCR outcomes for an application."""
    stmt = select(Document).join(Application).join(Profile).where(Document.application_id == application_id)
    res = await db.execute(stmt)
    documents = res.scalars().all()
    if not user.is_official():
        owned = (await db.execute(select(Application).join(Profile).where(Application.id == application_id, Profile.user_id == user.user_id))).scalar_one_or_none()
        if not owned:
            raise HTTPException(status_code=404, detail="Application not found")
    return documents


@router.get("/{id}/download")
async def download_document(id: uuid.UUID, db: AsyncSession = Depends(get_db), user: AuthenticatedUser = Depends(get_current_user)):
    document = (await db.execute(select(Document).join(Application).where(Document.id == id))).scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    app = (await db.execute(select(Application).where(Application.id == document.application_id))).scalar_one()
    if not user.is_official():
        owner = (await db.execute(select(Profile).where(Profile.id == app.student_id, Profile.user_id == user.user_id))).scalar_one_or_none()
        if not owner:
            raise HTTPException(status_code=404, detail="Document not found")
    signed = await storage_service.signed_url(document.file_path)
    if signed:
        from fastapi.responses import RedirectResponse
        return RedirectResponse(signed)
    from fastapi.responses import Response
    try:
        data = await storage_service.read_document(document.file_path)
    except (FileNotFoundError, PermissionError):
        raise HTTPException(status_code=404, detail="Stored document unavailable")
    return Response(content=data, media_type=document.mime_type or "application/octet-stream", headers={"Content-Disposition": f'attachment; filename="{document.file_name or "document"}"'})
