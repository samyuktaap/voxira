"""Supabase Row Level Security RLS policies migration

Revision ID: 002_supabase_rls_policies
Revises: 001_initial_schema
Create Date: 2026-09-19 12:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_supabase_rls_policies'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    # Check if running against PostgreSQL / Supabase
    if bind.dialect.name == 'postgresql':
        # Enable Row Level Security (RLS) on payments and audit_logs tables
        op.execute("ALTER TABLE payments ENABLE ROW LEVEL SECURITY;")
        op.execute("ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;")

        # Create RLS Policy: Authenticated users can read their own payments
        op.execute("""
            CREATE POLICY "Users can read own payments" 
            ON payments 
            FOR SELECT 
            USING (user_id = auth.uid()::text);
        """)

        # Create RLS Policy: Authenticated users can read their own audit logs
        op.execute("""
            CREATE POLICY "Users can read own audit logs" 
            ON audit_logs 
            FOR SELECT 
            USING (user_id = auth.uid()::text);
        """)

def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("DROP POLICY IF EXISTS \"Users can read own payments\" ON payments;")
        op.execute("DROP POLICY IF EXISTS \"Users can read own audit logs\" ON audit_logs;")
        op.execute("ALTER TABLE payments DISABLE ROW LEVEL SECURITY;")
        op.execute("ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;")
