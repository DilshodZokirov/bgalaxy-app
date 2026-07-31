"""
01 — Asoslar
TODO joylarni to'ldiring, keyin: python3 exercises/ex01_basics.py
"""

from __future__ import annotations


def normalize_email(email: str) -> str:
    """Emailni pastki registrga o'tkazib, bo'shliqlarni olib tashlang."""
    # TODO: return ...
    raise NotImplementedError


def grade_for_score(score: int) -> str:
    """
    90+ -> "A"
    70..89 -> "B"
    50..69 -> "C"
    aks holda -> "F"
    """
    # TODO
    raise NotImplementedError


def greet(name: str, excited: bool = False) -> str:
    """
    excited=False -> "Salom, {name}"
    excited=True  -> "Salom, {name}!"
    """
    # TODO
    raise NotImplementedError


def safe_int(value: str, default: int = 0) -> int:
    """int() ga o'tkazib bo'lmasa default qaytaring."""
    # TODO: try/except ValueError
    raise NotImplementedError


# --- tekshiruv (o'zgartirmang) ---
def _check() -> None:
    assert normalize_email("  Ali@BG.com ") == "ali@bg.com"
    assert grade_for_score(95) == "A"
    assert grade_for_score(70) == "B"
    assert grade_for_score(50) == "C"
    assert grade_for_score(10) == "F"
    assert greet("Dilshod") == "Salom, Dilshod"
    assert greet("Dilshod", excited=True) == "Salom, Dilshod!"
    assert safe_int("42") == 42
    assert safe_int("x") == 0
    assert safe_int("x", default=-1) == -1
    print("ex01_basics: OK ✓")


if __name__ == "__main__":
    _check()
