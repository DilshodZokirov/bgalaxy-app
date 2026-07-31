"""
Bosqich 3 — Funksiya
TODO joylarni to'ldiring: python3 exercises/ex01_funksiya.py
"""

from __future__ import annotations


def normalize_email(email: str) -> str:
    """Pastki registr + chetdagi bo'shliqlarni olib tashlash."""
    # TODO
    raise NotImplementedError


def grade_for_score(score: int) -> str:
    """90+ A, 70..89 B, 50..69 C, aks holda F."""
    # TODO
    raise NotImplementedError


def greet(name: str, excited: bool = False) -> str:
    """excited=False -> 'Salom, {name}' | True -> oxirida !"""
    # TODO
    raise NotImplementedError


def safe_int(value: str, default: int = 0) -> int:
    """int() bo'lmasa default."""
    # TODO
    raise NotImplementedError


def _check() -> None:
    assert normalize_email("  Ali@Mail.COM ") == "ali@mail.com"
    assert grade_for_score(95) == "A"
    assert grade_for_score(70) == "B"
    assert grade_for_score(50) == "C"
    assert grade_for_score(10) == "F"
    assert greet("Dilshod") == "Salom, Dilshod"
    assert greet("Dilshod", excited=True) == "Salom, Dilshod!"
    assert safe_int("42") == 42
    assert safe_int("x") == 0
    assert safe_int("x", default=-1) == -1
    print("ex01_funksiya: OK")


if __name__ == "__main__":
    _check()
