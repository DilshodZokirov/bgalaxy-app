"""Yechim — avval o'zingiz urinib ko'ring."""

from __future__ import annotations

import asyncio


async def fake_db_get_user(user_id: str) -> dict | None:
    await asyncio.sleep(0.01)
    if user_id == "1":
        return {"id": "1", "email": "a@b.com"}
    return None


async def require_user(user_id: str) -> dict:
    user = await fake_db_get_user(user_id)
    if user is None:
        raise ValueError("unauthorized")
    return user


async def fetch_emails(user_ids: list[str]) -> list[str]:
    users = await asyncio.gather(*[fake_db_get_user(uid) for uid in user_ids])
    return [u["email"] for u in users if u is not None]


async def _check() -> None:
    u = await fake_db_get_user("1")
    assert u == {"id": "1", "email": "a@b.com"}
    assert await fake_db_get_user("9") is None

    got = await require_user("1")
    assert got["email"] == "a@b.com"
    try:
        await require_user("9")
        raise AssertionError("ValueError kutilgan edi")
    except ValueError as e:
        assert str(e) == "unauthorized"

    emails = await fetch_emails(["1", "9", "1"])
    assert emails == ["a@b.com", "a@b.com"]
    print("ex04_async_mini (solution): OK ✓")


if __name__ == "__main__":
    asyncio.run(_check())
