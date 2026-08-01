"""Yechim"""
from __future__ import annotations


def active_emails(users: list[dict]) -> list[str]:
    return [u["email"] for u in users if u.get("active")]


def count_by_role(users: list[dict]) -> dict[str, int]:
    out: dict[str, int] = {}
    for u in users:
        out[u["role"]] = out.get(u["role"], 0) + 1
    return out


def unique_sorted_tags(tags: list[str]) -> list[str]:
    return sorted(set(tags))


def invert_map(d: dict[str, str]) -> dict[str, str]:
    return {v: k for k, v in d.items()}


def _check() -> None:
    users = [
        {"email": "a@b.com", "active": True, "role": "admin"},
        {"email": "c@d.com", "active": False, "role": "member"},
        {"email": "e@f.com", "active": True, "role": "admin"},
    ]
    assert active_emails(users) == ["a@b.com", "e@f.com"]
    assert count_by_role(users) == {"admin": 2, "member": 1}
    assert unique_sorted_tags(["kitob", "film", "kitob", "musiqa"]) == ["film", "kitob", "musiqa"]
    assert invert_map({"uz": "Ozbek", "en": "English"}) == {"Ozbek": "uz", "English": "en"}
    print("m02_toplamlar (yechim): OK")


if __name__ == "__main__":
    _check()
