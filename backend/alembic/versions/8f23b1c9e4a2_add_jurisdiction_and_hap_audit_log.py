"""add_jurisdiction_and_hap_audit_log

Revision ID: 8f23b1c9e4a2
Revises: 7c129e4a7d15
Create Date: 2026-09-17 11:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8f23b1c9e4a2'
down_revision: Union[str, Sequence[str], None] = '7c129e4a7d15'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Safely apply jurisdiction attributes and HAPActionAuditLog table."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. Ensure hap_action_audit_logs table exists
    if "hap_action_audit_logs" not in tables:
        op.create_table(
            'hap_action_audit_logs',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('action_id', sa.String(length=100), nullable=False),
            sa.Column('jurisdiction_id', sa.String(length=50), nullable=False),
            sa.Column('action_key', sa.String(length=100), nullable=False),
            sa.Column('recommended_action', sa.String(length=255), nullable=True),
            sa.Column('created_by', sa.String(length=100), nullable=False),
            sa.Column('approved_by', sa.String(length=100), nullable=True),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='PENDING_APPROVAL'),
            sa.Column('reason_comment', sa.String(length=500), nullable=True),
            sa.Column('risk_snapshot_score', sa.Float(), nullable=True),
            sa.Column('risk_snapshot_level', sa.String(length=20), nullable=True),
            sa.Column('activated_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_hap_action_audit_logs_id', 'hap_action_audit_logs', ['id'], unique=False)
        op.create_index('ix_hap_action_audit_logs_action_id', 'hap_action_audit_logs', ['action_id'], unique=False)
        op.create_index('ix_hap_action_audit_logs_jurisdiction_id', 'hap_action_audit_logs', ['jurisdiction_id'], unique=False)
        op.create_index('ix_hap_action_audit_logs_status', 'hap_action_audit_logs', ['status'], unique=False)
        op.create_index('ix_hap_action_audit_logs_created_at', 'hap_action_audit_logs', ['created_at'], unique=False)

    # 2. Add jurisdiction and organizational columns to users table
    if "users" in tables:
        user_columns = [col['name'] for col in inspector.get_columns('users')]
        with op.batch_alter_table('users') as batch_op:
            if 'organization' not in user_columns:
                batch_op.add_column(sa.Column('organization', sa.String(length=150), nullable=True))
            if 'department' not in user_columns:
                batch_op.add_column(sa.Column('department', sa.String(length=100), nullable=True))
            if 'designation' not in user_columns:
                batch_op.add_column(sa.Column('designation', sa.String(length=100), nullable=True))
            if 'official_id' not in user_columns:
                batch_op.add_column(sa.Column('official_id', sa.String(length=50), nullable=True))
            if 'jurisdiction_id' not in user_columns:
                batch_op.add_column(sa.Column('jurisdiction_id', sa.String(length=50), nullable=True, server_default='IN'))
            if 'jurisdiction_type' not in user_columns:
                batch_op.add_column(sa.Column('jurisdiction_type', sa.String(length=30), nullable=True, server_default='COUNTRY'))
            if 'permissions' not in user_columns:
                batch_op.add_column(sa.Column('permissions', sa.String(length=500), nullable=True, server_default=''))
            if 'account_status' not in user_columns:
                batch_op.add_column(sa.Column('account_status', sa.String(length=30), nullable=False, server_default='APPROVED'))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "hap_action_audit_logs" in tables:
        op.drop_table('hap_action_audit_logs')

    if "users" in tables:
        with op.batch_alter_table('users') as batch_op:
            user_columns = [col['name'] for col in inspector.get_columns('users')]
            for col in ['account_status', 'permissions', 'jurisdiction_type', 'jurisdiction_id', 'official_id', 'designation', 'department', 'organization']:
                if col in user_columns:
                    batch_op.drop_column(col)
