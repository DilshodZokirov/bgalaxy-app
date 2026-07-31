# Python — 0-dan amaliyot

Boshqa loyihalardan mustaqil. Faqat Python. Har bosqichda **o‘zingiz kod yozasiz**.

```text
  0  Muhit o'rnatish
  │
  1  Asoslar — son, matn, o'zgaruvchi
  │
  2  Shart (if) va sikl (for/while)
  │
  3  Funksiya
  │
  4  List, dict, set
  │
  5  Xatolik (try/except) va fayl
  │
  6  Modul, venv, pip
  │
  7  Class
  │
  8  JSON va pathlib
  │
  9  Loyiha A — Son topish o'yini
  │
 10  Loyiha B — Todo ro'yxat (faylga saqlanadi)
  │
 11  Loyiha C — Xarajatlar daftari
  ▼
     Keyin o'zingiz yangi loyiha tanlaysiz
```

---

## Bosqich 0 — Muhit

**Qilish**
1. Python 3.11+ o‘rnating: https://www.python.org/downloads/
2. Terminalda tekshiring: `python3 --version`
3. Fayl yarating: `hello.py`

```python
print("Salom, Python!")
```

4. Ishga tushiring: `python3 hello.py`

**O‘tdim**
- [ ] Versiya chiqadi
- [ ] `hello.py` ishlaydi

---

## Bosqich 1 — Asoslar

**O‘rganish**
- Tiplar: `int`, `float`, `str`, `bool`, `None`
- O‘zgaruvchi, `input()`, `print()`
- f-string: `f"Salom, {ism}"`
- Hisob: `+ - * / // % **`

**Amaliyot (o‘zingiz yozing)**
1. Ism so‘rang → `Salom, {ism}!` chiqaring  
2. Ikki son so‘rab, yig‘indi/ayirma/ko‘paytma/bo‘linma chiqaring  
3. Harorat C → F: `F = C * 9/5 + 32`

**O‘tdim**
- [ ] `input` natijasi string ekanini bilasiz (`int(...)` kerak)
- [ ] f-string ishlatasiz

---

## Bosqich 2 — Shart va sikl

**O‘rganish**
- `if / elif / else`
- `for i in range(n)`, `while`
- `break`, `continue`

**Amaliyot**
1. Ball kiriting → `A/B/C/F` chiqaring  
2. 1 dan N gacha yig‘indi  
3. Juft sonlarni 1..20 oralig‘ida chiqaring  

**O‘tdim**
- [ ] `elif` zanjirini yozasiz
- [ ] `for` bilan ro‘yxat aylanasiiz

---

## Bosqich 3 — Funksiya

**O‘rganish**
- `def`, parametr, `return`
- Default qiymat: `def greet(name, excited=False)`

**Amaliyot**
- Mashq fayli: `exercises/ex01_funksiya.py` (TODO larni to‘ldiring)

```bash
cd python-amaliyot
python3 exercises/ex01_funksiya.py
```

**O‘tdim**
- [ ] Mashq `OK` chiqardi
- [ ] `return` va `print` farqini bilasiz

---

## Bosqich 4 — List, dict, set

**O‘rganish**
- `list` — tartibli ro‘yxat
- `dict` — kalit → qiymat
- `set` — takrorlanmas
- Comprehension: `[x for x in items if ...]`

**Amaliyot**
```bash
python3 exercises/ex02_toplamlar.py
```

**O‘tdim**
- [ ] Mashq `OK`
- [ ] Dict dan qiymat olish / qo‘shish oson

---

## Bosqich 5 — Xatolik va fayl

**O‘rganish**
- `try / except`
- `with open(...) as f`
- Matn o‘qish / yozish

**Amaliyot**
1. Foydalanuvchidan son oling; noto‘g‘ri bo‘lsa qayta so‘rang  
2. `eslatma.txt` ga 3 qator yozing, keyin o‘qing  

**O‘tdim**
- [ ] Dastur `int("abc")` da yiqilmaydi
- [ ] Faylni `with` bilan ochasiz

---

## Bosqich 6 — Modul va venv

**O‘rganish**
- `import math`, `from random import randint`
- O‘z faylingizni import qilish
- `python3 -m venv .venv` → activate → `pip install`

**Amaliyot**
1. `utils.py` da `add(a, b)` yozing, boshqa fayldan chaqiring  
2. Yangi papkada venv yarating  

**O‘tdim**
- [ ] Kodni 2 faylga bo‘la olasiz
- [ ] venv yoqib ishlaysiz

---

## Bosqich 7 — Class

**O‘rganish**
- `class`, `__init__`, `self`
- Metodlar, `@property`

**Amaliyot**
```bash
python3 exercises/ex03_class.py
```

**O‘tdim**
- [ ] Mashq `OK`
- [ ] Obyekt yarata olasiz

---

## Bosqich 8 — JSON va pathlib

**O‘rganish**
- `json.loads` / `json.dumps`
- `json.load` / `json.dump` (fayl)
- `pathlib.Path`

**Amaliyot**
```bash
python3 exercises/ex04_json.py
```

**O‘tdim**
- [ ] Mashq `OK`
- [ ] Dict ↔ JSON fayl aylantira olasiz

---

## Bosqich 9 — Loyiha A: Son topish

**Papka:** `loyihalar/01_son_topish/`

**Talab**
- Kompyuter 1..100 oralig‘ida sirli son tanlaydi (`random`)
- Foydalanuvchi taxmin qiladi
- "Katta", "Kichik", "Topdingiz!"
- Necha urinishda topganini ko‘rsatadi
- Xato input (harf) da yiqilmasin

**O‘tdim**
- [ ] O‘yin to‘liq ishlaydi
- [ ] Qayta o‘ynash so‘raydi (ha/yo‘q)

---

## Bosqich 10 — Loyiha B: Todo

**Papka:** `loyihalar/02_todo/`

**Talab**
- Menyu: qo‘shish / ko‘rish / bajarildi / o‘chirish / chiqish
- Ma’lumot `todos.json` da saqlansin
- Dastur qayta ochilganda ro‘yxat qolsin

**O‘tdim**
- [ ] CRUD ishlaydi
- [ ] JSON orqali persist bor

---

## Bosqich 11 — Loyiha C: Xarajatlar

**Papka:** `loyihalar/03_xarajatlar/`

**Talab**
- Xarajat qo‘shish: summa, kategoriya, izoh, sana
- Ro‘yxat chiqarish
- Kategoriya bo‘yicha yig‘indi
- `expenses.json` ga saqlash
- Class ishlating (masalan `Expense`, `Ledger`)

**O‘tdim**
- [ ] Hisobot chiqadi
- [ ] Class + JSON ishlatilgan

---

## Kundalik qoida

1. Bir sessiyada **bitta** bosqich.  
2. Avval o‘zingiz yozing, keyin `solutions/` ga qarang.  
3. Nusxa ko‘chirmang — yechimni yopib qayta yozing.  
4. Bosqichni tashlab o‘tmang.

## Tekshirish

```bash
cd python-amaliyot
python3 exercises/run_all.py
```
