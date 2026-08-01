"""40% — Funksiya"""
from __future__ import annotations


def normalize_email(email: str) -> str:
    # TODO
    raise NotImplementedError


def grade_for_score(score: int) -> str:
    """90+A 70+B 50+C else F"""
    # TODO
    raise NotImplementedError


def greet(name: str, excited: bool = False) -> str:
    # TODO
    raise NotImplementedError


def safe_int(value: str, default: int = 0) -> int:
    # TODO
    raise NotImplementedError


def _check() -> None:
    assert normalize_email("  Ali@Mail.COM ") == "ali@mail.com"
    assert grade_for_score(95) == "A"
    assert grade_for_score(70) == "B"
    assert grade_for_score(50) == "C"
    assert grade_for_score(10) == "F"
    assert greet("Ali") == "Salom, Ali"
    assert greet("Ali", True) == "Salom, Ali!"
    assert safe_int("42") == 42 and safe_int("x") == 0 and safe_int("x", -1) == -1
    print("m01_funksiya: OK")


if __name__ == "__main__":
    _check()
