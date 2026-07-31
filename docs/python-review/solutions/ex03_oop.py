"""Yechim — avval o'zingiz urinib ko'ring."""

from __future__ import annotations


class Member:
    def __init__(self, email: str, full_name: str, pin_hash: str | None = None):
        self.email = email
        self.full_name = full_name
        self.pin_hash = pin_hash

    @property
    def has_pin(self) -> bool:
        return self.pin_hash is not None

    def display(self) -> str:
        return f"{self.full_name} <{self.email}>"

    def set_pin_hash(self, value: str | None) -> None:
        self.pin_hash = value


class Team:
    def __init__(self, name: str):
        self.name = name
        self._members: list[Member] = []

    def add(self, member: Member) -> None:
        self._members.append(member)

    def emails(self) -> list[str]:
        return [m.email for m in self._members]

    def with_pin(self) -> list[Member]:
        return [m for m in self._members if m.has_pin]


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
    print("ex03_oop (solution): OK ✓")


if __name__ == "__main__":
    _check()
