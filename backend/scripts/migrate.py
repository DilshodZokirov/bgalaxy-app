"""Runs `alembic upgrade head` while holding a Postgres advisory lock, so if
two containers (or two overlapping deploys) start at the same time, only one
of them actually runs the migration — the other blocks until the lock is
released, then finds there's nothing left to do. This is what was causing
the "type already exists" crash-loop on Render: two processes both checking
"does this exist yet?" at the same instant, before either had committed.
"""
import asyncio
import subprocess
import sys

import asyncpg

from app.core.config import settings

LOCK_KEY = 7466321  # arbitrary constant, just needs to be unique to this app


async def main() -> int:
    dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(dsn)
    print("[migrate] waiting for migration lock...", flush=True)
    await conn.execute("SELECT pg_advisory_lock($1)", LOCK_KEY)
    print("[migrate] lock acquired, running alembic upgrade head...", flush=True)
    try:
        result = subprocess.run(["alembic", "upgrade", "head"])
        return result.returncode
    finally:
        await conn.execute("SELECT pg_advisory_unlock($1)", LOCK_KEY)
        await conn.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
