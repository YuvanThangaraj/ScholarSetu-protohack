import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, DateTime, Uuid, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class Scheme(Base):
    """
    Scholarship Scheme Policy model for Scheduled Tribe (ST) students.
    Supports versioning and dynamic criteria configuration.
    """
    __tablename__ = "schemes"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False, index=True)
    code = Column(String(50), nullable=True, unique=True)
    ministry = Column(String(255), nullable=False, default="Ministry of Tribal Affairs")
    provider = Column(String(255), nullable=False, default="Ministry of Tribal Affairs")
    description = Column(Text, nullable=True)
    eligibility = Column(Text, nullable=True)
    education_level = Column(String(255), nullable=True)
    income_criteria = Column(Text, nullable=True)
    benefits = Column(Text, nullable=True)
    required_documents = Column(JSON, nullable=False, default=list)
    application_window = Column(String(255), nullable=True)
    deadline = Column(String(255), nullable=True)
    scheme_status = Column(String(50), nullable=False, default="active")
    official_url = Column(String(1024), nullable=False, default="https://tribal.nic.in/Scholarship.aspx")
    last_verified_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    max_income_limit = Column(Float, nullable=True)
    min_marks_percentage = Column(Float, nullable=True, default=0.0)
    eligible_communities = Column(JSON, nullable=False, default=list)  # e.g., ["GOND", "SANTHAL", "BHIL"] or ["*"]
    version = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    scholarship_amount = Column(Float, nullable=True)  # Disbursement amount in INR
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    applications = relationship("Application", back_populates="scheme")

    def __repr__(self) -> str:
        return f"<Scheme id={self.id} title={self.title} v={self.version}>"
