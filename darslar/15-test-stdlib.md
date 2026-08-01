# 15 — Test va foydali stdlib (95%)

## assert / pytest g'oyasi
```python
def add(a, b):
    return a + b

assert add(2, 3) == 5
```

Oddiy test fayli:
```python
# test_add.py
from mymodule import add

def test_add():
    assert add(1, 1) == 2
```
```bash
python3 -m pytest   # pip install pytest (venv ichida)
# yoki oddiygina:
python3 mashqlar/m01_funksiya.py   # bizning uslub
```

## Foydali stdlib
| Modul | Nima |
|-------|------|
| `collections.Counter` | sanash |
| `itertools` | kombinatsiyalar |
| `pathlib` | yo'llar |
| `json` | JSON |
| `datetime` | sana/vaqt |
| `re` | regex |
| `csv` | jadval fayl |
| `urllib` / `httpx`* | HTTP (*pip) |

```python
from collections import Counter
print(Counter("banana"))
```

## O'tdim
- [ ] Kamida 1 ta funksiyani assert bilan tekshirdingiz
- [ ] Counter ni sinab ko'rdingiz
