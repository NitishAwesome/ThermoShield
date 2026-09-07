"""add_performance_indexes

Revision ID: 7c129e4a7d15
Revises: 17e25d5d1399
Create Date: 2026-09-06 01:47:08.251737

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c129e4a7d15'
down_revision: Union[str, Sequence[str], None] = '17e25d5d1399'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create justified query and performance indexes safely."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    def index_exists(table: str, index_name: str) -> bool:
        if table not in inspector.get_table_names():
            return False
        return any(idx.get("name") == index_name for idx in inspector.get_indexes(table))

    # 1. users.phone_number: fast lookup during phone-based login
    if not index_exists("users", "ix_users_phone_number"):
        op.create_index("ix_users_phone_number", "users", ["phone_number"], unique=False)

    # 2. locations.name: fast lookup during location search and geocoder resolution
    if not index_exists("locations", "ix_locations_name"):
        op.create_index("ix_locations_name", "locations", ["name"], unique=False)

    # 3. risks.created_at & risks.risk_level: chronological queries and high/extreme filtering
    if not index_exists("risks", "ix_risks_created_at"):
        op.create_index("ix_risks_created_at", "risks", ["created_at"], unique=False)
    if not index_exists("risks", "ix_risks_risk_level"):
        op.create_index("ix_risks_risk_level", "risks", ["risk_level"], unique=False)

    # 4. alerts.created_at & alerts.status: alert history sorting and pending worker polling
    if not index_exists("alerts", "ix_alerts_created_at"):
        op.create_index("ix_alerts_created_at", "alerts", ["created_at"], unique=False)
    if not index_exists("alerts", "ix_alerts_status"):
        op.create_index("ix_alerts_status", "alerts", ["status"], unique=False)

    # 5. interventions.created_at: chronological audit trail of municipal actions
    if not index_exists("interventions", "ix_interventions_created_at"):
        op.create_index("ix_interventions_created_at", "interventions", ["created_at"], unique=False)


def downgrade() -> None:
    """Remove performance indexes safely."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    def drop_if_exists(table: str, index_name: str) -> None:
        if table in inspector.get_table_names() and any(idx.get("name") == index_name for idx in inspector.get_indexes(table)):
            op.drop_index(index_name, table_name=table)

    drop_if_exists("interventions", "ix_interventions_created_at")
    drop_if_exists("alerts", "ix_alerts_status")
    drop_if_exists("alerts", "ix_alerts_created_at")
    drop_if_exists("risks", "ix_risks_risk_level")
    drop_if_exists("risks", "ix_risks_created_at")
    drop_if_exists("locations", "ix_locations_name")
    drop_if_exists("users", "ix_users_phone_number")
