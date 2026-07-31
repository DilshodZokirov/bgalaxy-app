# 01 — Asoslar

## Tiplar

```python
x = 10          # int
price = 12.5    # float
name = "Dilshod"  # str
ok = True       # bool
nothing = None  # NoneType — "qiymat yo‘q"
```

`None` tekshirish:

```python
if token is None:
    print("token yo‘q")
```

`==` qiymatni, `is` esa bir xil obyekt (odatda `None` uchun) tekshiradi.

## String

```python
email = "a@b.com"
email.upper()           # "A@B.COM"
email.startswith("a")   # True
f"Salom, {name}!"       # f-string
"xato"[0:4]             # "xato" slice
```

## Shart va sikl

```python
if score >= 90:
    grade = "A"
elif score >= 70:
    grade = "B"
else:
    grade = "C"

for i in range(3):
    print(i)  # 0, 1, 2

while n > 0:
    n -= 1
```

## Funksiya

```python
def greet(name: str, excited: bool = False) -> str:
    msg = f"Salom, {name}"
    return msg + "!" if excited else msg
```

- Parametr: kiruvchi qiymat
- `return`: natija
- Default (`excited=False`): chaqirilganda bermasa ham ishlaydi

## BGalaxy misoli

`backend/app/core/security.py`:

```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

Oddiy funksiya: ikki `str` kiradi, `bool` qaytadi.

## Mashq

`exercises/ex01_basics.py` ni oching.
