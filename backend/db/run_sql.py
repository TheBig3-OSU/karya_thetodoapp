"""Run a .sql file against the database: `python -m db.run_sql db/migrations/001_x.sql`.

Uses asyncpg's simple query protocol, which executes multiple statements in
one shot (the file's own BEGIN/COMMIT controls transactionality).
"""

import asyncio
import sys
from pathlib import Path

import asyncpg

from db.database import DATABASE_URL


async def main(path: str) -> None:
    sql_text = Path(path).read_text()
    conn = await asyncpg.connect(DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1))
    try:
        await conn.execute(sql_text)
    finally:
        await conn.close()
    print(f"✅ executed {path}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python -m db.run_sql <file.sql>")
    asyncio.run(main(sys.argv[1]))
