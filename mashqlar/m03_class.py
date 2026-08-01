"""65% — Class"""
from __future__ import annotations


class Student:
    def __init__(self, name: str, scores: list[int] | None = None):
        # TODO
        raise NotImplementedError

    def add_score(self, score: int) -> None:
        # TODO
        raise NotImplementedError

    @property
    def average(self) -> float:
        # TODO
        raise NotImplementedError

    def grade(self) -> str:
        """90+A 70+B 50+C else F"""
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
        # TODO
        raise NotImplementedError


def _check() -> None:
    s = Student("Ali")
    assert s.average == 0.0 and s.grade() == "F"
    s.add_score(80)
    s.add_score(100)
    assert s.average == 90.0 and s.grade() == "A"
    c = Classroom("A1")
    c.add(Student("Ali", [90, 100]))
    c.add(Student("Vali", [40, 50]))
    assert c.names() == ["Ali", "Vali"]
    assert c.top_student() is not None and c.top_student().name == "Ali"
    print("m03_class: OK")


if __name__ == "__main__":
    _check()
