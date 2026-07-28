# BG (Business Galaxy) — Deploy qo'llanmasi (bepul tarif)

Bu qo'llanma orqali dasturingizni **haqiqiy internetga** (bepul xizmatlar orqali) chiqarasiz. Jarayon 4 bosqichdan iborat, har birida hisob ochish va sozlamalarni kiritish kerak.

---

## 0-qadam: Kodni GitHub'ga joylang

Barcha xizmatlar (Render, Vercel) kodni **GitHub** orqali oladi.

1. [github.com](https://github.com) da bepul hisob oching (agar yo'q bo'lsa)
2. Yangi **repository** yarating (masalan `bgalaxy-app`), **Private** qilib qo'ying
3. Kompyuteringizda, `bgalaxy-app` papkasi ichida:
```powershell
git init
git add .
git commit -m "Birinchi versiya"
git branch -M main
git remote add origin https://github.com/SIZNING_USERNAME/bgalaxy-app.git
git push -u origin main
```

---

## 1-qadam: Ma'lumotlar bazasi — Neon (bepul PostgreSQL)

1. [neon.tech](https://neon.tech) ga kiring, **"Sign up"** (GitHub orqali kirish qulay)
2. **"Create a project"** — nomini `bgalaxy` deb qo'ying
3. Loyiha yaratilgach, **"Connection string"** ni ko'rasiz — quyidagicha ko'rinishda:
   ```
   postgresql://user:password@ep-xxx.neon.tech/bgalaxy?sslmode=require
   ```
4. Shu qatorni **nusxalab oling** — bu keyingi qadamda kerak bo'ladi. **Muhim:** `postgresql://` qismini `postgresql+asyncpg://` ga o'zgartiring (bizning kod shu formatni kutadi).

---

## 2-qadam: Backend — Render

1. [render.com](https://render.com) ga kiring, **GitHub orqali** ro'yxatdan o'ting
2. **"New +"** → **"Blueprint"** ni tanlang
3. GitHub'dagi `bgalaxy-app` repositoryingizni ulang — Render avtomatik `render.yaml` faylini topadi
4. **"Apply"** bosing — Render sizdan quyidagi muhit o'zgaruvchilarini so'raydi, birma-bir kiriting:

| O'zgaruvchi | Qiymat |
|---|---|
| `DATABASE_URL` | 1-qadamda olgan Neon qatoringiz (`postgresql+asyncpg://...`) |
| `CORS_ORIGINS` | `["https://SIZNING-SAYT.vercel.app"]` (3-qadamdan keyin to'ldirasiz, hozircha `["*"]` qo'yib turing) |
| `FRONTEND_URL` | `https://SIZNING-SAYT.vercel.app` (3-qadamdan keyin to'ldirasiz) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_USER` | Gmail manzilingiz |
| `SMTP_PASSWORD` | Gmail App Password (oddiy parol emas!) |
| `SMTP_FROM` | `BG <sizning-emailingiz@gmail.com>` |
| `GOOGLE_CLIENT_ID` | Google kirish uchun (bo'lmasa bo'sh qoldiring) |
| `INITIAL_DEVELOPER_EMAIL` | Sizning emailingiz |
| `GEMINI_API_KEY` | AI Ziyo uchun kalit |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` / `LIVEKIT_URL` | 4-qadamdan olinadi |

`JWT_SECRET` — Render **o'zi avtomatik** xavfsiz qiymat yaratadi, hech narsa kiritish shart emas.

5. **"Deploy"** ni bosing. Bir necha daqiqadan so'ng, Render sizga backend manzilini beradi:
   ```
   https://bgalaxy-backend.onrender.com
   ```
   Shu manzilni saqlab qo'ying — frontend uchun kerak bo'ladi.

---

## 3-qadam: Frontend — Vercel

1. [vercel.com](https://vercel.com) ga kiring, **GitHub orqali** ro'yxatdan o'ting
2. **"Add New..."** → **"Project"** — `bgalaxy-app` repositoryingizni tanlang
3. **"Root Directory"** ni `frontend` deb belgilang (juda muhim — aks holda Vercel loyihani topolmaydi)
4. **"Environment Variables"** bo'limida qo'shing:

| O'zgaruvchi | Qiymat |
|---|---|
| `VITE_API_URL` | 2-qadamda olgan Render manzilingiz (masalan `https://bgalaxy-backend.onrender.com`) |
| `VITE_GOOGLE_CLIENT_ID` | (ixtiyoriy, Google kirish uchun) |

5. **"Deploy"** ni bosing. Bir necha daqiqadan so'ng, Vercel sizga saytingiz manzilini beradi:
   ```
   https://bgalaxy-app.vercel.app
   ```

---

## 4-qadam: Bog'lash — CORS va LiveKit

1. **Render'ga qayting** → backend xizmatingiz → **"Environment"** bo'limi:
   - `CORS_ORIGINS` ni yangilang: `["https://bgalaxy-app.vercel.app"]` (haqiqiy Vercel manzilingiz bilan)
   - `FRONTEND_URL` ni ham yangilang: `https://bgalaxy-app.vercel.app`
   - Saqlagach, Render avtomatik qayta ishga tushiradi (redeploy)

2. **LiveKit Cloud** (video/ovoz uchun):
   - [livekit.io](https://livekit.io) → **"Sign up"** (bepul)
   - Yangi loyiha yarating
   - **"Settings" → "Keys"** bo'limidan `API Key`, `API Secret`, va `WebSocket URL` (masalan `wss://sizning-loyiha.livekit.cloud`) ni oling
   - Bularni Render'dagi `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` maydonlariga qo'ying

---

## Tayyor bo'lgach — tekshiring

1. `https://bgalaxy-app.vercel.app` ni oching
2. Ro'yxatdan o'ting, kirib ko'ring
3. Agar biror narsa ishlamasa — Render'dagi **"Logs"** bo'limini oching, u yerda backend xatolarini ko'rasiz

## Eslatma — "uxlab qolish" haqida
Render'ning bepul tarifi — 15 daqiqa hech kim foydalanmasa, backend "uxlab qoladi". Birinchi kirishda 30-60 soniya kutish kerak bo'ladi (server "uyg'onadi"), keyin tezlashadi. Bu — normal holat, xato emas.

---

## Android ilova (MVP)

Telefon uchun qobiq **Capacitor** orqali qo‘yilgan. Batafsil: [`docs/ANDROID.md`](docs/ANDROID.md).

Qisqa:
1. `cd frontend && npm run build:android`
2. Android Studio da ochib Run
3. Render `CORS_ORIGINS` ga `https://localhost` qo‘shing

