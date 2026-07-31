"""Yechim — avval o'zingiz urinib ko'ring."""

from __future__ import annotations


class Student:
    def __init__(self, name: str, scores: list[int] | None = None):
        self.name = name
        self.scores = list(scores) if scores is not None else []

    def add_score(self, score: int) -> None:
        self.scores.append(score)

    @property
    def average(self) -> float:
        if not self.scores:
            return 0.0
        return sum(self.scores) / len(self.scores)

    def grade(self) -> str:
        avg = self.average
        if avg >= 90:
            return "A"
        if avg >= 70:
            return "B"
        if avg >= 50:
            return "C"
        return "F"


class Classroom:
    def __init__(self, title: str):
        self.title = title
        self._students: list[Student] = []

    def add(self, student: Student) -> None:
        self._students.append(student)

    def names(self) -> list[str]:
        return [s.name for s in self._students]

    def top_student(self) -> Student | None:
        if not self._students:
            return None
        return max(self._students, key=lambda s: s.average)


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
    print("ex03_class (yechim): OK")


if __name__ == "__main__":
    _check()
