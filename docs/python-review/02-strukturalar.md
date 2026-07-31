# 02 — To‘plamlar (list, dict, set)

## List

```python
users = ["Ali", "Vali", "Sami"]
users.append("Dilshod")
users[0]          # "Ali"
len(users)        # 4
"Ali" in users    # True
```

## Dict

Kalit → qiymat. JSON ga juda o‘xshash.

```python
user = {"email": "a@b.com", "full_name": "Ali"}
user["email"]
user.get("phone")          # None (xato bermaydi)
user.get("phone", "-")     # default
user["role"] = "admin"
```

## Set

Takrorlanmas elementlar.

```python
tags = {"ombor", "chat", "ombor"}
# {"ombor", "chat"}
```

## Comprehension (qisqa filter/map)

```python
nums = [1, 2, 3, 4, 5]
evens = [n for n in nums if n % 2 == 0]   # [2, 4]
squares = {n: n * n for n in nums}
```

## Unpacking

```python
a, b = (10, 20)
first, *rest = [1, 2, 3, 4]  # first=1, rest=[2,3,4]
```

## BGalaxy misoli

API javoblari va filterlar ko‘pincha list/dict bilan ishlaydi:

```python
payload = {"detail": "Serverda kutilmagan xatolik yuz berdi."}
# main.py dagi JSONResponse content
```

## Mashq

`exercises/ex02_collections.py`
