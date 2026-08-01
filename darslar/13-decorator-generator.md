# 13 — Decorator, generator, context manager (80%)

## Generator
```python
def countdown(n):
    while n > 0:
        yield n
        n -= 1

for x in countdown(3):
    print(x)
```
`yield` — qiymat beradi, holatni eslab qoladi (xotira tejaydi).

## Decorator
```python
def once_log(fn):
    def wrapper(*args, **kwargs):
        print("chaqirildi:", fn.__name__)
        return fn(*args, **kwargs)
    return wrapper

@once_log
def add(a, b):
    return a + b
```

## with / context manager
```python
from contextlib import contextmanager

@contextmanager
def opened(path):
    f = open(path, encoding="utf-8")
    try:
        yield f
    finally:
        f.close()
```

## Mashq
```bash
python3 mashqlar/m06_generator.py
```

## O'tdim
- [ ] m06 OK
- [ ] yield ni tushunasiz
