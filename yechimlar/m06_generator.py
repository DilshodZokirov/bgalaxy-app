"""Yechim"""
from __future__ import annotations

from typing import Iterator


def countdown(n: int) -> Iterator[int]:
    while n > 0:
        yield n
        n -= 1


def take(n: int, it) -> list:
    out = []
    for i, x in enumerate(it):
        if i >= n:
            break
        out.append(x)
    return out


def gen_evens(limit: int) -> Iterator[int]:
    x = 0
    while x < limit:
        yield x
        x += 2


def _check() -> None:
    assert list(countdown(3)) == [3, 2, 1]
    assert list(countdown(0)) == []
    assert take(2, countdown(5)) == [5, 4]
    assert list(gen_evens(7)) == [0, 2, 4, 6]
    print("m06_generator (yechim): OK")


if __name__ == "__main__":
    _check()
