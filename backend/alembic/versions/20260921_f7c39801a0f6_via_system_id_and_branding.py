"""via_system_id and branding

Revision ID: f7c39801a0f6
Revises: 24a68ccd31fb
Create Date: 2026-09-21 01:10:19.513323
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "f7c39801a0f6"
down_revision: Union[str, None] = "24a68ccd31fb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add optional `interfaces.via_system_id` (EAI hub) and the `branding` table."""
    with op.batch_alter_table("interfaces", schema=None) as batch_op:
        batch_op.add_column(sa.Column("via_system_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_interfaces_via_system_id_systems", "systems", ["via_system_id"], ["id"]
        )
        batch_op.create_index(
            batch_op.f("ix_interfaces_via_system_id"), ["via_system_id"], unique=False
        )

    op.create_table(
        "branding",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_name", sa.String(length=100), nullable=True),
        sa.Column("tagline", sa.String(length=200), nullable=True),
        sa.Column("logo_mime", sa.String(length=50), nullable=True),
        sa.Column("logo_data", sa.LargeBinary(), nullable=True),
        sa.Column("logo_size", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Revert the migration."""
    op.drop_table("branding")
    with op.batch_alter_table("interfaces", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_interfaces_via_system_id"))
        batch_op.drop_constraint("fk_interfaces_via_system_id_systems", type_="foreignkey")
        batch_op.drop_column("via_system_id")
