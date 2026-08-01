"""75% — comprehension / args"""
from __future__ import annotations


def squares(n: int) -> list[int]:
    """0..n-1 kvadratlari (comprehension)"""
    # TODO
    raise NotImplementedError


def word_lengths(words: list[str]) -> dict[str, int]:
    """{"salom": 5, ...}"""
    # TODO
    raise NotImplementedError


def total(*nums: int) -> int:
    # TODO
    raise NotImplementedError


def pick(**kwargs) -> str:
    """kwargs ichidan "name" ni qaytar, yo'q bo'lsa "anon" """
    # TODO
    raise NotImplementedError


def _check() -> None:
    assert squares(4) == [0, 1, 4, 9]
    assert word_lengths(["hi", "python"]) == {"hi": 2, "python": 6}
    assert total(1, 2, 3, 4) == 10
    assert pick(name="Ali") == "Ali"
    assert pick() == "anon"
    print("m05_comprehension: OK")


if __name__ == "__main__":
    _check()
