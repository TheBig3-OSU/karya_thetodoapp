"""Quick connectivity check: run `python check_db.py` from the backend/ dir.

Prints the Postgres version if the connection works, or the error if it doesn't.
"""

import asyncio

from sqlalchemy import text

from database import engine


async def main() -> None:
    async with engine.connect() as conn:
        version = (await conn.execute(text("SELECT version();"))).scalar_one()
    print("✅ connected")
    print(version)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
