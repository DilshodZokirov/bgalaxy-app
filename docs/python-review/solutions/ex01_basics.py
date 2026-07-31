"""Yechim — avval o'zingiz urinib ko'ring."""

from __future__ import annotations


def normalize_email(email: str) -> str:
    return email.strip().lower()


def grade_for_score(score: int) -> str:
    if score >= 90:
        return "A"
    if score >= 70:
        return "B"
    if score >= 50:
        return "C"
    return "F"


def greet(name: str, excited: bool = False) -> str:
    msg = f"Salom, {name}"
    return msg + "!" if excited else msg


def safe_int(value: str, default: int = 0) -> int:
    try:
        return int(value)
    except ValueError:
        return default


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
    print("ex01_basics (solution): OK ✓")


if __name__ == "__main__":
    _check()
