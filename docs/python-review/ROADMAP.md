# Python — 0-dan roadmap

Bu tartibda o‘rganing. Keyingi bosqichga **faqat** joriy bosqichning “o‘tdim” belgilari bajarilgach o‘ting.

```text
  0  Muhit
  │
  1  Asoslar (son, matn, o'zgaruvchi)
  │
  2  Shart va sikl
  │
  3  Funksiya
  │
  4  List / dict / set
  │
  5  Fayl va xatolik
  │
  6  Modul va paket
  │
  7  Class (OOP)
  │
  8  Typing + toza kod
  │
  9  Mini loyiha (CLI)
  │
 10  HTTP va API tushunchasi
  │
 11  FastAPI asoslari
  │
 12  DB + SQLAlchemy
  │
 13  Async
  │
 14  BGalaxy backendni o'qish
  ▼
     O'zingiz feature/bug yozish
```

---

## Bosqich 0 — Muhit

**Nima qilish**
- Python 3.11+ o‘rnatish
- Terminalda `python` / `python3` ishlatish
- Oddiy fayl: `hello.py` → `print("Salom")`
- ixtiyoriy: VS Code / Cursor

**O‘tdim deb belgilash**
- [ ] Terminalda skript ishga tushadi
- [ ] Xato xabarini o‘qib, qaysi qatorda ekanini topsangiz

---

## Bosqich 1 — Asoslar

**Mavzu**
- `int`, `float`, `str`, `bool`, `None`
- O‘zgaruvchi, `input()`, `print()`, f-string
- Operatorlar: `+ - * / // % **`, `== != < >`, `and or not`

**Amaliyot**
- Kalkulyator (2 son + amal)
- Ism so‘rab, salomlashuv chiqarish

**O‘tdim**
- [ ] Turlarni farqlaysiz
- [ ] f-string bilan matn yig‘asiz
- [ ] `None` nima ekanini tushunasiz

---

## Bosqich 2 — Shart va sikl

**Mavzu**
- `if / elif / else`
- `for`, `while`, `range`
- `break`, `continue`

**Amaliyot**
- Ball → baho (`A/B/C/F`)
- 1..N yig‘indisi
- Secret son o‘yini (taxmin)

**O‘tdim**
- [ ] Ichma-ich `if` yozasiz
- [ ] `for` va `while` ni to‘g‘ri tanlaysiz

---

## Bosqich 3 — Funksiya

**Mavzu**
- `def`, parametr, `return`
- Default parametr
- Scope (lokal / global — faqat tushuncha)

**Amaliyot**
- `normalize_email(email)`
- `grade_for_score(score)`
- Kichik menyuli dastur (funksiyalarga bo‘lingan)

**O‘tdim**
- [ ] Bir ish = bir funksiya
- [ ] `return` va `print` farqini bilasiz

**Mashq (shu repo):** `exercises/ex01_basics.py`

---

## Bosqich 4 — To‘plamlar

**Mavzu**
- `list`, `dict`, `set`, `tuple`
- Indeks, slice, `in`, `.get()`
- List/dict comprehension (sodda)

**Amaliyot**
- Foydalanuvchilar ro‘yxatidan faollarni filterlash
- Rol bo‘yicha sanash
- Tag’lardan unique + sort

**O‘tdim**
- [ ] JSON ga o‘xshash `dict` ni bemalol o‘qiysiz
- [ ] Comprehension ni sodda holatda yozasiz

**Mashq:** `exercises/ex02_collections.py`

---

## Bosqich 5 — Fayl va xatolik

**Mavzu**
- `open`, `with`, o‘qish/yozish
- `try / except / else / finally`
- `raise`

**Amaliyot**
- Matnli “kontaktlar” ni faylga saqlash
- Noto‘g‘ri input da dastur yiqilmasin

**O‘tdim**
- [ ] Faylni `with` bilan ochasiz
- [ ] Kerakli exception ni ushlaysiz

---

## Bosqich 6 — Modul va paket

**Mavzu**
- `import`, `from ... import ...`
- O‘z modulingiz (`utils.py`)
- `if __name__ == "__main__"`
- `pip` + `venv` (virtual muhit)

**Amaliyot**
- Loyihani 2–3 faylga bo‘lish
- `venv` yaratib, bitta paket o‘rnatish

**O‘tdim**
- [ ] Kodni fayllarga ajratasiz
- [ ] `venv` nima uchun kerakligini bilasiz

---

## Bosqich 7 — Class (OOP)

**Mavzu**
- `class`, `__init__`, `self`
- Metod, `@property`
- (Keyinroq) inheritance — faqat o‘qish darajasida

**Amaliyot**
- `Member` / `Team` classlari
- Oddiy bank hisobi yoki todo class

**O‘tdim**
- [ ] Obyekt yaratib, metod chaqirasiz
- [ ] `@property` ni tushunasiz

**Mashq:** `exercises/ex03_oop.py`

