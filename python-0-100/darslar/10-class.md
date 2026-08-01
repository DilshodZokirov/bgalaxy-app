# 10 — Class / OOP (65%)

```python
class Student:
    def __init__(self, name: str, scores: list[int] | None = None):
        self.name = name
        self.scores = list(scores) if scores else []

    def add_score(self, score: int) -> None:
        self.scores.append(score)

    @property
    def average(self) -> float:
        return sum(self.scores) / len(self.scores) if self.scores else 0.0
```

- `__init__` — yaratish
- `self` — shu obyekt
- `@property` — metod, lekin `.average` kabi

## Inheritance (qisqa)
```python
class Animal:
    def speak(self): ...

class Dog(Animal):
    def speak(self):
        return "woof"
```

## Mashq
```bash
python3 mashqlar/m03_class.py
```

## O'tdim
- [ ] m03 OK
