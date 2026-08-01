# 09 — Modul va venv (60%)

## import
```python
import math
from random import randint
print(math.sqrt(9), randint(1, 6))
```

## O'z modul
`utils.py`:
```python
def add(a, b):
    return a + b
```
`main.py`:
```python
from utils import add
print(add(2, 3))
```

## __main__
```python
if __name__ == "__main__":
    print("to'g'ridan-to'g'ri ishga tushdi")
```

## venv
```bash
python3 -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate
pip install requests   # misol
```

## O'tdim
- [ ] 2 faylli mini dastur
- [ ] venv yaratdingiz
