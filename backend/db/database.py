"""Database connection for Karya.

Connects to the Supabase Postgres instance using async SQLAlchemy + asyncpg.

Set DATABASE_URL in a local .env file (see .env.example). Use the Supabase
**Session pooler** connection string (host ...pooler.supabase.com, port 5432),
which is IPv4 and works from a local machine.
"""

import os

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy backend/.env.example to backend/.env "
        "and paste your Supabase Session pooler connection string."
    )

# asyncpg needs the "+asyncpg" driver in the URL scheme. Supabase hands you a
# plain "postgresql://..." string, so normalise it here.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    # Supabase's pooler (Supavisor) does not support prepared statements;
    # disabling asyncpg's statement cache avoids "prepared statement already
    # exists" errors.
    connect_args={"statement_cache_size": 0},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for ORM models (schema/tables go here later)."""


async def get_db():
    """Yield a database session (use as a FastAPI dependency)."""
    async with AsyncSessionLocal() as session:
        yield session
