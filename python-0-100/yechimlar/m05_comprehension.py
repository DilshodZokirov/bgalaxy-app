"""Yechim"""
from __future__ import annotations


def squares(n: int) -> list[int]:
    return [i * i for i in range(n)]


def word_lengths(words: list[str]) -> dict[str, int]:
    return {w: len(w) for w in words}


def total(*nums: int) -> int:
    return sum(nums)


def pick(**kwargs) -> str:
    return kwargs.get("name", "anon")


def _check() -> None:
    assert squares(4) == [0, 1, 4, 9]
    assert word_lengths(["hi", "python"]) == {"hi": 2, "python": 6}
    assert total(1, 2, 3, 4) == 10
    assert pick(name="Ali") == "Ali"
    assert pick() == "anon"
    print("m05_comprehension (yechim): OK")


if __name__ == "__main__":
    _check()
