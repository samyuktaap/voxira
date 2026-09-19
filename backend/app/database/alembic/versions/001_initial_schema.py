"""Initial payment and audit logs schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-19 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'payments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('transaction_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=100), nullable=False),
        sa.Column('amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False),
        sa.Column('recipient_id', sa.String(length=100), nullable=False),
        sa.Column('recipient_name', sa.String(length=200), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('provider_transaction_id', sa.String(length=100), nullable=True),
        sa.Column('provider_status', sa.String(length=50), nullable=True),
        sa.Column('provider_reference', sa.String(length=200), nullable=True),
        sa.Column('idempotency_key', sa.String(length=128), nullable=False),
        sa.Column('nonce', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('authenticated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failure_code', sa.String(length=50), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('confirmation_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('authentication_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('transaction_id'),
        sa.UniqueConstraint('nonce')
    )
    op.create_index('ix_payments_transaction_id', 'payments', ['transaction_id'])
    op.create_index('ix_payments_user_id', 'payments', ['user_id'])
    op.create_index('ix_payments_recipient_id', 'payments', ['recipient_id'])
    op.create_index('ix_payments_status', 'payments', ['status'])
    op.create_index('ix_payments_idempotency_key', 'payments', ['idempotency_key'])

    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('transaction_id', sa.String(length=36), nullable=True),
        sa.Column('user_id', sa.String(length=100), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_audit_logs_event_type', 'audit_logs', ['event_type'])
    op.create_index('ix_audit_logs_transaction_id', 'audit_logs', ['transaction_id'])
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])

def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('payments')
