# 03 — Memory management (Python)

Maqsad: “Python xotirani qanday boshqaradi?” ni amaliy tushunish.

## 1) Stack va Heap (sodda model)

```text
STACK (chagiruvlar)          HEAP (obyektlar)
─────────────────            ────────────────
foo() freymi                 int(10)
  lokal ismlar ──────────►   list([1,2])
  (havolalar)                str("salom")
```

- **Stack** — funksiya chaqiruvlari, lokal ismlar
- **Heap** — deyarli barcha Python obyektlari shu yerda

Siz `malloc` yozmaysiz — CPython obyekt yaratadi va sizga havola beradi.

## 2) Reference (havola)

```python
x = [1, 2, 3]   # list obyekti yaratildi; x unga qaraydi
y = x           # yangi list EMAS — y ham shu listga qaraydi
y.append(4)
print(x)        # [1, 2, 3, 4]  — chunki bitta obyekt
```

### Mutable vs Immutable

| Mutable (o‘zgaradi) | Immutable (o‘zgarmaydi) |
|---|---|
| `list`, `dict`, `set` | `int`, `float`, `str`, `tuple`, `bool`, `None` |

```python
s = "hi"
s = s + "!"     # yangi str obyekti; eski "hi" orphan bo'lishi mumkin
```

## 3) Reference counting (CPython)

Har bir obyektda: **nechta havola bor?**

```text
obyekt [1,2,3]   refcount = 2
   ▲        ▲
   x        y
```

`refcount` 0 bo‘lsa → obyekt **darhol** o‘chirilishi mumkin.

```python
import sys

a = []
print(sys.getrefcount(a))  # odatda 2+: a + getrefcount ning o'z argumenti
b = a
print(sys.getrefcount(a))  # ko'proq
del b
print(sys.getrefcount(a))  # kamayadi
```

> `getrefcount` o‘zi ham vaqtincha +1 qo‘shadi — raqam “taxminiy”, g‘oya muhim.

## 4) Tsikl muammosi + Garbage Collector

Faqat refcount yetarli emas:

```python
a = []
b = []
a.append(b)
b.append(a)
# a ↔ b  bir-biriga qaraydi; refcount hech qachon 0 bo'lmasligi mumkin
del a
del b
# "orphaned cycle" — GC tozalaydi
```

CPython da:
1. **Refcount** — asosiy, tez
2. **Generational GC** (`gc` moduli) — tsiklarni topadi

```python
import gc
gc.collect()          # majburiy tozalash (odatiy kodda kam kerak)
print(gc.get_count()) # generator hisoblagichlari
```

## 5) Nima uchun bu sizga kerak?

- `y = x` list/dict da **nusxa emas** — keyin bug chiqadi
- Katta obyektlarni keraksiz ko‘paytirish xotirani yeydi
- Tsikli bog‘lanish (parent↔child) ba’zan `weakref` talab qiladi (keyinroq)

### Nusxa olish

```python
import copy

a = [1, [2, 3]]
b = a[:]              # sayoz nusxa (ichki list hali umumiy)
c = copy.deepcopy(a)  # chuqur nusxa
```

## 6) Kichik tajriba

```python
x = 256
y = 256
print(x is y)    # ko'pincha True  (kichik int cache)

x = 1000
y = 1000
print(x is y)    # ko'pincha False (turli obyektlar)

# LEKIN: qiymat uchun doimo == ishlating, is emas
print(x == y)    # True
```

CPython ba’zi kichik `int` larni **cache** qiladi — bu optimizatsiya, qoida emas.

## O‘tdim

- [ ] Ism → obyekt (havola) modelini tushunasiz
- [ ] Mutable bo‘lishning xotira oqibatini bilasiz
- [ ] Refcount + GC nima uchun ikkalasi borligini aytolasiz
- [ ] `exercises/ex00_xotira.py` ni o‘tkazdingiz
