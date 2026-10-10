import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from typing import AsyncGenerator
import logging
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)
Base = declarative_base()


def build_engine(db_url: str):
    if db_url.startswith("sqlite"):
        if settings.ENVIRONMENT.lower() == "production":
            raise RuntimeError("SQLite is not permitted in production")
        return create_async_engine(db_url, echo=False, future=True)
    return create_async_engine(db_url, echo=False, future=True, pool_pre_ping=True, pool_size=10, max_overflow=20)


engine = build_engine(settings.DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)
_db_initialized = False


async def ensure_db_initialized():
    global _db_initialized
    if _db_initialized:
        return True
    async with engine.begin() as conn:
        if settings.AUTO_CREATE_SCHEMA:
            await conn.run_sync(Base.metadata.create_all)
        else:
            await conn.run_sync(lambda sync_conn: sync_conn.exec_driver_sql("SELECT 1"))
    _db_initialized = True
    logger.info("Database connection validated")
    return True


async def init_db_connection():
    return await ensure_db_initialized()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    await ensure_db_initialized()
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
