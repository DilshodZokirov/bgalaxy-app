# Python — 0-dan (runtime + amaliyot)

Avval **til qanday ishlaydi** (compiler / interpreter / xotira), keyin **kod yozish**.  
Boshqa loyihalarga bog‘liq emas.

```text
  0  Muhit
  │
  1  Compiler vs Interpreter
  │
  2  Python qanday ishlaydi (bytecode, PVM)
  │
  3  Memory management (havola, refcount, GC)
  │
  4  Asoslar — son, matn, o'zgaruvchi
  │
  5  Shart va sikl
  │
  6  Funksiya
  │
  7  List, dict, set  (+ xotira oqibatlari)
  │
  8  Xatolik va fayl
  │
  9  Modul, venv, pip
  │
 10  Class
  │
 11  JSON va pathlib
  │
 12  Loyiha A — Son topish
  │
 13  Loyiha B — Todo
  │
 14  Loyiha C — Xarajatlar
  ▼
```

---

## Bosqich 0 — Muhit

Dars: [darslar/00-muhit.md](darslar/00-muhit.md)

**O‘tdim:** `hello.py` ishlaydi.

---

## Bosqich 1 — Compiler va Interpreter

Dars: [darslar/01-compiler-interpreter.md](darslar/01-compiler-interpreter.md)

**Amaliyot**
```bash
python3 -c "import dis; dis.dis('x = 1 + 2')"
```

**O‘tdim**
- [ ] Compiler / interpreter farqini tushuntira olasiz
- [ ] Python = compile → bytecode → interpret ekanini bilasiz

---

## Bosqich 2 — Python qanday ishlaydi

Dars: [darslar/02-python-qanday-ishlaydi.md](darslar/02-python-qanday-ishlaydi.md)

**Amaliyot**
```python
a = [1]
b = a
c = [1]
print(a is b, a is c, a == c)
```

**O‘tdim**
- [ ] Ism → obyekt modelini bilasiz
- [ ] `==` va `is` farqi aniq

---

## Bosqich 3 — Memory management

Dars: [darslar/03-memory-management.md](darslar/03-memory-management.md)

**Amaliyot**
```bash
cd python-amaliyot
python3 exercises/ex00_xotira.py
```

**O‘tdim**
- [ ] Mashq `OK`
- [ ] Refcount + GC nima uchun kerakligini aytolasiz
- [ ] `y = x` list da nusxa emasligini bilasiz

> Keyingi amaliyot shu asos ustiga quriladi.

---

## Bosqich 4 — Asoslar

**O‘rganish:** `int`, `float`, `str`, `bool`, `None`, `input`, f-string, arifmetika

**Amaliyot**
1. Ism so‘rab salomlashuv  
2. Mini kalkulyator  
3. C → F: `F = C * 9/5 + 32`

**O‘tdim**
- [ ] `input` string qaytarishini bilasiz
- [ ] f-string ishlatasiz

---

## Bosqich 5 — Shart va sikl

**O‘rganish:** `if/elif/else`, `for`, `while`, `range`, `break/continue`

**Amaliyot:** baho (`A/B/C/F`), 1..N yig‘indi, juft sonlar

**O‘tdim**
- [ ] `elif` zanjiri
- [ ] `for` bilan aylanma

---

## Bosqich 6 — Funksiya

```bash
python3 exercises/ex01_funksiya.py
```

**O‘tdim:** mashq `OK`; `return` vs `print` aniq.

---

## Bosqich 7 — To‘plamlar (+ xotira)

```bash
python3 exercises/ex02_toplamlar.py
```

Qo‘shimcha: list ni funksiyaga berib, ichida `append` qiling — tashqarida ham o‘zgarishini ko‘ring (bosqich 3 eslatmasi).

**O‘tdim:** mashq `OK`.

---

## Bosqich 8 — Xatolik va fayl

**O‘rganish:** `try/except`, `with open(...)`

**Amaliyot:** noto‘g‘ri sondan himoya; `eslatma.txt` yozish/o‘qish

---

## Bosqich 9 — Modul va venv

**O‘rganish:** `import`, o‘z moduli, `python3 -m venv .venv`, `pip`

**Amaliyot:** `utils.py` + chaqiruv; venv yaratish

---

## Bosqich 10 — Class

```bash
python3 exercises/ex03_class.py
```

**O‘tdim:** mashq `OK`.

---

## Bosqich 11 — JSON

```bash
python3 exercises/ex04_json.py
```

**O‘tdim:** mashq `OK`.

---

## Bosqich 12 — Loyiha A: Son topish

`loyihalar/01_son_topish/` — talablar README da.

---

## Bosqich 13 — Loyiha B: Todo

`loyihalar/02_todo/` — JSON ga saqlansin.

---

## Bosqich 14 — Loyiha C: Xarajatlar

`loyihalar/03_xarajatlar/` — class + JSON.

---

## Kundalik qoida

1. 0→3 ni shoshilmay o‘qing — keyingisi osonlashadi.  
2. Avval o‘zingiz yozing, keyin `solutions/`.  
3. Bosqichni tashlamang.

## Tekshirish

```bash
cd python-amaliyot
python3 exercises/ex00_xotira.py
python3 exercises/run_all.py
```
