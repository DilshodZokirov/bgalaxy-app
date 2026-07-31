# 05 — Async va BGalaxy backend

## Sync vs async

Oddiy funksiya navbat bilan ishlaydi. `async` esa kutish (DB, tarmoq) paytida boshqa ishlarga yo‘l beradi.

```python
async def get_user():
    result = await db.execute(select(User)...)
    return result.scalar_one_or_none()
```

- `async def` — korutina
- `await` — natijani kutish (faqat `async` ichida)

## FastAPI qisqa sxema

```text
HTTP so‘rov
   → route (api/routes/*.py)
   → Depends(get_current_user)  # deps.py
   → DB (models + SQLAlchemy)
   → Pydantic schema (schemas/)
   → JSON javob
```

## Ochib o‘qing (shu tartibda)

1. `backend/app/core/security.py` — oddiy funksiyalar, typing, `try/except`
2. `backend/app/models/user.py` — class, `Mapped`, `@property`
3. `backend/app/api/deps.py` — `async def`, `Depends`, `HTTPException`
4. `backend/app/main.py` — `FastAPI` app, middleware, routerlar
5. `backend/app/api/routes/auth.py` — login/register endpointlar

## O‘qish savollari (o‘zingizga)

1. `decode_access_token` nima qaytaradi, xato bo‘lsa nima?
2. `User.has_pin` nega `@property`?
3. `get_current_user` qachon 401 beradi?
4. `lifespan` nima uchun kerak? (`main.py`)

## Kichik amaliyot (ixtiyoriy)

Backend ishlayotganda:

```bash
cd backend
source venv/bin/activate   # agar venv bo‘lsa
uvicorn app.main:app --reload
```

Brauzerda: `http://localhost:8000/docs` — endpointlarni sinab ko‘ring.

## Keyingi qadam

Python asoslari mustahkam bo‘lgach:

- FastAPI tutorial (rasmiy)
- SQLAlchemy 2.0 async
- Shu repoda kichik bugfix / feature

Mashq: `exercises/ex04_async_mini.py`