---

## Bosqich 8 — Typing va toza kod

**Mavzu**
- Type hints: `str`, `list[str]`, `str | None`
- Funksiya imzosi o‘qiladigan bo‘lsin
- Nomlash: aniq o‘zgaruvchi nomlari

**Amaliyot**
- Oldingi funksiyalarga type hint qo‘shish

**O‘tdim**
- [ ] `str | None` ni ko‘rib, “bo‘lishi mumkin yo‘q” deb o‘qiysiz

---

## Bosqich 9 — Mini loyiha (CLI)

**Bitta loyiha tanlang** (hammasini emas):

1. **Todo CLI** — qo‘shish, ro‘yxat, o‘chirish, faylga saqlash  
2. **Kontaktlar** — dict + fayl  
3. **Xarajatlar daftar** — kategoriya, yig‘indi, hisobot  

**O‘tdim**
- [ ] Dastur 1-fayldan katta, lekin siz yozgansiz
- [ ] Xato inputda yiqilmaydi
- [ ] Funksiya/class ga bo‘lingan

> Shu yerdan keyin “Python bilaman” deb aytish mumkin. Keyingisi — web/backend.

---

## Bosqich 10 — HTTP va API

**Mavzu (nazariya + oddiy amaliyot)**
- Request / response
- Method: GET, POST, PUT, DELETE
- Status code: 200, 400, 401, 404, 500
- JSON

**Amaliyot**
- Brauzerda ochiq API ni ko‘rish
- ixtiyoriy: `httpx` yoki `requests` bilan GET

**O‘tdim**
- [ ] Endpoint nima ekanini tushunasiz
- [ ] JSON body nima ekanini bilasiz

---

## Bosqich 11 — FastAPI asoslari

**Mavzu**
- Route, path/query parametr
- Pydantic model (request/response)
- `Depends` g‘oyasi
- Swagger: `/docs`

**Amaliyot**
- Yangi papkada mini API: `/health`, `/items`
- POST bilan item qo‘shish (xotirada list)

**O‘tdim**
- [ ] `/docs` dan endpoint sinaysiz
- [ ] Schema (Pydantic) nima uchun kerakligini bilasiz

---

## Bosqich 12 — Database + SQLAlchemy

**Mavzu**
- Jadval / qator / ustun
- Model = class
- CRUD: create, read, update, delete
- Migratsiya g‘oyasi (Alembic — o‘qish)

**Amaliyot**
- Mini API ga SQLite yoki Postgres ulash
- User jadvali: yaratish + olish

**O‘tdim**
- [ ] Model maydonlarini o‘qiysiz
- [ ] Oddiy `select` / `add` / `commit` ketma-ketligini tushunasiz

---

## Bosqich 13 — Async

**Mavzu**
- `async def`, `await`
- Nima uchun DB/tarmoqda async
- `asyncio.gather` (parallel kutish)

**Amaliyot**
- `exercises/ex04_async_mini.py`
- FastAPI + async route o‘qish

**O‘tdim**
- [ ] `await` ni qachon qo‘yishni bilasiz
- [ ] Sync funksiyani `await` qilish mumkin emasligini bilasiz

---

## Bosqich 14 — BGalaxy backend

**Shu tartibda o‘qing:**

1. `backend/app/core/security.py` — oddiy funksiyalar  
2. `backend/app/models/user.py` — class + property  
3. `backend/app/schemas/` — Pydantic  
4. `backend/app/api/deps.py` — auth dependency  
5. `backend/app/api/routes/auth.py` — login/register  
6. `backend/app/main.py` — app yig‘ilishi  

**O‘tdim**
- [ ] Login oqimini og‘zaki tushuntira olasiz
- [ ] Kichik o‘zgarish (masalan, response matni) qila olasiz

---

## Qanday ishlash (kundalik)

1. Bitta bosqich — bitta sessiyada (yoki 2).  
2. Avval 20 daqiqa o‘qing, keyin yozing.  
3. Kod yozmasdan video ko‘rib o‘tirmang.  
4. Qiyin joyda yechimga qarang, keyin **yopib qayta yozing**.  
5. Bosqichni skip qilmang — teshik keyin FastAPI da chiqadi.

## Mashqlarni ishga tushirish

```bash
cd docs/python-review
python3 exercises/ex01_basics.py      # bosqich 3
python3 exercises/ex02_collections.py # bosqich 4
python3 exercises/ex03_oop.py         # bosqich 7
python3 exercises/ex04_async_mini.py  # bosqich 13
python3 exercises/run_all.py
```

Yechimlar: `solutions/` (avval o‘zingiz urining).

## Tavsiya etilgan tashqi manba (ixtiyoriy)

- Rasmiy tutorial: https://docs.python.org/3/tutorial/  
- FastAPI: https://fastapi.tiangolo.com/tutorial/  

Asosiy manba — shu roadmap + o‘zingiz yozgan kod.
