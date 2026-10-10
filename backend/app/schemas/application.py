import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.student import ProfileResponse
from app.schemas.policy import SchemePolicyResponse, RiskFlagResponse
from app.schemas.ocr import DocumentResponse


class ApplicationBase(BaseModel):
    scheme_id: uuid.UUID


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    risk_level: Optional[str] = None
    official_remarks: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    scheme_id: uuid.UUID
    status: str
    risk_level: str
    submitted_at: Optional[datetime] = None
    official_remarks: Optional[str] = None
    verified_by: Optional[uuid.UUID] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationDetailResponse(ApplicationResponse):
    student: Optional[ProfileResponse] = None
    scheme: Optional[SchemePolicyResponse] = None
    documents: List[DocumentResponse] = []
    verification_flags: List[RiskFlagResponse] = []


class VerificationDecisionRequest(BaseModel):
    decision: str = Field(
        ...,
        description="Decision outcome: 'APPROVE', 'REQUEST_DEFICIENCY', or 'REJECT'",
    )
    comments: str = Field(..., min_length=3, description="Official review notes or deficiency requirements")


class CrossDocSimilarityMetric(BaseModel):
    field_name: str
    doc_1: str
    value_1: Optional[str] = None
    doc_2: str
    value_2: Optional[str] = None
    similarity_score: float
    status: str  # "MATCH", "PARTIAL_MATCH", "MISMATCH"


class ApplicationAuditResponse(BaseModel):
    application_id: uuid.UUID
    status: str
    risk_level: str
    submitted_at: Optional[datetime] = None
    
    # Raw application fields & Student profile
    student_profile: ProfileResponse
    scheme_details: SchemePolicyResponse
    
    # Extracted document OCR structured fields side-by-side
    documents_ocr_summary: Dict[str, Any]
    
    # Cross-document similarity matrix
    cross_document_similarity_matrix: List[CrossDocSimilarityMetric]
    
    # Array of explainable evidence / risk flags
    explainable_risk_flags: List[RiskFlagResponse]
    
    # Human-in-the-loop review info
    official_remarks: Optional[str] = None
    verified_at: Optional[datetime] = None


class ApplicationQueueItem(BaseModel):
    application_id: uuid.UUID
    student_name: str
    student_community: str
    scheme_title: str
    status: str
    risk_level: str
    submitted_at: Optional[datetime] = None
    flags_count: int
    unresolved_flags_count: int

    model_config = ConfigDict(from_attributes=True)


class PaginatedApplicationQueue(BaseModel):
    total_count: int
    page: int
    page_size: int
    total_pages: int
    items: List[ApplicationQueueItem]
