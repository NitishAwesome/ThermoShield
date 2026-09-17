"""Aggregate health datasets, regional subscriptions and delivery receipts.

Revision ID: b74ea20c9100
Revises: 8f23b1c9e4a2
"""
from alembic import op
import sqlalchemy as sa

revision = "b74ea20c9100"
down_revision = "8f23b1c9e4a2"
branch_labels = None
depends_on = None


def upgrade():
    # Match application startup's idempotent table creation on existing deployments.
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    if "health_datasets" not in tables:
        op.create_table("health_datasets",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("area_id", sa.String(80), nullable=False, index=True),
            sa.Column("source_name", sa.String(200), nullable=False),
            sa.Column("source_url", sa.String(1000), nullable=False),
            sa.Column("data_kind", sa.String(30), nullable=False),
            sa.Column("outcome_scope", sa.String(30), nullable=False),
            sa.Column("checksum", sa.String(64), nullable=False),
            sa.Column("records_json", sa.Text(), nullable=False),
            sa.Column("model_json", sa.Text()), sa.Column("report_json", sa.Text()),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("area_id", "checksum", name="uq_health_dataset_content"))
    if "regional_subscriptions" not in tables:
        op.create_table("regional_subscriptions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
            sa.Column("area_id", sa.String(80), nullable=False, index=True),
            sa.Column("sms_enabled", sa.Boolean(), nullable=False),
            sa.Column("whatsapp_enabled", sa.Boolean(), nullable=False),
            sa.Column("consent_at", sa.DateTime()), sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("user_id", "area_id", name="uq_regional_subscription"))
    if "regional_deliveries" not in tables:
        op.create_table("regional_deliveries",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("subscription_id", sa.Integer(), sa.ForeignKey("regional_subscriptions.id"), nullable=False),
            sa.Column("area_id", sa.String(80), nullable=False, index=True),
            sa.Column("channel", sa.String(20), nullable=False),
            sa.Column("fingerprint", sa.String(64), nullable=False, unique=True),
            sa.Column("risk_level", sa.String(20), nullable=False),
            sa.Column("forecast_date", sa.String(10), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("status", sa.String(30), nullable=False),
            sa.Column("provider_sid", sa.String(80), unique=True),
            sa.Column("error", sa.String(300)),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False))


def downgrade():
    for table in ("regional_deliveries", "regional_subscriptions", "health_datasets"):
        op.drop_table(table)
