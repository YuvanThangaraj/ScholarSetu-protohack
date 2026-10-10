import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Index, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


class Profile(Base):
    """
    Student User Profile model linked to Supabase Auth User ID.
    """
    __tablename__ = "profiles"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(Uuid(as_uuid=True), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    st_community_code = Column(String(100), nullable=False, index=True)  # e.g., "GOND", "BHIL", "SANTHAL", "MUNDA"
    annual_income = Column(Float, nullable=False)
    course_name = Column(String(255), nullable=False)  # e.g., "B.Tech Computer Science"
    institution_code = Column(String(100), nullable=False, index=True)  # e.g., "IITB01", "NITR02"
    institution_name = Column(String(255), nullable=True)
    gpa_marks = Column(Float, nullable=False)  # Percentage or converted equivalent (0 - 100)
    phone_number = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    applications = relationship("Application", back_populates="student", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Profile id={self.id} name={self.full_name} community={self.st_community_code}>"
