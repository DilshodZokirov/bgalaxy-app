"""Yechim"""
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
    assert normalize_email("  Ali@Mail.COM ") == "ali@mail.com"
    assert grade_for_score(95) == "A" and grade_for_score(70) == "B"
    assert grade_for_score(50) == "C" and grade_for_score(10) == "F"
    assert greet("Ali") == "Salom, Ali" and greet("Ali", True) == "Salom, Ali!"
    assert safe_int("42") == 42 and safe_int("x") == 0 and safe_int("x", -1) == -1
    print("m01_funksiya (yechim): OK")


if __name__ == "__main__":
    _check()
