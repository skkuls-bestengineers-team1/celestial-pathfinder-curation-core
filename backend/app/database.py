"""Postgres 연결 관리 (trip_search용)."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import URL, Engine, create_engine


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

_engine: Engine | None = None


def get_engine() -> Engine:
    """Postgres Engine을 생성하거나 캐시된 Engine을 반환한다."""
    global _engine
    if _engine is not None:
        return _engine

    database_url = URL.create(
        drivername="postgresql+psycopg2",
        host=os.environ["PGHOST"],
        port=os.environ["PGPORT"],
        database=os.environ["PGDATABASE"],
        username=os.environ["PGUSER"],
        password=os.environ["PGPASSWORD"],
    )

    _engine = create_engine(database_url, pool_pre_ping=True)
    return _engine
