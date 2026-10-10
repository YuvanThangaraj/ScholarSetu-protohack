import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, String, Text, Uuid
from app.core.database import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(Uuid(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(Uuid(as_uuid=True), nullable=False, index=True)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
