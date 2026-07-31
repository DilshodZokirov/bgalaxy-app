"""
02 — list / dict / comprehension
python3 exercises/ex02_collections.py
"""

from __future__ import annotations


def active_emails(users: list[dict]) -> list[str]:
    """
    users: [{"email": "...", "active": True/False}, ...]
    Faqat active=True bo'lgan email'larni qaytaring (tartib saqlansin).
    """
    # TODO: list comprehension yoki for
    raise NotImplementedError


def count_by_role(users: list[dict]) -> dict[str, int]:
    """
    [{"role": "admin"}, {"role": "member"}, {"role": "admin"}]
    -> {"admin": 2, "member": 1}
    """
    # TODO
    raise NotImplementedError


def unique_sorted_tags(tags: list[str]) -> list[str]:
    """Takrorlarni olib tashlang va alifbo tartibida qaytaring."""
    # TODO: set + sorted
    raise NotImplementedError


def invert_map(d: dict[str, str]) -> dict[str, str]:
    """{"a": "1", "b": "2"} -> {"1": "a", "2": "b"}"""
    # TODO
    raise NotImplementedError


def _check() -> None:
    users = [
        {"email": "a@b.com", "active": True, "role": "admin"},
        {"email": "c@d.com", "active": False, "role": "member"},
        {"email": "e@f.com", "active": True, "role": "admin"},
    ]
    assert active_emails(users) == ["a@b.com", "e@f.com"]
    assert count_by_role(users) == {"admin": 2, "member": 1}
    assert unique_sorted_tags(["ombor", "chat", "ombor", "auth"]) == [
        "auth",
        "chat",
        "ombor",
    ]
    assert invert_map({"uz": "O'zbek", "en": "English"}) == {
        "O'zbek": "uz",
        "English": "en",
    }
    print("ex02_collections: OK ✓")


if __name__ == "__main__":
    _check()
