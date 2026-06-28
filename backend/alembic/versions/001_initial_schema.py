"""初始迁移脚本 — 创建全部表"""

revision = "001"
down_revision = None
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade():
    """创建所有表"""
    op.create_table(
        "tenants",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("logo_url", sa.String(1000), nullable=True),
        sa.Column("settings", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(200), nullable=True),
        sa.Column("avatar_url", sa.String(1000), nullable=True),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "username"),
        sa.UniqueConstraint("tenant_id", "email"),
    )
    op.create_table(
        "roles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("is_system", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "name"),
    )
    op.create_table(
        "role_permissions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("role_id", sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("permission", sa.String(200), nullable=False),
        sa.Column("resource", sa.String(200), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "user_roles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.ForeignKey("users.id"), nullable=False),
        sa.Column("role_id", sa.ForeignKey("roles.id"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "categories",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("tenant_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "agents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon_url", sa.String(1000), nullable=True),
        sa.Column("category_id", sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("platform_type", sa.String(50), nullable=True),
        sa.Column("platform_config", sa.JSON(), nullable=True),
        sa.Column("capability", sa.JSON(), nullable=True),
        sa.Column("input_schema", sa.JSON(), nullable=True),
        sa.Column("output_schema", sa.JSON(), nullable=True),
        sa.Column("visibility", sa.String(30), server_default="tenant_visible"),
        sa.Column("status", sa.String(20), server_default="draft"),
        sa.Column("version", sa.String(20), server_default="1.0.0"),
        sa.Column("owner_id", sa.ForeignKey("users.id"), nullable=True),
        sa.Column("install_count", sa.Integer(), server_default="0"),
        sa.Column("rating_avg", sa.Numeric(2, 1), server_default="0.0"),
        sa.Column("review_count", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "name"),
    )
    op.create_table(
        "platform_connections",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("platform_type", sa.String(50), nullable=False),
        sa.Column("config", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("last_checked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "agent_installations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("user_id", sa.ForeignKey("users.id"), nullable=False),
        sa.Column("agent_id", sa.ForeignKey("agents.id"), nullable=False),
        sa.Column("installed_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "agent_id"),
    )
    op.create_table(
        "agent_reviews",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("agent_id", sa.ForeignKey("agents.id"), nullable=False),
        sa.Column("user_id", sa.ForeignKey("users.id"), nullable=False),
        sa.Column("rating", sa.SmallInteger(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "agent_id"),
    )
    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("user_id", sa.ForeignKey("users.id"), nullable=False),
        sa.Column("agent_id", sa.ForeignKey("agents.id"), nullable=False),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("message_count", sa.Integer(), server_default="0"),
        sa.Column("first_message_at", sa.DateTime(), nullable=True),
        sa.Column("last_message_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("session_id", sa.ForeignKey("chat_sessions.id"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_type", sa.String(20), server_default="text"),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("feedback", sa.String(10), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("resource_type", sa.String(50), nullable=False),
        sa.Column("resource_id", sa.Uuid(), nullable=True),
        sa.Column("detail", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(50), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("result", sa.String(20), server_default="success"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "usage_records",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("agent_id", sa.Uuid(), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("tokens_prompt", sa.Integer(), server_default="0"),
        sa.Column("tokens_completion", sa.Integer(), server_default="0"),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    """删除所有表"""
    op.drop_table("usage_records")
    op.drop_table("audit_logs")
    op.drop_table("chat_messages")
    op.drop_table("chat_sessions")
    op.drop_table("agent_reviews")
    op.drop_table("agent_installations")
    op.drop_table("platform_connections")
    op.drop_table("agents")
    op.drop_table("categories")
    op.drop_table("user_roles")
    op.drop_table("role_permissions")
    op.drop_table("roles")
    op.drop_table("users")
    op.drop_table("tenants")
