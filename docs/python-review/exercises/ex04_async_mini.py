"""
04 — async / await (standart kutubxona)
python3 exercises/ex04_async_mini.py
"""

from __future__ import annotations

import asyncio


async def fake_db_get_user(user_id: str) -> dict | None:
    """
    "1" -> {"id": "1", "email": "a@b.com"}
    boshqa -> None
    (haqiqiy DB o'rniga kichik kechikish)
    """
    await asyncio.sleep(0.01)
    # TODO
    raise NotImplementedError


async def require_user(user_id: str) -> dict:
    """
    fake_db_get_user natijasini oling.
    None bo'lsa ValueError("unauthorized") tashlang.
    """
    # TODO: await ...
    raise NotImplementedError


async def fetch_emails(user_ids: list[str]) -> list[str]:
    """
    Har bir id uchun fake_db_get_user chaqiring.
    Topilgan user'larning email'larini qaytaring (None'larni tashlang).
    Maslahat: asyncio.gather
    """
    # TODO
    raise NotImplementedError


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
    print("ex04_async_mini: OK ✓")


if __name__ == "__main__":
    asyncio.run(_check())
