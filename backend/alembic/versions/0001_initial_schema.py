"""Initial SCHOLARSETU AI schema.

Revision ID: 0001_initial_schema
"""
from alembic import op
from app.models import Base

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The declarative metadata is the single schema definition; Alembic owns when it is applied.
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
