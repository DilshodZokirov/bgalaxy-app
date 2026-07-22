# BGalaxy — Test Log

Sinovdan o'tgan har bir band oldiga `[x]` qo'ying. Xato topilsa, "Izoh" ustuniga yozib qo'ying — keyin birga tuzatamiz.

_Oxirgi yangilanish: 2026-07-19_

---

## 1. Ro'yxatdan o'tish / Kirish

- [ ] Ro'yxatdan o'tish — email+parol bilan
- [ ] Ro'yxatdan o'tgach avtomatik kirmayapti, "Emailingizni tekshiring" xabari chiqadi
- [ ] Tasdiqlash xati emailga keladi (SMTP sozlangan bo'lsa)
- [ ] Tasdiqlash havolasini bosgach — "Tasdiqlandi" sahifasi chiqadi
- [ ] Tasdiqlanmagan holda kirishga urinilsa — rad etiladi + "Qayta yuborish" tugmasi chiqadi
- [ ] Tasdiqlangandan keyin oddiy kirish ishlaydi
- [ ] Google orqali kirish (agar sozlangan bo'lsa) — ⚠️ hozircha muammoli, deferred
- [ ] Parolni unutdim — email kiritilsa havola keladi
- [ ] Yangi parol o'rnatish havoladan ishlaydi, "parol almashtirildi" tasdiq xati keladi
- [ ] Chiqish (logout)

## 2. Profil / Sozlamalar

- [ ] Ism/emailni tahrirlash
- [ ] Avatar yuklash (fayldan)
- [ ] Avatar — tayyor variantlardan tanlash (DiceBear, 16 ta)
- [ ] Sozlamalar → Qorong'u/Yorug' rejim almashtirish (🌙/☀️ tugma ham)
- [ ] Sozlamalar → Mavzu (10 ta rang varianti) tanlash — butun ilovaga ta'sir qiladi
- [ ] Sozlamalar → Orqa fon (50 ta tayyor variant) tanlash
- [ ] Sozlamalar → O'z rasmingizni orqa fon sifatida yuklash
- [ ] Qorong'u va yorug' rejim uchun **alohida-alohida** fon saqlanadi

## 3. Kompaniyalar

- [ ] Yangi kompaniya yaratish
- [ ] Sidebar select orqali faol kompaniyani almashtirish
- [ ] Kompaniyalar sahifasida faqat **faol** kompaniya ko'rinadi
- [ ] A'zo qo'shish (email orqali qidirib, taklif yuborish)
- [ ] Taklif qilingan odamning bildirishnomasida "A'zo bo'lish" tugmasi chiqadi
- [ ] Qabul qilingandan keyin ham, lavozim berilmaguncha "kutilmoqda" holatida qoladi
- [ ] Owner lavozim tayinlagach — a'zo to'liq faollashadi (o'ziga bildirishnoma keladi)
- [ ] Lavozimlar — yaratish, tahrirlash, ruxsatlarni belgilash
- [ ] Kompaniyani o'chirish (faqat owner)

## 4. Chat

- [ ] Yangi kanal yaratish (a'zolarni tanlab)
- [ ] Kanal nomini o'zgartirish (✏️, faqat egasi)
- [ ] Kanalga keyinroq a'zo qo'shish — yangi a'zo darhol ko'rinmaydi, taklif qabul qilinguncha "kutilmoqda"
- [ ] Kanal a'zolari paneli — "(egasi)" belgisi, Chiqarish tugmasi
- [ ] Kanalni yopish (faqat egasi)
- [ ] # eslatma — `#lavozim` yozilsa, o'sha lavozimdagilarga bildirishnoma boradi
- [ ] # eslatma — `#Ism` yozilsa, o'sha odamga bildirishnoma boradi
- [ ] Xabarni tahrirlash / o'chirish
- [ ] Javob berish (reply) va forward qilish
- [ ] Maxfiy suhbat boshlash (istalgan ro'yxatdan o'tgan odam bilan)
- [ ] Maxfiy suhbat — taklif qilingan odam avval "ruxsat so'rovi" ko'radi, avtomatik qo'shilmaydi
- [ ] Rad etilsa — 1-1 suhbat avtomatik o'chadi
- [ ] Fayl/rasm yuborish — rasm chatda ko'rinadi, bosilsa katta ekranda ochiladi
- [ ] Suhbatni o'chirish (faqat boshlagan odam)
- [ ] Suhbatdan o'zi chiqib ketish

## 5. Uchrashuvlar

- [ ] Guruh uchrashuvi — kompaniyaning umumiy xonasiga qo'shilish
- [ ] Hamkorlar bilan uchrashuv — bir nechta odamni tanlab, ad-hoc qo'ng'iroq boshlash
- [ ] Qo'ng'iroq davomida yangi odam qo'shish

## 6. Virtual Ofis

- [ ] 3D xonada WASD bilan yurish
- [ ] Birinchi shaxs (FPS) kamerasi — o'zingizni ko'rmaysiz
- [ ] Devorga yaqinlashganda kamera devorga kirib ketmaydi
- [ ] "M" — mikrofonni yoqish/o'chirish, "+/-" — kattalashtirish
- [ ] Boshqa a'zo bir vaqtda xonada bo'lsa — real-vaqtda ko'rinadi (ism yorlig'i bilan)
- [ ] Xonadagilar bir-birini eshitadi (ovozli chat)

## 7. Buxgalteriya

- [ ] Tranzaksiya qo'shish (kirim/chiqim)
- [ ] Hisob-faktura yaratish, holatini o'zgartirish (qoralama/yuborilgan/to'langan/muddati o'tgan)
- [ ] Ish haqi yozuvi qo'shish, "to'landi" deb belgilash
- [ ] Har bir bo'limda "Batafsil" — filter/sort/qidiruv/sahifalash ishlaydi
- [ ] "Ko'rish" — sana oralig'ini tanlab, hisobotni ko'rish
- [ ] "Statistika" — grafik turi va davrni tanlash
- [ ] "Yuklab olish" — CSV va Excel (formulalar bilan) ikkalasi ham ishlaydi

## 8. Vazifalar (Jira)

- [ ] Vazifa yaratish — daraja, muddat, kimga (aniq odam/lavozim/hammaga)
- [ ] O'ziga o'zi vazifa bera olmasligi
- [ ] Kanban — sudrab ko'chirish (Bajarilmagan → Ishda → Tekshiruvda)
- [ ] PM — Qabul qilish/Rad etish tugmalari, bildirishnoma + ball keladi
- [ ] Muddat o'tib ketsa — avtomatik "Bajarilmagan" bo'lib qoladi, bildirishnoma keladi
- [ ] Vazifani tahrirlash (✏️)
- [ ] "Tarix" — filter/sort/sahifalash, Excel'ga yuklab olish
- [ ] "Reyting" — oylik ball bo'yicha saralangan ro'yxat

## 9. Dashboard

- [ ] Statistika kartalari (kompaniya, a'zolar, kanallar, maxfiy suhbatlar) — haqiqiy sonlar
- [ ] "Oyning eng faol ishchisi" kartasi to'g'ri ko'rsatiladi
- [ ] 10 yillik moliyaviy diagramma va o'sish/tushish ko'rsatkichi

## 10. Bildirishnomalar

- [ ] 🔔 belgisi — yangi bildirishnoma **darhol** (WebSocket orqali) ko'rinadi
- [ ] O'qilgan/o'qilmagan ranglar bilan farqlanadi
- [ ] Oxirgi 20 tasi o'chib ketmaydi
- [ ] "Hammasini o'qilgan deb belgilash" ishlaydi

## 11. Umumiy / Interfeys

- [ ] Sidebar siqish/kengaytirish («/» tugmasi)
- [ ] AI Ziyo — ovozli va matnli buyruqlar

---

### Muammo topilsa, shunday formatda yozing:
```
Bo'lim: [masalan "4. Chat"]
Nima qilindi: [qadamlar]
Kutilgan natija: [...]
Haqiqiy natija: [...]
```
