# Python takrorlash — BGalaxy uchun

Oldin o‘rgangan Pythonni tez va amaliy qayta mustahkamlash. Nazariya qisqa, mashqlar ko‘p. Oxirida shu repodagi **FastAPI** backendini o‘qish osonlashadi.

## Qanday o‘qish kerak

1. Har bir darsni o‘qing (10–20 daqiqa).
2. `exercises/` dagi faylni oching, `# TODO` joylarni to‘ldiring.
3. Tekshirish:

```bash
cd docs/python-review
python3 exercises/ex01_basics.py
python3 exercises/ex02_collections.py
python3 exercises/ex03_oop.py
python3 exercises/ex04_async_mini.py
# yoki hammasi:
python3 exercises/run_all.py
```

4. Qiyin bo‘lsa — `solutions/` ga qarang, keyin o‘zingiz qayta yozing.
5. Keyin `05-bgalaxy.md` orqali real kodni ochib ko‘ring.

## Darslar tartibi

| # | Fayl | Mavzu | BGalaxy bog‘lanishi |
|---|------|-------|---------------------|
| 1 | [01-asoslar.md](01-asoslar.md) | tiplar, `if`, funksiyalar, `None` | `hash_password`, oddiy helperlar |
| 2 | [02-strukturalar.md](02-strukturalar.md) | list/dict/set, comprehension | JSON body, filterlash |
| 3 | [03-oop.md](03-oop.md) | class, property, dataclass | `User` model, Pydantic |
| 4 | [04-typing-xato.md](04-typing-xato.md) | typing, exception, modul | `str \| None`, `HTTPException` |
| 5 | [05-bgalaxy.md](05-bgalaxy.md) | async, FastAPI, SQLAlchemy | `backend/app/` |

## Maqsad

Takrorlashdan keyin siz:

- oddiy Python skript yozasiz
- funksiya / class / typing ni bemalol o‘qiysiz
- `async def` va `await` ni tushunasiz
- `backend/app/api/deps.py`, `models/user.py`, `core/security.py` ni izohlaysiz

## Vaqt (taxminiy)

- Tez takrorlash: 1–2 sessiyada 01→04 + mashqlar
- Chuqurroq: + 05 va backend fayllarini ochib o‘qish
