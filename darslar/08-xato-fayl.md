# 08 — Xatolik va fayl (55%)

## try / except
```python
try:
    n = int(input("Son: "))
except ValueError:
    print("Son emas!")
    n = 0
```

```python
raise ValueError("noto'g'ri qiymat")
```

## Fayl
```python
with open("eslatma.txt", "w", encoding="utf-8") as f:
    f.write("Salom\n")

with open("eslatma.txt", "r", encoding="utf-8") as f:
    print(f.read())
```

Doimo `with` — fayl yopiladi.

## Amaliyot
1. Son so'rang, xato bo'lsa qayta so'rang
2. 3 qatorni faylga yozing va o'qing

## O'tdim
- [ ] Dastur int xatosida yiqilmaydi
- [ ] with open ishlatasiz
