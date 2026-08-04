#!/usr/bin/env python3
"""
Dars taqdimoti (jiddiy tartib):
1) Kirish
2) Qisqa sintaksis (misol bilan)
3) Tip tizimi: Java vs Python (misol)
4) Kuchli xususiyatlar (har biriga misol)
5) Mashhur framework/kutubxonalar
6) Eng mashhuri — Django
7) Django muhim tushunchalar + qanday ishlaydi
8) Template kamchiligi → Django REST
9) Xulosa
"""

from __future__ import annotations

import shutil
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt

W, H = Inches(13.333), Inches(7.5)

BG = RGBColor(0xFF, 0xFF, 0xFF)
CARD = RGBColor(0xF8, 0xFA, 0xFC)
INK = RGBColor(0x0F, 0x17, 0x2A)
MUTED = RGBColor(0x33, 0x41, 0x55)
CYAN = RGBColor(0x02, 0x84, 0xC7)
AMBER = RGBColor(0xC2, 0x41, 0x0C)
CORAL = RGBColor(0xBE, 0x12, 0x3C)
GREEN = RGBColor(0x04, 0x78, 0x57)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LINE = RGBColor(0xCB, 0xD5, 0xE1)
NAVY = RGBColor(0x0F, 0x17, 0x2A)
CODE_BG = RGBColor(0x0F, 0x17, 0x2A)
CODE_FG = RGBColor(0xE2, 0xE8, 0xF0)
CODE_GREEN = RGBColor(0x86, 0xEF, 0xAC)
CODE_ORANGE = RGBColor(0xFD, 0xBA, 0x74)


def set_run(run, size=20, bold=False, color=INK, font="Calibri"):
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    rPr = run._r.get_or_add_rPr()
    for tag in ("latin", "ea", "cs"):
        el = rPr.find(qn(f"a:{tag}"))
        if el is None:
            el = rPr.makeelement(qn(f"a:{tag}"), {})
            rPr.insert(0, el)
        el.set("typeface", font)


def add_bg(slide):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = BG


def accent_bar(slide, color=CYAN):
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.14), H)
    bar.fill.solid()
    bar.fill.fore_color.rgb = color
    bar.line.fill.background()


def textbox(slide, left, top, width, height, paragraphs, *, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    try:
        tf._txBody.bodyPr.set(
            "anchor",
            {MSO_ANCHOR.TOP: "t", MSO_ANCHOR.MIDDLE: "ctr", MSO_ANCHOR.BOTTOM: "b"}[anchor],
        )
    except Exception:
        pass
    first = True
    for item in paragraphs:
        text, kwargs = (item, {}) if isinstance(item, str) else (item[0], item[1])
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = kwargs.get("align", align)
        p.space_after = Pt(kwargs.get("space_after", 4))
        run = p.add_run()
        run.text = text
        set_run(
            run,
            size=kwargs.get("size", 18),
            bold=kwargs.get("bold", False),
            color=kwargs.get("color", INK),
            font=kwargs.get("font", "Calibri"),
        )
    return box


def card(slide, left, top, width, height, title, body, accent=CYAN):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shp.fill.solid()
    shp.fill.fore_color.rgb = CARD
    shp.line.color.rgb = accent
    shp.line.width = Pt(1.75)
    strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(0.12), height)
    strip.fill.solid()
    strip.fill.fore_color.rgb = accent
    strip.line.fill.background()
    textbox(
        slide,
        left + Inches(0.3),
        top + Inches(0.2),
        width - Inches(0.42),
        height - Inches(0.3),
        [
            (title, {"size": 17, "bold": True, "color": NAVY, "space_after": 8}),
            (body, {"size": 13, "color": MUTED, "space_after": 0}),
        ],
    )


def code_box(slide, left, top, width, height, title, lines, accent=CYAN):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shp.fill.solid()
    shp.fill.fore_color.rgb = CODE_BG
    shp.line.fill.background()
    strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, Inches(0.42))
    strip.fill.solid()
    strip.fill.fore_color.rgb = accent
    strip.line.fill.background()
    textbox(
        slide,
        left + Inches(0.2),
        top + Inches(0.05),
        width - Inches(0.3),
        Inches(0.35),
        [(title, {"size": 13, "bold": True, "color": WHITE, "space_after": 0})],
    )
    paras = []
    for i, line in enumerate(lines):
        paras.append((line, {
            "size": 13,
            "bold": False,
            "color": CODE_GREEN if line.strip().startswith("#") else CODE_FG,
            "space_after": 2,
            "font": "Consolas",
        }))
    textbox(slide, left + Inches(0.25), top + Inches(0.55), width - Inches(0.4), height - Inches(0.7), paras)


