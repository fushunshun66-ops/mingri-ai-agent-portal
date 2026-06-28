"""Alembic 环境配置"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from common.config import settings
from common.models import Base

# 导入所有模型以注册到 Base.metadata
from users.models import *  # noqa
from agents.models import *  # noqa
from adapters.models import *  # noqa
from common.shared_models import *  # noqa

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    url = settings.database_url_sync
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        {"sqlalchemy.url": settings.database_url_sync},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
