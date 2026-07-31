# 03 — Class va obyekt

## Class nima?

Ma’lumot + ular ustida ishlaydigan funksiyalar bir joyda.

```python
class User:
    def __init__(self, email: str, full_name: str):
        self.email = email
        self.full_name = full_name

    def display(self) -> str:
        return f"{self.full_name} <{self.email}>"

u = User("a@b.com", "Ali")
print(u.display())
```

- `__init__` — obyekt yaratilganda chaqiladi
- `self` — shu obyektning o‘zi

## Property

Hisoblab topiladigan maydon (metod, lekin `.` bilan chaqiriladi):

```python
class Account:
    def __init__(self, pin_hash: str | None):
        self.pin_hash = pin_hash

    @property
    def has_pin(self) -> bool:
        return self.pin_hash is not None
```

## BGalaxy misoli

`backend/app/models/user.py`:

```python
class User(Base):
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    @property
    def has_pin(self) -> bool:
        return self.pin_hash is not None
```

SQLAlchemy modeli — oddiy class + jadval maydonlari.

## Dataclass (qisqa ma’lumot class)

```python
from dataclasses import dataclass

@dataclass
class Invite:
    email: str
    token: str
    accepted: bool = False
```

Pydantic (`schemas/`) ham shunga o‘xshash g‘oya: strukturali ma’lumot + validatsiya.

## Mashq

`exercises/ex03_oop.py`