def pill(slide, left, top, width, height, text, bg=CYAN):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shp.fill.solid()
    shp.fill.fore_color.rgb = bg
    shp.line.fill.background()
    textbox(
        slide,
        left,
        top,
        width,
        height,
        [(text, {"size": 12, "bold": True, "color": WHITE, "align": PP_ALIGN.CENTER, "space_after": 0})],
        align=PP_ALIGN.CENTER,
        anchor=MSO_ANCHOR.MIDDLE,
    )


def heading(slide, eyebrow, title):
    textbox(slide, Inches(0.65), Inches(0.28), Inches(12), Inches(1.05), [
        (eyebrow, {"size": 13, "bold": True, "color": CYAN, "space_after": 4}),
        (title, {"size": 26, "bold": True, "color": NAVY, "space_after": 0}),
    ])


def new_slide(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide)
    accent_bar(slide)
    return slide


def build(out: Path) -> None:
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H

    # ---- 1. Serious intro ----
    s = new_slide(prs)
    # Aniq versiya belgisi — eski fayl bilan chalkashmaslik uchun
    banner = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.55), Inches(0.35), Inches(12.2), Inches(0.55))
    banner.fill.solid()
    banner.fill.fore_color.rgb = CORAL
    banner.line.fill.background()
    textbox(
        s,
        Inches(0.55),
        Inches(0.4),
        Inches(12.2),
        Inches(0.45),
        [(
            "YANGI VERSIYA · 2026-08-04 · 2-slaydda Java vs Python kod bo‘lsa — to‘g‘ri fayl",
            {"size": 14, "bold": True, "color": WHITE, "align": PP_ALIGN.CENTER, "space_after": 0},
        )],
        align=PP_ALIGN.CENTER,
        anchor=MSO_ANCHOR.MIDDLE,
    )
    pill(s, Inches(0.7), Inches(1.55), Inches(2.2), Inches(0.38), "DARS 01")
    textbox(s, Inches(0.7), Inches(2.15), Inches(11.5), Inches(3.8), [
        ("Python asoslari va Django yo‘nalishi", {"size": 34, "bold": True, "color": NAVY, "space_after": 14}),
        ("Mavzu tartibi:\n1) Pythonning sintaksisi va tip tizimi\n2) Mashhur framework / kutubxonalar\n3) Django — tushunchalar va ishlash tartibi\n4) Django REST Framework", {"size": 18, "color": MUTED, "space_after": 16}),
        ("Maqsad: umumiy tushuncha + amaliy misol orqali o‘tish.", {"size": 16, "bold": True, "color": AMBER}),
    ])

    # ---- 2. Short syntax claim + EXAMPLE ----
    s = new_slide(prs)
    heading(s, "1-MAVZU · SINTAKSIS", "Boshqa tillarda 5–10 qator — Python da ko‘pincha 1–3 qator")
    textbox(s, Inches(0.7), Inches(1.35), Inches(12), Inches(0.45), [
        ("Pastda bir xil vazifa: ro‘yxatdan juft sonlarni olish.", {"size": 15, "color": MUTED, "space_after": 0}),
    ])
    code_box(
        s, Inches(0.55), Inches(1.95), Inches(6.0), Inches(4.8),
        "Java (uzunroq)",
        [
            "List<Integer> nums = Arrays.asList(1,2,3,4,5);",
            "List<Integer> evens = new ArrayList<>();",
            "for (Integer n : nums) {",
            "    if (n % 2 == 0) {",
            "        evens.add(n);",
            "    }",
            "}",
            "System.out.println(evens);",
        ],
        AMBER,
    )
    code_box(
        s, Inches(6.85), Inches(1.95), Inches(5.9), Inches(4.8),
        "Python (qisqa)",
        [
            "nums = [1, 2, 3, 4, 5]",
            "evens = [n for n in nums if n % 2 == 0]",
            "print(evens)  # [2, 4]",
            "",
            "# Xulosa:",
            "# bir xil natija — kamroq kod,",
            "# o‘qish osonroq.",
        ],
        CYAN,
    )

    # ---- 3. Typing: Java vs Python + example ----
    s = new_slide(prs)
    heading(s, "2-MAVZU · TIP TIZIMI", "Python da tip avtomatik; Java da odatda aniq yoziladi")
    card(
        s, Inches(0.55), Inches(1.45), Inches(6.0), Inches(2.0),
        "Umumiy tushuncha",
        "Ko‘p tillarda o‘zgaruvchi ochilganda tip ham yoziladi (int, String…).\nPython da tip majburiy yozilmaydi — qiymatga qarab aniqlanadi.",
        CYAN,
    )
    card(
        s, Inches(6.85), Inches(1.45), Inches(5.9), Inches(2.0),
        "Nima beradi?",
        "Tezroq yozish, kamroq “rasmiyatchilik”.\nLekin katta loyihada type hint (ixtiyoriy) tavsiya etiladi.",
        AMBER,
    )
    code_box(
        s, Inches(0.55), Inches(3.7), Inches(6.0), Inches(3.2),
        "Java",
        [
            "int yosh = 18;",
            "String ism = \"Ali\";",
            "double narx = 12.5;",
            "boolean aktiv = true;",
        ],
        AMBER,
    )
    code_box(
        s, Inches(6.85), Inches(3.7), Inches(5.9), Inches(3.2),
        "Python",
        [
            "yosh = 18",
            "ism = \"Ali\"",
            "narx = 12.5",
            "aktiv = True",
            "# tipni Python o‘zi biladi",
        ],
        CYAN,
    )

    # ---- 4. Strong features with examples ----
    s = new_slide(prs)
    heading(s, "3-MAVZU · KUCHLI XUSUSIYATLAR", "Har bir xususiyat — pastida qisqa misol")
    # 4 feature cards in 2x2 with embedded mini examples as text
    feats = [
        ("O‘qilishi oson", "Kod oddiy gapga yaqin.\n\nMisol:\nprint(\"Salom\")"),
        ("Indentatsiya majburiy", "Bloklar bo‘sh joy bilan.\n\nMisol:\nif yosh >= 18:\n    print(\"Katta\")"),
        ("f-string", "Matnga qiymat qo‘shish oson.\n\nMisol:\nprint(f\"Salom, {ism}\")"),
        ("Keng ekotizim", "Veb, AI, data — bitta til.\n\nMisol yo‘nalishlar:\nDjango, Pandas, PyTorch"),
    ]
    for i, (t, b) in enumerate(feats):
        card(
            s,
            Inches(0.55) + Inches((i % 2) * 6.3),
            Inches(1.4) + Inches((i // 2) * 2.8),
            Inches(6.05),
            Inches(2.55),
            t,
            b,
            (CYAN, AMBER, GREEN, CORAL)[i],
        )

    # ---- 5. More features with code examples side by side ----
    s = new_slide(prs)
    heading(s, "3-MAVZU DAVOMI", "Yana 2 ta amaliy xususiyat — misol bilan")
    code_box(
        s, Inches(0.55), Inches(1.45), Inches(6.0), Inches(5.3),
        "1) List / dict — qulay ma’lumot tuzilmasi",
        [
            "talaba = {",
            "  \"ism\": \"Ali\",",
            "  \"ball\": 95,",
            "}",
            "print(talaba[\"ism\"])",
            "",
            "fanlar = [\"Python\", \"Django\"]",
            "fanlar.append(\"REST\")",
        ],
        CYAN,
    )
    code_box(
        s, Inches(6.85), Inches(1.45), Inches(5.9), Inches(5.3),
        "2) Funksiya — qisqa va aniq",
        [
            "def yigindi(a, b):",
            "    return a + b",
            "",
            "print(yigindi(2, 3))  # 5",
            "",
            "# Default qiymat:",
            "def salom(ism=\"mehmon\"):",
            "    return f\"Salom, {ism}\"",
        ],
        GREEN,
    )

    # ---- 6. Famous frameworks ----
    s = new_slide(prs)
    heading(s, "4-MAVZU · EKOTIZIM", "Pythonning mashhur framework va kutubxonalari")
    items = [
        ("Django", "To‘liq veb framework", AMBER),
        ("Flask", "Yengil veb framework", CYAN),
        ("FastAPI", "Zamonaviy API framework", GREEN),
        ("Pandas", "Ma’lumotlar tahlili", CORAL),
        ("NumPy", "Ilmiy / tez hisob", CYAN),
        ("PyTorch", "Deep Learning", AMBER),
        ("TensorFlow", "Machine Learning", GREEN),
        ("Requests", "HTTP so‘rovlar", CORAL),
        ("SQLAlchemy", "ORM / baza", CYAN),
    ]
    for i, (t, b, c) in enumerate(items):
        col, row = i % 3, i // 3
        card(
            s,
            Inches(0.55) + Inches(col * 4.2),
            Inches(1.4) + Inches(row * 1.85),
            Inches(4.0),
            Inches(1.7),
            t,
            b,
            c,
        )

    # ---- 7. Transition to Django ----
    s = new_slide(prs)
    heading(s, "5-MAVZU · TANLOV", "Veb yo‘nalishida eng mashhuri — Django")
    card(s, Inches(0.55), Inches(1.5), Inches(4.0), Inches(5.1),
         "Flask",
         "Kichik loyiha / API.\nMinimal.\nKo‘p qismni o‘zingiz ulaysiz.",
         CYAN)
    card(s, Inches(4.75), Inches(1.5), Inches(4.0), Inches(5.1),
         "FastAPI",
         "API uchun zamonaviy.\nTezlik + hujjatlar.\nAsosan backend API.",
         GREEN)
    card(s, Inches(8.95), Inches(1.5), Inches(3.8), Inches(5.1),
         "Django (asosiy e’tibor)",
         "To‘liq veb platforma.\nAuth, admin, ORM, xavfsizlik — ichida.\n\nShu darsda Django ga o‘tamiz.",
         AMBER)

    # ---- 8. Django key concepts BEFORE deep dive ----
    s = new_slide(prs)
    heading(s, "6-MAVZU · DJANGO OLDIDAN", "Django ga tegishli muhim tushunchalar")
    concepts = [
        ("Project / App", "Project — butun loyiha.\nApp — ichidagi modul (masalan, blog, shop)."),
        ("URL", "Qaysi manzil qaysi funksiyaga boradi."),
        ("View", "So‘rovni qabul qiladi, javob tayyorlaydi."),
        ("Model", "Ma’lumot strukturasi (bazadagi jadval)."),
        ("Template", "HTML ko‘rinish (foydalanuvchi ko‘radigan sahifa)."),
        ("ORM", "Python orqali baza bilan ishlash (SQL kamroq)."),
    ]
    for i, (t, b) in enumerate(concepts):
        col, row = i % 3, i // 3
        card(
            s,
            Inches(0.55) + Inches(col * 4.2),
            Inches(1.4) + Inches(row * 2.75),
            Inches(4.0),
            Inches(2.55),
            t,
            b,
            (CYAN, AMBER, GREEN, CORAL, CYAN, AMBER)[i],
        )

    # ---- 9. How Django works ----
    s = new_slide(prs)
    heading(s, "7-MAVZU · DJANGO QANDAY ISHLAYDI?", "Bitta so‘rovning ketma-ketligi")
    steps = [
        ("1. Request", "Brauzer / ilova\nso‘rov yuboradi"),
        ("2. URL", "Django to‘g‘ri\nyo‘lni topadi"),
        ("3. View", "Mantiq ishlaydi\n(Python)"),
        ("4. Model", "Kerak bo‘lsa\nbazadan oladi"),
        ("5. Template", "HTML yasaydi\n(klassik usul)"),
        ("6. Response", "Javob qaytadi\nfoydalanuvchiga"),
    ]
    for i, (t, b) in enumerate(steps):
        col, row = i % 3, i // 3
        card(
            s,
            Inches(0.55) + Inches(col * 4.2),
            Inches(1.45) + Inches(row * 2.7),
            Inches(4.0),
            Inches(2.5),
            t,
            b,
            (CYAN, AMBER, GREEN, CORAL, CYAN, AMBER)[i],
        )

    # ---- 10. MTV reminder ----
    s = new_slide(prs)
    heading(s, "7-MAVZU DAVOMI", "MTV modeli — Django ning asosiy sxemasi")
    card(s, Inches(0.55), Inches(1.55), Inches(4.0), Inches(5.0),
         "Model",
         "Ma’lumot.\n\nMasalan:\nUser, Product, Post\n\nBaza bilan bog‘lanadi.",
         CYAN)
    card(s, Inches(4.75), Inches(1.55), Inches(4.0), Inches(5.0),
         "Template",
         "Ko‘rinish.\n\nHTML sahifa.\nFoydalanuvchi shuni ko‘radi.",
         AMBER)
    card(s, Inches(8.95), Inches(1.55), Inches(3.8), Inches(5.0),
         "View",
         "Mantiq.\n\nSo‘rov keldi →\nqanday javob?\nModel/Template chaqiriladi.",
         GREEN)

    # ---- 11. Template limitation → DRF ----
    s = new_slide(prs)
    heading(s, "8-MAVZU · CHEGARA VA YECHIM", "Django Template kamchiligi → Django REST")
    card(
        s, Inches(0.55), Inches(1.45), Inches(6.0), Inches(5.2),
        "Template bilan ishlash — qachon kamchilik?",
        "Klassik Django ko‘pincha HTML qaytaradi.\n\nLekin:\n• Mobil ilova HTML emas, JSON xohlaydi\n• React / Vue alohida frontend\n• Boshqa dasturlar bilan bog‘lanish kerak\n\nYa’ni: faqat template yetarli bo‘lmaydi.",
        AMBER,
    )
    card(
        s, Inches(6.85), Inches(1.45), Inches(5.9), Inches(5.2),
        "Shuning uchun Django REST chiqdi",
        "Django REST Framework (DRF):\n\n• JSON API beradi\n• Mobil / SPA ulanadi\n• Serializer, auth, hujjatlar\n\nXulosa: Django — asos.\nDRF — Django ni API qilib kengaytiradi.",
        GREEN,
    )

    # ---- 12. DRF one clear slide ----
    s = new_slide(prs)
    heading(s, "9-MAVZU · DJANGO REST FRAMEWORK", "Django qila olmaydigan (yoki qiyin) ishlarni REST orqali")
    card(s, Inches(0.55), Inches(1.45), Inches(4.0), Inches(5.2),
         "Vazifa",
         "Ma’lumotni HTML emas,\nJSON ko‘rinishida berish.\n\nMasalan:\n/api/products/",
         CYAN)
    card(s, Inches(4.75), Inches(1.45), Inches(4.0), Inches(5.2),
         "Asosiy qismlar",
         "• Serializer\n• ViewSet / APIView\n• Router\n• Token / JWT auth\n• Permission",
         AMBER)
    card(s, Inches(8.95), Inches(1.45), Inches(3.8), Inches(5.2),
         "Qachon o‘rganamiz?",
         "Avval Django asoslari.\n\nKeyin frontend yoki mobil kerak bo‘lsa — DRF.",
         GREEN)

    # ---- 13. Conclusion ----
    s = new_slide(prs)
    heading(s, "XULOSA", "Bugungi darsdan olib ketiladigan asoslar")
    points = [
        ("1", "Python", "Qisqa sintaksis + tipni o‘zi aniqlashi — tez o‘rganishga yordam beradi."),
        ("2", "Ekotizim", "Django, Flask, FastAPI, Pandas, PyTorch — yo‘nalishga qarab tanlanadi."),
        ("3", "Django", "Vebda eng mashhur to‘liq framework: URL → View → Model/Template."),
        ("4", "DRF", "Template yetmaganda REST API orqali mobil/SPA ulanadi."),
    ]
    for i, (n, t, b) in enumerate(points):
        y = Inches(1.4) + Inches(i * 1.35)
        oval = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.7), y + Inches(0.15), Inches(0.7), Inches(0.7))
        oval.fill.solid()
        oval.fill.fore_color.rgb = (CYAN, AMBER, GREEN, CORAL)[i]
        oval.line.fill.background()
        textbox(s, Inches(0.7), y + Inches(0.28), Inches(0.7), Inches(0.45), [
            (n, {"size": 18, "bold": True, "color": WHITE, "align": PP_ALIGN.CENTER, "space_after": 0})
        ], align=PP_ALIGN.CENTER)
        box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.7), y, Inches(10.9), Inches(1.15))
        box.fill.solid()
        box.fill.fore_color.rgb = CARD
        box.line.color.rgb = LINE
        textbox(s, Inches(2.0), y + Inches(0.2), Inches(10.3), Inches(0.85), [
            (t, {"size": 18, "bold": True, "color": NAVY, "space_after": 4}),
            (b, {"size": 14, "color": MUTED, "space_after": 0}),
        ])

    # ---- 14. Next lesson ----
    s = new_slide(prs)
    textbox(s, Inches(0.7), Inches(2.0), Inches(11.5), Inches(3.5), [
        ("KEYINGI QADAM", {"size": 14, "bold": True, "color": CYAN, "space_after": 10}),
        ("Python asoslarini mustahkamlash →\nkichik loyiha → Django amaliyoti →\nkerak bo‘lsa Django REST.", {"size": 28, "bold": True, "color": NAVY, "space_after": 18}),
        ("Savollar bo‘lsa — shu yerda yozib qo‘yamiz.", {"size": 18, "color": MUTED}),
    ])

    out.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(out))
    print(f"Saved: {out} ({len(prs.slides)} slides)")


if __name__ == "__main__":
    out_dir = Path(__file__).resolve().parent
    # Asosiy yangi nom — eski Yorqin/Vaaav cache bilan chalkashmaslik uchun
    primary = out_dir / "Python-Dars-01-YANGI.pptx"
    build(primary)
    shutil.copyfile(primary, out_dir / "Python-Django-Yorqin.pptx")
    shutil.copyfile(primary, out_dir / "Python-Django-Vaaav.pptx")
