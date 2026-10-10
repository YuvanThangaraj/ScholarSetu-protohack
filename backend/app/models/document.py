import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Uuid, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class DocumentType(str, enum.Enum):
    INCOME_CERT = "income_cert"
    CASTE_CERT = "caste_cert"
    MARKSHEET = "marksheet"
    BONAFIDE = "bonafide"


class DocumentProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    PROCESSED = "processed"
    FAILED = "failed"


class Document(Base):
    """
    Supporting Document uploaded for a Scholarship Application.
    Stores Supabase storage URI and extracted Document AI OCR data.
    """
    __tablename__ = "documents"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    application_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    doc_type = Column(String(50), nullable=False, index=True)
    file_name = Column(String(255), nullable=True)
    file_path = Column(String(1024), nullable=False)  # Supabase storage URI or object path
    mime_type = Column(String(100), nullable=True, default="application/pdf")
    file_size_bytes = Column(String(50), nullable=True)

    processing_status = Column(
        String(50),
        default=DocumentProcessingStatus.PENDING.value,
        nullable=False,
        index=True,
    )
    ocr_extracted_data = Column(JSON, nullable=True, default=dict)  # Structured extracted attributes & confidence
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    application = relationship("Application", back_populates="documents")

    def __repr__(self) -> str:
        return f"<Document id={self.id} type={self.doc_type} status={self.processing_status}>"
