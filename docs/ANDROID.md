# Business Galaxy — Android MVP (Capacitor)

Bu qo‘llanma **nima uchun** va **qanday** Android ilova chiqarilishini oddiy tilda tushuntiradi.

---

## 1) G‘oya (1 daqiqada)

| Qism | Qayerda | Vazifasi |
|------|---------|----------|
| **UI (tugmalar, sahifalar)** | `frontend/` — React | Hozirgi saytning o‘zi |
| **Ma’lumot / API** | Render (`bgalaxy-backend`) | Login, ombor, chat… |
| **Android qobiq** | Capacitor + `android/` | Telefon ilovasi sifatida ochadi |

Ya’ni: **yangi dastur yozilmaydi**. Sayt APK ichiga joylanadi va telefon “ilova” deb ochadi.

```text
[ Telefon ilovasi ]
       │
       ▼
[ Capacitor WebView ]  ← ichida sizning React saytingiz
       │
       ▼
[ Render API ]  ← https://bgalaxy-backend.onrender.com
```

---

## 2) Kompyuteringizda kerak bo‘ladiganlar

1. **Node.js** (allaqachon bor — frontend uchun)
2. **Android Studio** — [developer.android.com/studio](https://developer.android.com/studio)
   - O‘rnatganda: Android SDK, emulator yoki USB orqali telefon
3. GitHub’dan `bgalaxy-app` ning so‘nggi `master` (yoki shu PR branch)

> Cloud agent ichida to‘liq APK yig‘ib telefoningizga o‘rnatib bo‘lmaydi —
> APK ni **o‘z kompyuteringizda** Android Studio bilan yig‘asiz.

---

## 3) Birinchi marta — buyruqlar

PowerShell / terminalda:

```bash
cd frontend
npm install
npm run build:android
```

Bu nima qiladi?

1. `vite build --mode capacitor` — saytni `dist/` ga yig‘adi (Android uchun relative path)
2. `npx cap sync android` — `dist/` ni `android/` loyihasiga ko‘chiradi

Keyin Android Studio ochish:

```bash
npm run cap:open
```

Android Studio da:

1. Emulator yoki USB telefon ulang
2. **Run ▶** bosing
3. Ilova ochiladi → login qilib ko‘ring

---

## 4) Muhim: Render CORS

Telefon ilovasi brauzer emas — so‘rovlar odatda `https://localhost` origin bilan ketadi.

Render → backend → **Environment** → `CORS_ORIGINS` ga qo‘shing (masalan):

```json
["https://SIZNING-SAYT.vercel.app","https://localhost","capacitor://localhost","http://localhost"]
```

Saqlang → Render qayta deploy qiladi.

`FRONTEND_URL` ni Vercel manzilingizda qoldiring.

---

## 5) Har safar web o‘zgarsa

Kodni o‘zgartirdingiz → qayta:

```bash
cd frontend
npm run build:android
```

Keyin Android Studio da yana Run, yoki:

```bash
npm run android
```

(`build:android` + Studio ochish)

---

## 6) MVP da nima bor / nima yo‘q

**Bor (web bilan bir xil):**
- Login, korxona, ombor, buyurtmalar, chat, vazifalar, statistika…

**Hali keyinga (alohida ish):**
- Push notification (Firebase)
- Play Store’ga chiqarish (imzo, AAB, privacy policy)
- Google login mobil uchun alohida sozlash (kerak bo‘lsa)
- Faqat mobil uchun soddalashtirilgan UI

---

## 7) Play Store (keyingi bosqich — hozir shart emas)

1. Google Play Console hisobi
2. Android Studio → **Build → Generate Signed Bundle (AAB)**
3. Ichki test trekiga yuklash
4. Testerlarga link

---

## 8) Fayllar (repoda)

| Fayl | Ma’nosi |
|------|---------|
| `frontend/capacitor.config.json` | Ilova nomi, paket: `com.bgalaxy.app` |
| `frontend/android/` | Android Studio loyihasi |
| `frontend/src/native.js` | Status bar, splash, orqaga tugmasi |
| `frontend/.env.capacitor` | APK buildida API manzili (Render) |
| `npm run build:android` | Web → Android sync |
| AGP / Gradle | Studio mosligi uchun AGP **8.7.3** + Gradle **8.9** (eski Studio ham ochadi) |

---

## 9) Muammo bo‘lsa

| Belgi | Nima qilish |
|-------|-------------|
| Login / API ishlamaydi | Render CORS + `VITE_API_URL` tekshiring; backend “uxlab” qolgan bo‘lishi mumkin (1 daqiqa kuting) |
| Bo‘sh oq ekran | `npm run build:android` qayta ishga tushiring |
| `cap open` xato | Android Studio o‘rnatilganini tekshiring |
| Eski UI chiqadi | Sync qilmagansiz — yana `build:android` |
| `incompatible version (AGP 8.13...)` | Studio eski. Loyihada AGP 8.7.3 qo‘yilgan — `git pull` qiling yoki Studio’ni yangilang |

---

**Qisqa xulosa:** web = miya, Capacitor = telefon qobig‘i, Render = ma’lumot. Avval Studio da telefonda ishlatib ko‘ring, keyin Play Store.
