# Dating Bot — serverga deploy (VPS + Docker + HTTPS)

Telegram Mini App uchun **HTTPS** shart. Eng sodda yo‘l: bitta VPS + Caddy (avtomatik SSL).

## Kerak

1. VPS (Ubuntu 22.04+), ochiq portlar: **80, 443**
2. Domen (masalan `date.sizning-domen.uz`) → VPS IP ga **A record**
3. Telegram `BOT_TOKEN`
4. TURN (tavsiya): [metered.ca](https://www.metered.ca/tools/openrelay/) yoki o‘z TURN

## 1) Serverda Docker

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER
# qayta login qiling
```

## 2) Kod

```bash
git clone https://github.com/DilshodZokirov/dating_bot.git
cd dating_bot
cp .env.example .env
nano .env
```

### `.env` namunasi (production)

```env
BOT_TOKEN=123456:ABC...
DOMAIN=date.example.com
WEBAPP_URL=https://date.example.com

POSTGRES_USER=postgres
POSTGRES_PASSWORD=KUCHLI_PAROL
POSTGRES_DB=dating_bot
POSTGRES_HOST=db
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://postgres:KUCHLI_PAROL@db:5432/dating_bot

REDIS_URL=redis://redis:6379/0

MIN_AGE=18
MAX_AGE_GAP=5

# TURN (mobil video uchun)
METERED_DOMAIN=your-subdomain.metered.live
METERED_SECRET_KEY=...
```

> `DOMAIN` — Caddy uchun (SSL). `WEBAPP_URL` — bot Menu/Mini App uchun (`https://` bilan, oxirida `/` yo‘q).

## 3) Domen DNS

Registrator (Nicnames va hokazo) da:

| Type | Name | Value        |
|------|------|--------------|
| A    | date | VPS_IP_MANZIL |

DNS tarqalishini kuting (5–30 daqiqa).

## 4) Ishga tushirish

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
curl -I https://date.example.com/health
```

`/health` → `200` bo‘lishi kerak.

## 5) Telegram

1. Botda `/start`
2. **Qidirish / Qo‘ng‘iroq** tugmasi ochilishi kerak
3. Ikkita akkaunt bilan match → audio/video

Agar Menu ishlamasa — bot konteynerini qayta ishga tushiring (`WEBAPP_URL` o‘zgargan bo‘lsa):

```bash
docker compose -f docker-compose.prod.yml restart bot
```

## Yangilash

```bash
cd dating_bot
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Muammolar

| Belgi | Sabab / yechim |
|--------|----------------|
| Mini App ochilmaydi | `WEBAPP_URL` HTTPS emas yoki DNS noto‘g‘ri |
| SSL xato | Domen hali VPS ga qaragan emas — DNS kuting |
| Audio bor, video yo‘q / ICE failed | TURN sozlang (`METERED_*`) |
| Bot javob bermaydi | `docker compose -f docker-compose.prod.yml logs bot` |

## Xavfsizlik

- `.env` ni GitHub ga qo‘ymang
- Postgres/Redis portlari tashqariga ochilmagan (`docker-compose.prod.yml`)
- Kuchli `POSTGRES_PASSWORD` ishlating
