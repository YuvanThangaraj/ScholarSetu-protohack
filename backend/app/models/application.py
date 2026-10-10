import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class ApplicationStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    IN_OCR = "under_review"
    PENDING_REVIEW = "under_review"
    ACTION_REQUIRED = "action_required"
    RESUBMITTED = "resubmitted"
    APPROVED = "approved"
    VERIFIED = "verified"
    REJECTED = "rejected"


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Application(Base):
    """
    Scholarship Application submitted by a student for a specific scheme.
    """
    __tablename__ = "applications"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    student_id = Column(Uuid(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    scheme_id = Column(Uuid(as_uuid=True), ForeignKey("schemes.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    status = Column(
        String(50),
        default=ApplicationStatus.DRAFT.value,
        nullable=False,
        index=True
    )
    
    risk_level = Column(
        String(50),
        default=RiskLevel.LOW.value,
        nullable=False,
        index=True
    )
    
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    official_remarks = Column(Text, nullable=True)
    verified_by = Column(Uuid(as_uuid=True), nullable=True)  # Official user_id
    verified_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    student = relationship("Profile", back_populates="applications")
    scheme = relationship("Scheme", back_populates="applications")
    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    verification_flags = relationship("VerificationFlag", back_populates="application", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Application id={self.id} status={self.status} risk={self.risk_level}>"
