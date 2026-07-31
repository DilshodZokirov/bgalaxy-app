"""
Bosqich 7 — class
python3 exercises/ex03_class.py
"""

from __future__ import annotations


class Student:
    def __init__(self, name: str, scores: list[int] | None = None):
        # TODO: name va scores (default [])
        raise NotImplementedError

    def add_score(self, score: int) -> None:
        # TODO
        raise NotImplementedError

    @property
    def average(self) -> float:
        """Ballar o'rtachasi; bo'sh bo'lsa 0.0"""
        # TODO
        raise NotImplementedError

    def grade(self) -> str:
        """average asosida: 90+ A, 70+ B, 50+ C, else F"""
        # TODO
        raise NotImplementedError


class Classroom:
    def __init__(self, title: str):
        self.title = title
        self._students: list[Student] = []

    def add(self, student: Student) -> None:
        # TODO
        raise NotImplementedError

    def names(self) -> list[str]:
        # TODO
        raise NotImplementedError

    def top_student(self) -> Student | None:
        """Eng yuqori average; bo'sh bo'lsa None"""
        # TODO
        raise NotImplementedError


def _check() -> None:
    s = Student("Ali")
    assert s.average == 0.0
    assert s.grade() == "F"
    s.add_score(80)
    s.add_score(100)
    assert s.average == 90.0
    assert s.grade() == "A"

    c = Classroom("A1")
    a = Student("Ali", [90, 100])
    b = Student("Vali", [40, 50])
    c.add(a)
    c.add(b)
    assert c.names() == ["Ali", "Vali"]
    assert c.top_student() is not None
    assert c.top_student().name == "Ali"
    print("ex03_class: OK")


if __name__ == "__main__":
    _check()
