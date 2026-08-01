# 03 — Memory management (15%)

## Stack va Heap
```text
STACK (funksiya freymlari)     HEAP (obyektlar)
  lokal ismlar ───────────►    list, dict, str, int...
```

## Havola (reference)
```python
x = [1, 2]
y = x
y.append(3)
print(x)  # [1, 2, 3] — bitta obyekt
```

| Mutable | Immutable |
|---------|-----------|
| list, dict, set | int, str, tuple, bool, None |

## Reference counting (CPython)
Har obyektda havolalar soni. 0 bo‘lsa — o‘chishi mumkin.

```python
import sys
a = []
print(sys.getrefcount(a))  # taxminiy (+1 getrefcount o'zi)
```

## Garbage Collector
Tsikli bog‘lanishda refcount yetmaydi — `gc` tozalaydi.

```python
import gc
gc.collect()
```

## Nusxa
```python
import copy
a = [1, [2]]
b = a[:]              # sayoz
c = copy.deepcopy(a)  # chuqur
```

## Mashq
```bash
python3 mashqlar/m00_xotira.py
```

## O‘tdim
- [ ] `y = x` list da nusxa emas
- [ ] Refcount + GC nima uchun
- [ ] m00 OK
