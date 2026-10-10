import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, Uuid

from app.core.database import Base


class User(Base):
    """
    Shadow user table mirroring Supabase Auth identity for relational integrity and role tracking.
    """
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    supabase_id = Column(Uuid(as_uuid=True), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    role = Column(String(50), nullable=False, default="student")  # "student", "official", "admin"
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
