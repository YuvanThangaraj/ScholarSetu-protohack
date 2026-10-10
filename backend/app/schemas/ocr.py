import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class CasteCertExtracted(BaseModel):
    candidate_name: Optional[str] = None
    community_name: Optional[str] = None
    certificate_number: Optional[str] = None
    issuing_authority: Optional[str] = None
    issue_date: Optional[str] = None
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)


class IncomeCertExtracted(BaseModel):
    candidate_name: Optional[str] = None
    guardian_name: Optional[str] = None
    annual_income: Optional[float] = None
    certificate_number: Optional[str] = None
    issuing_authority: Optional[str] = None
    issue_date: Optional[str] = None
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)


class MarksheetExtracted(BaseModel):
    candidate_name: Optional[str] = None
    institution_name: Optional[str] = None
    course_or_grade: Optional[str] = None
    roll_number: Optional[str] = None
    marks_percentage: Optional[float] = None
    cgpa: Optional[float] = None
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)


class BonafideExtracted(BaseModel):
    candidate_name: Optional[str] = None
    institution_name: Optional[str] = None
    institution_code: Optional[str] = None
    course_name: Optional[str] = None
    academic_year: Optional[str] = None
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)


class GenericOCRExtractedData(BaseModel):
    raw_text: Optional[str] = None
    doc_type: str
    confidence_score: float = 0.0
    extracted_fields: Dict[str, Any] = Field(default_factory=dict)
    bounding_boxes: Optional[List[Dict[str, Any]]] = None
    processed_at: Optional[str] = None


class DocumentBase(BaseModel):
    doc_type: str
    file_path: str


class DocumentCreate(DocumentBase):
    application_id: uuid.UUID
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    file_size_bytes: Optional[str] = None


class DocumentResponse(DocumentBase):
    id: uuid.UUID
    application_id: uuid.UUID
    file_name: Optional[str] = None
    processing_status: str
    ocr_extracted_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentUploadResponse(BaseModel):
    document_id: uuid.UUID
    application_id: uuid.UUID
    doc_type: str
    processing_status: str
    message: str


class OCRCorrectionRequest(BaseModel):
    extracted_fields: Dict[str, Any]
    reason: str = Field(..., min_length=3, max_length=1000)


class AuditEventResponse(BaseModel):
    id: uuid.UUID
    application_id: uuid.UUID
    actor_id: uuid.UUID
    actor_role: str
    action: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
