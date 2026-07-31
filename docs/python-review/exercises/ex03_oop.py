"""
03 — class / property
python3 exercises/ex03_oop.py
"""

from __future__ import annotations


class Member:
    def __init__(self, email: str, full_name: str, pin_hash: str | None = None):
        # TODO: maydonlarni saqlang
        raise NotImplementedError

    @property
    def has_pin(self) -> bool:
        """pin_hash None bo'lmasa True."""
        # TODO
        raise NotImplementedError

    def display(self) -> str:
        """Masalan: "Ali <a@b.com>" """
        # TODO
        raise NotImplementedError

    def set_pin_hash(self, value: str | None) -> None:
        # TODO
        raise NotImplementedError


class Team:
    def __init__(self, name: str):
        self.name = name
        self._members: list[Member] = []

    def add(self, member: Member) -> None:
        # TODO: ro'yxatga qo'shing
        raise NotImplementedError

    def emails(self) -> list[str]:
        # TODO: barcha a'zo emaillari
        raise NotImplementedError

    def with_pin(self) -> list[Member]:
        # TODO: faqat has_pin True
        raise NotImplementedError


def _check() -> None:
    m = Member("ali@bg.com", "Ali")
    assert m.has_pin is False
    assert m.display() == "Ali <ali@bg.com>"
    m.set_pin_hash("hashed")
    assert m.has_pin is True
    m.set_pin_hash(None)
    assert m.has_pin is False

    t = Team("BG")
    a = Member("a@b.com", "A", pin_hash="x")
    b = Member("b@b.com", "B")
    t.add(a)
    t.add(b)
    assert t.emails() == ["a@b.com", "b@b.com"]
    assert [m.email for m in t.with_pin()] == ["a@b.com"]
    print("ex03_oop: OK ✓")


if __name__ == "__main__":
    _check()
