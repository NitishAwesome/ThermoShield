"""add_password_hash_and_interventions

Revision ID: 17e25d5d1399
Revises: 545c497234f9
Create Date: 2026-09-06 01:25:59.577070

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '17e25d5d1399'
down_revision: Union[str, Sequence[str], None] = '545c497234f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema safely handling existing tables and records."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. Ensure interventions table exists
    if "interventions" not in tables:
        op.create_table(
            'interventions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('location_id', sa.Integer(), nullable=False),
            sa.Column('risk_id', sa.Integer(), nullable=False),
            sa.Column('cooling_center', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('hydration_station', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('outdoor_work_restriction', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('before_risk_score', sa.Float(), nullable=False),
            sa.Column('after_risk_score', sa.Float(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(['location_id'], ['locations.id']),
            sa.ForeignKeyConstraint(['risk_id'], ['risks.id']),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_interventions_id'), 'interventions', ['id'], unique=False)
        op.create_index(op.f('ix_interventions_location_id'), 'interventions', ['location_id'], unique=False)
        op.create_index(op.f('ix_interventions_risk_id'), 'interventions', ['risk_id'], unique=False)

    # 2. Add password_hash, created_at, and updated_at to users using batch alter for SQLite/Postgres compatibility
    user_columns = [col['name'] for col in inspector.get_columns('users')]
    with op.batch_alter_table('users') as batch_op:
        if 'password_hash' not in user_columns:
            # Backfill existing users with a non-bcrypt sentinel value that prevents arbitrary login
            batch_op.add_column(
                sa.Column(
                    'password_hash',
                    sa.String(length=255),
                    nullable=False,
                    server_default='UNSET_PASSWORD_RESET_REQUIRED'
                )
            )
        if 'created_at' not in user_columns:
            batch_op.add_column(
                sa.Column(
                    'created_at',
                    sa.DateTime(),
                    nullable=False,
                    server_default=sa.func.now()
                )
            )
        if 'updated_at' not in user_columns:
            batch_op.add_column(
                sa.Column(
                    'updated_at',
                    sa.DateTime(),
                    nullable=False,
                    server_default=sa.func.now()
                )
            )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('updated_at')
        batch_op.drop_column('created_at')
        batch_op.drop_column('password_hash')

    op.drop_index(op.f('ix_interventions_risk_id'), table_name='interventions')
    op.drop_index(op.f('ix_interventions_location_id'), table_name='interventions')
    op.drop_index(op.f('ix_interventions_id'), table_name='interventions')
    op.drop_table('interventions')
