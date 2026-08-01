"""80% — generator"""
from __future__ import annotations

from typing import Iterator


def countdown(n: int) -> Iterator[int]:
    """n, n-1, ... 1  (yield)"""
    # TODO
    raise NotImplementedError


def take(n: int, it) -> list:
    """iterator dan birinchi n ta element"""
    # TODO
    raise NotImplementedError


def gen_evens(limit: int) -> Iterator[int]:
    """0,2,4,... < limit"""
    # TODO
    raise NotImplementedError


def _check() -> None:
    assert list(countdown(3)) == [3, 2, 1]
    assert list(countdown(0)) == []
    assert take(2, countdown(5)) == [5, 4]
    assert list(gen_evens(7)) == [0, 2, 4, 6]
    print("m06_generator: OK")


if __name__ == "__main__":
    _check()
