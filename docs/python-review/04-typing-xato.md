# 04 — Typing, xatolik, modullar

## Type hints

Python ishlashiga majburiy emas, lekin o‘qish va IDE uchun muhim.

```python
def decode_access_token(token: str) -> str | None:
    ...
```

- `str | None` — yoki string, yoki `None` (Python 3.10+)
- BGalaxy da ko‘p joyda shu uslub: `avatar_url: str | None`

## Optional uslubi (eski)

```python
from typing import Optional
def f(x: Optional[str]) -> None: ...
# xuddi str | None
```

## Exception

```python
try:
    n = int("abc")
except ValueError:
    n = 0
```

O‘zingiz tashlash:

```python
raise ValueError("email noto‘g‘ri")
```

## BGalaxy misoli

```python
# deps.py
raise HTTPException(status_code=401, detail="Could not validate credentials")
```

```python
# security.py
except JWTError:
    return None
```

## Modul / import

```python
from app.core.security import decode_access_token
from app.models.user import User
```

- `from X import Y` — faqat keraklisini olish
- Relativ emas, loyihada paket nomi (`app.`) bilan

## `if __name__ == "__main__"`

Fayl to‘g‘ridan-to‘g‘ri ishga tushganda ishlaydi; import qilinganda emas.

```python
def main():
    print("ok")

if __name__ == "__main__":
    main()
```

## Mashq

`exercises/ex01`–`ex03` ni tugatgan bo‘lsangiz, keyingi darsga o‘ting.
`ex04` async uchun.
