"""Add official scholarship metadata and source verification fields."""
from alembic import op
import sqlalchemy as sa

revision = "0002_official_scheme_metadata"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("schemes")}
    columns = {
        "provider": sa.Column("provider", sa.String(length=255), nullable=True),
        "eligibility": sa.Column("eligibility", sa.Text(), nullable=True),
        "education_level": sa.Column("education_level", sa.String(length=255), nullable=True),
        "income_criteria": sa.Column("income_criteria", sa.Text(), nullable=True),
        "benefits": sa.Column("benefits", sa.Text(), nullable=True),
        "required_documents": sa.Column("required_documents", sa.JSON(), nullable=True),
        "application_window": sa.Column("application_window", sa.String(length=255), nullable=True),
        "deadline": sa.Column("deadline", sa.String(length=255), nullable=True),
        "scheme_status": sa.Column("scheme_status", sa.String(length=50), nullable=True),
        "official_url": sa.Column("official_url", sa.String(length=1024), nullable=True),
        "last_verified_at": sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
    }
    with op.batch_alter_table("schemes") as batch:
        for name, column in columns.items():
            if name not in existing:
                batch.add_column(column)

    # Backfill only structural defaults for pre-existing rows; the seed command
    # replaces old demo rows with verified records before normal operation.
    bind = op.get_bind()
    bind.execute(sa.text("UPDATE schemes SET provider = ministry WHERE provider IS NULL"))
    bind.execute(sa.text("UPDATE schemes SET required_documents = '[]' WHERE required_documents IS NULL"))
    bind.execute(sa.text("UPDATE schemes SET scheme_status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END WHERE scheme_status IS NULL"))
    bind.execute(sa.text("UPDATE schemes SET official_url = 'https://tribal.nic.in/Scholarship.aspx' WHERE official_url IS NULL"))
    bind.execute(sa.text("UPDATE schemes SET last_verified_at = CURRENT_TIMESTAMP WHERE last_verified_at IS NULL"))

    with op.batch_alter_table("schemes") as batch:
        batch.alter_column("provider", existing_type=sa.String(length=255), nullable=False)
        batch.alter_column("required_documents", existing_type=sa.JSON(), nullable=False)
        batch.alter_column("scheme_status", existing_type=sa.String(length=50), nullable=False)
        batch.alter_column("official_url", existing_type=sa.String(length=1024), nullable=False)
        batch.alter_column("last_verified_at", existing_type=sa.DateTime(timezone=True), nullable=False)
        batch.alter_column("max_income_limit", existing_type=sa.Float(), nullable=True)
        batch.alter_column("min_marks_percentage", existing_type=sa.Float(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("schemes") as batch:
        for name in ["last_verified_at", "official_url", "scheme_status", "deadline", "application_window", "required_documents", "benefits", "income_criteria", "education_level", "eligibility", "provider"]:
            batch.drop_column(name)
