# BGalaxy — Minimal MVP skeleton

Bu repo BGalaxy loyihasining **chinakam minimal MVP** (v0.5 hujjatidagi 12.1-bo'lim)
uchun boshlang'ich skeletoni: auth, kompaniya/jamoa, matnli chat, 1-1 WebRTC
uchrashuvlar, oddiy avatar/profil.

## Struktura

```
bgalaxy-app/
├── backend/            # FastAPI + PostgreSQL + WebSocket
│   ├── app/
│   │   ├── api/routes/ # auth, companies, chat, meetings
│   │   ├── core/       # config, JWT/parol xavfsizligi
│   │   ├── db/         # SQLAlchemy async engine/session
│   │   ├── models/     # User, Company, TeamMembership, Message
│   │   ├── schemas/    # Pydantic request/response modellari
│   │   └── services/   # WebSocket connection manager
│   └── requirements.txt
├── frontend/           # React + Vite
│   └── src/
│       ├── pages/      # Login, Register, Dashboard, Chat, Meeting
│       ├── api/        # backend bilan REST/WS aloqa
│       └── hooks/      # auth context
└── docker-compose.yml  # PostgreSQL + coturn (STUN/TURN)
```

## Ishga tushirish

### 1. Infratuzilma (Postgres + coturn)

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # kerak bo'lsa JWT_SECRET'ni o'zgartiring
uvicorn app.main:app --reload
```

API `http://localhost:8000` da ishga tushadi. Interaktiv hujjatlar: `/docs`.

Jadvallarni yaratish endi **Alembic** orqali boshqariladi (avvalgi `create_tables.py` skripti endi shart emas):

```bash
# Agar bazangiz ALLAQACHON create_tables.py bilan to'ldirilgan bo'lsa (jadvallar bor):
alembic stamp 0001_initial

# Agar bazangiz butunlay bo'sh bo'lsa (yangi o'rnatish):
alembic upgrade head
```

Kelajakda modellarga (`app/models/*.py`) o'zgartirish kiritganingizda, yangi migratsiya avtomatik generatsiya qilinadi:

```bash
alembic revision --autogenerate -m "tavsif"
alembic upgrade head
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:5173` da ochiladi.

### 4. AI Ziyo (ixtiyoriy, lekin tavsiya etiladi)

Ziyo Google Gemini API orqali ishlaydi (bepul, karta shart emas). `backend/.env` fayliga API kalitingizni qo'shing:
```
GEMINI_API_KEY=AIza...
```
Kalit https://aistudio.google.com/apikey dan bir necha soniyada, hech qanday to'lov ma'lumotisiz olinadi. Agar kalit qo'shilmasa, Ziyo sahifasi ochiladi, lekin xabar yuborishga urinilganda tushunarli xato ko'rsatadi ("Ziyo hali sozlanmagan").

### 5. Guruh video-qo'ng'iroqlari (LiveKit Cloud — ixtiyoriy)

Bir nechta kishi (2 dan ortiq) bir vaqtda video orqali gaplashishi uchun LiveKit Cloud'dan foydalaniladi (bepul tarifi bor, karta shart emas):

1. https://cloud.livekit.io ga o'ting, ro'yxatdan o'ting
2. Yangi loyiha (project) yarating
3. **"Settings" → "Keys"** bo'limidan API Key va API Secret oling
4. Loyiha sozlamalaridan **WebSocket URL**ni oling (masalan `wss://your-project.livekit.cloud`)
5. `backend/.env` fayliga qo'shing:
```
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://your-project.livekit.cloud
```

Kalit qo'shilmasa, "Guruh uchrashuvi" sahifasi ochiladi, lekin qo'shilishga urinilganda tushunarli xato ko'rsatadi.

## Nima ishlaydi (v0 skeleton)

- Ro'yxatdan o'tish / kirish (JWT)
- Kompaniya yaratish (yaratuvchi avtomatik admin bo'ladi)
- Jamoaga taklif qilish — admin email bo'yicha taklif linki yaratadi, uni qo'lda yuboradi (email jo'natilmaydi)
- Matnli chat — WebSocket orqali real-vaqtli, tarix PostgreSQL'da saqlanadi
- 1-1 video uchrashuv — WebRTC + FastAPI signaling + coturn (STUN/TURN)
- Guruh video-qo'ng'iroqlari — LiveKit Cloud orqali, bir nechta ishtirokchi (bepul tarifi bor)
- AI Ziyo — Google Gemini API bilan ishlaydigan shaxsiy AI yordamchi (bepul)
- Buxgalteriya moduli — kirim/chiqim, hisob-fakturalar, ish haqi, oylik hisobot (faqat "manage_accounting" ruxsatiga ega lavozimlarga ko'rinadi)

## Hali qo'shilmagan (keyingi qadamlar)

- Avatar yuklash (fayl saqlash — S3/local storage)
- Frontend'da xatoliklarni to'liq boshqarish, loading holatlari
- Testlar
