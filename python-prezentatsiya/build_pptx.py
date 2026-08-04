#!/usr/bin/env python3
"""
PBL taqdimot (v6):
- Python boyitilgan: nima?, xususiyatlar, boshqa tillar bilan solishtirma
- Keyin muammo→Django, muammo→DRF
- Oxirgi xulosa/zanjir/keyingi qadam slaydlari yo‘q
- Kod: ochiq fon + qora matn
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
CARD = RGBColor(0xF1, 0xF5, 0xF9)
INK = RGBColor(0x0B, 0x12, 0x20)
MUTED = RGBColor(0x33, 0x41, 0x55)
CYAN = RGBColor(0x02, 0x84, 0xC7)
AMBER = RGBColor(0xC2, 0x41, 0x0C)
CORAL = RGBColor(0xBE, 0x12, 0x3C)
GREEN = RGBColor(0x04, 0x78, 0x57)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LINE = RGBColor(0x94, 0xA3, 0xB8)
NAVY = RGBColor(0x0F, 0x17, 0x2A)
CODE_BG = RGBColor(0xF8, 0xFA, 0xFC)
CODE_FG = RGBColor(0x0B, 0x12, 0x20)
CODE_COMMENT = RGBColor(0x04, 0x78, 0x57)
PROBLEM_BG = RGBColor(0xFE, 0xF2, 0xF2)
SOLUTION_BG = RGBColor(0xEC, 0xFD, 0xF5)


def set_run(run, size=20, bold=False, color=INK, font="Calibri"):
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    rPr = run._r.get_or_add_rPr()
    solid = rPr.find(qn("a:solidFill"))
    if solid is not None:
        rPr.remove(solid)
    solid = rPr.makeelement(qn("a:solidFill"), {})
    srgb = solid.makeelement(qn("a:srgbClr"), {"val": str(color)})
    solid.append(srgb)
    rPr.insert(0, solid)
    for tag in ("latin", "ea", "cs"):
        el = rPr.find(qn(f"a:{tag}"))
        if el is None:
            el = rPr.makeelement(qn(f"a:{tag}"), {})
            rPr.append(el)
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


def panel(slide, left, top, width, height, fill, border=LINE):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    shp.line.color.rgb = border
    shp.line.width = Pt(1.5)
    return shp


def card(slide, left, top, width, height, title, body, accent=CYAN, fill=CARD):
    panel(slide, left, top, width, height, fill, accent)
    strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(0.12), height)
    strip.fill.solid()
    strip.fill.fore_color.rgb = accent
    strip.line.fill.background()
    textbox(
        slide,
        left + Inches(0.28),
        top + Inches(0.18),
        width - Inches(0.42),
        height - Inches(0.3),
        [
            (title, {"size": 16, "bold": True, "color": NAVY, "space_after": 8}),
            (body, {"size": 13, "color": MUTED, "space_after": 0}),
        ],
    )


def code_box(slide, left, top, width, height, title, lines, accent=CYAN):
    panel(slide, left, top, width, height, CODE_BG, accent)
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
        [(title, {"size": 14, "bold": True, "color": WHITE, "space_after": 0})],
    )
    paras = []
    for line in lines:
        is_comment = line.strip().startswith("#")
        paras.append((
            line if line else " ",
            {
                "size": 14,
                "bold": False,
                "color": CODE_COMMENT if is_comment else CODE_FG,
                "space_after": 2,
                "font": "Consolas",
            },
        ))
    textbox(slide, left + Inches(0.25), top + Inches(0.55), width - Inches(0.4), height - Inches(0.7), paras)


def pill(slide, left, top, width, height, text, bg=CYAN):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shp.fill.solid()
    shp.fill.fore_color.rgb = bg
    shp.line.fill.background()
    textbox(
        slide,
        left, top, width, height,
        [(text, {"size": 12, "bold": True, "color": WHITE, "align": PP_ALIGN.CENTER, "space_after": 0})],
        align=PP_ALIGN.CENTER,
        anchor=MSO_ANCHOR.MIDDLE,
    )


def heading(slide, eyebrow, title):
    textbox(slide, Inches(0.65), Inches(0.28), Inches(12), Inches(1.05), [
        (eyebrow, {"size": 13, "bold": True, "color": CYAN, "space_after": 4}),
        (title, {"size": 24, "bold": True, "color": NAVY, "space_after": 0}),
    ])


def new_slide(prs, bar=CYAN):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide)
    accent_bar(slide, bar)
    return slide


def build(out: Path) -> None:
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H

    # ---- 1. Title ----
    s = new_slide(prs)
    banner = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.55), Inches(0.35), Inches(12.2), Inches(0.5))
    banner.fill.solid()
    banner.fill.fore_color.rgb = CORAL
    banner.line.fill.background()
    textbox(
        s, Inches(0.55), Inches(0.38), Inches(12.2), Inches(0.42),
        [("PBL v6 · Python chuqurroq · muammo → yechim", {
            "size": 14, "bold": True, "color": WHITE, "align": PP_ALIGN.CENTER, "space_after": 0,
        })],
        align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE,
    )
    pill(s, Inches(0.7), Inches(1.15), Inches(3.4), Inches(0.38), "PROBLEM-BASED LEARNING")
    textbox(s, Inches(0.7), Inches(1.75), Inches(11.8), Inches(4.8), [
        ("Python → Django → Django REST", {"size": 34, "bold": True, "color": NAVY, "space_after": 14}),
        ("Bugungi yo‘l:\n1) Python nima? Xususiyatlari va boshqa tillarga nisbatan yutuqlari\n2) Muammo: veb kerak → Django\n3) Muammo: telefon + desktop + sayt parallel → DRF", {
            "size": 18, "color": MUTED, "space_after": 16,
        }),
        ("Qoida: avval MUAMMO, keyin YECHIM. Ma’lumot oson, lekin teran.", {
            "size": 17, "bold": True, "color": AMBER,
        }),
    ])

    # ---- 2. What is Python? ----
    s = new_slide(prs)
    heading(s, "PYTHON · SAVOL", "Python nima?")
    panel(s, Inches(0.55), Inches(1.3), Inches(12.2), Inches(1.55), CARD, CYAN)
    textbox(s, Inches(0.85), Inches(1.5), Inches(11.6), Inches(1.25), [
        ("Python — umumiy maqsadli (general-purpose), yuqori darajali dasturlash tili.\nKod avval yoziladi, keyin interpreter orqali bajariladi. Maqsad: inson uchun o‘qilishi oson bo‘lgan dastur yozish.", {
            "size": 16, "color": NAVY, "space_after": 0,
        }),
    ])
    facts = [
        ("Yuqori darajali", "Past darajadagi xotira / mashina buyruqlari bilan emas — mantiq va masala bilan ishlaysiz."),
        ("Interpretatsiya", "Ko‘pincha alohida “compile → exe” majburiy emas. .py faylni interpreter ishga tushiradi."),
        ("Ko‘p paradigmalı", "Procedural, OOP, funksional uslub — bir tilda birga ishlatiladi."),
        ("Open source", "Erkin, katta jamiyat. Windows / macOS / Linux da bir xil fikrlash bilan ishlaydi."),
    ]
    for i, (t, b) in enumerate(facts):
        card(
            s,
            Inches(0.55) + Inches((i % 2) * 6.3),
            Inches(3.15) + Inches((i // 2) * 1.95),
            Inches(6.05),
            Inches(1.8),
            t, b, (CYAN, AMBER, GREEN, CORAL)[i],
        )

    # ---- 3. Core characteristics (dense) ----
    s = new_slide(prs)
    heading(s, "PYTHON · XUSUSIYATLAR", "Ichida nima bor — qisqa, lekin teran")
    items = [
        ("Sintaksis", "Indentatsiya majburiy. Bloklar {} emas — bo‘sh joy. Bu stilni bir xil qiladi va o‘qishni osonlashtiradi."),
        ("Dinamik tip", "O‘zgaruvchiga tipni majburan yozmaysiz. Tip qiymatga qarab aniqlanadi. Katta loyihada type hint ixtiyoriy."),
        ("Batteries included", "Standart kutubxona boy: fayl, JSON, HTTP, vaqt, regex… Ko‘p vazifa uchun tashqi paket shart emas."),
        ("Kuchli ekotizim", "PyPI orqali minglab paket: Django, FastAPI, Pandas, NumPy, PyTorch…"),
        ("Tez ishlab chiqish", "Kam “rasmiyatchilik” → prototip tez chiqadi. Startup va o‘quv loyihalarida shu uchun sevimli."),
        ("Portativlik", "Bir xil kod turli OS da ishlashi oson. Virtual environment orqali muhit izolyatsiya qilinadi."),
    ]
    for i, (t, b) in enumerate(items):
        col, row = i % 3, i // 3
        card(
            s,
            Inches(0.5) + Inches(col * 4.2),
            Inches(1.35) + Inches(row * 2.85),
            Inches(4.05),
            Inches(2.7),
            t, b, (CYAN, AMBER, GREEN, CORAL, CYAN, AMBER)[i],
        )

    # ---- 4. Comparison advantages ----
    s = new_slide(prs)
    heading(s, "PYTHON · SOLISHTIRMA", "Boshqa tillarga nisbatan yutuqli tomonlari")
    textbox(s, Inches(0.7), Inches(1.25), Inches(12), Inches(0.4), [
        ("Bu “boshqa tillar yomon” degani emas — Python qayerda yutadi, shu yerda aniq aytamiz.", {
            "size": 14, "color": MUTED, "space_after": 0,
        }),
    ])
    comps = [
        ("vs Java / C#", "Kamroq “boilerplate”. Tip va klass e’lonlari kamroq. O‘rganish egri chizig‘i yumshoqroq. Veb/AI prototipida tezroq."),
        ("vs C / C++", "Xotirani qo‘lda boshqarmaysiz. Pointer / segfault kam uchraydi. Buning evaziga sof tezlik pastroq bo‘lishi mumkin — lekin ko‘p vazifa uchun yetarli."),
        ("vs JavaScript", "JS asosan brauzer + Node. Python esa AI, data, avtomatlashtirish, veb backend da kengroq “standart” tanlov."),
        ("vs Go / Rust", "Go/Rust tizim/servis tezligi uchun kuchli. Python esa o‘qiluvchanlik + ekotizim + tez ishlab chiqishda yutadi."),
    ]
    for i, (t, b) in enumerate(comps):
        card(
            s,
            Inches(0.55) + Inches((i % 2) * 6.3),
            Inches(1.8) + Inches((i // 2) * 2.55),
            Inches(6.05),
            Inches(2.4),
            t, b, (CYAN, AMBER, GREEN, CORAL)[i],
        )

    # ---- 5. Code comparison Java vs Python ----
    s = new_slide(prs)
    heading(s, "PYTHON · AMALIY SOLISHTIRMA", "Bir xil vazifa: juft sonlarni olish")
    textbox(s, Inches(0.7), Inches(1.25), Inches(12), Inches(0.35), [
        ("Yutuq shu yerda ko‘rinadi: kam qator, aniq ma’no, o‘qish oson.", {"size": 15, "color": MUTED}),
    ])
    code_box(
        s, Inches(0.5), Inches(1.75), Inches(6.05), Inches(5.1),
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
        s, Inches(6.8), Inches(1.75), Inches(5.95), Inches(5.1),
        "Python (qisqa + aniq)",
        [
            "nums = [1, 2, 3, 4, 5]",
            "evens = [n for n in nums if n % 2 == 0]",
            "print(evens)  # [2, 4]",
            "",
            "# Xulosa:",
            "# bir xil natija",
            "# kamroq kod",
            "# o‘qish osonroq",
        ],
        CYAN,
    )

    # ---- 6. Typing comparison ----
    s = new_slide(prs)
    heading(s, "PYTHON · TIP TIZIMI", "Nima farqi? Tipni kim aniqlaydi?")
    card(
        s, Inches(0.5), Inches(1.35), Inches(6.05), Inches(2.15),
        "Ko‘p tillarda",
        "O‘zgaruvchi ochilganda tip yoziladi: int, String, boolean…\nKompilyator/IDE tipni oldindan tekshiradi. Aniqlik yuqori, lekin yozish uzunroq.",
        AMBER,
    )
    card(
        s, Inches(6.8), Inches(1.35), Inches(5.95), Inches(2.15),
        "Python da",
        "Tip majburiy yozilmaydi — qiymatga qarab aniqlanadi.\nTez yozish. Katta loyihada type hint (masalan, yosh: int) qo‘shish mumkin.",
        CYAN,
    )
    code_box(
        s, Inches(0.5), Inches(3.7), Inches(6.05), Inches(3.2),
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
        s, Inches(6.8), Inches(3.7), Inches(5.95), Inches(3.2),
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

    # ---- 7. Practical building blocks ----
    s = new_slide(prs)
    heading(s, "PYTHON · AMALIY ASOSLAR", "List, dict, funksiya — kundalik vositalar")
    code_box(
        s, Inches(0.5), Inches(1.35), Inches(6.05), Inches(5.5),
        "Ma’lumot tuzilmalari",
        [
            "talaba = {",
            "  \"ism\": \"Ali\",",
            "  \"ball\": 95,",
            "}",
            "print(talaba[\"ism\"])",
            "",
            "fanlar = [\"Python\", \"Django\"]",
            "fanlar.append(\"REST\")",
            "# dict = kalit→qiymat",
            "# list = tartibli ro‘yxat",
        ],
        CYAN,
    )
    code_box(
        s, Inches(6.8), Inches(1.35), Inches(5.95), Inches(5.5),
        "Funksiya",
        [
            "def yigindi(a, b):",
            "    return a + b",
            "",
            "print(yigindi(2, 3))  # 5",
            "",
            "def salom(ism=\"mehmon\"):",
            "    return f\"Salom, {ism}\"",
            "",
            "# Funksiya = takrorlanadigan",
            "# mantiqni bitta joyga yig‘ish",
        ],
        GREEN,
    )

    # ---- 8. Where Python is used ----
    s = new_slide(prs)
    heading(s, "PYTHON · QAYERDA ISHLATILADI?", "Bitta til — bir necha yo‘nalish")
    domains = [
        ("Veb backend", "Django, Flask, FastAPI.\nSayt va API yoziladi."),
        ("Ma’lumot / Data", "Pandas, NumPy.\nExcel dan kuchli tahlil."),
        ("AI / ML", "PyTorch, TensorFlow, scikit-learn.\nModel o‘qitish va bashorat."),
        ("Avtomatlashtirish", "Fayl, Excel, email, scraping.\nKundalik ishlarni skript qilish."),
        ("Ilmiy hisob", "SciPy, Matplotlib.\nGrafik, matematik modellar."),
        ("Scripting / DevOps", "Server skriptlari, CI yordamchi vositalar, API bilan bog‘lanish."),
    ]
    for i, (t, b) in enumerate(domains):
        col, row = i % 3, i // 3
        card(
            s,
            Inches(0.5) + Inches(col * 4.2),
            Inches(1.35) + Inches(row * 2.85),
            Inches(4.05),
            Inches(2.7),
            t, b, (CYAN, AMBER, GREEN, CORAL, CYAN, AMBER)[i],
        )

    # ---- 9. PROBLEM: web ----
    s = new_slide(prs, CORAL)
    heading(s, "MUAMMO 1", "Python o‘zi — lekin veb kerak")
    panel(s, Inches(0.55), Inches(1.35), Inches(12.2), Inches(5.5), PROBLEM_BG, CORAL)
    textbox(s, Inches(0.9), Inches(1.65), Inches(11.5), Inches(5.0), [
        ("MUAMMO", {"size": 15, "bold": True, "color": CORAL, "space_after": 10}),
        ("Python da skript yozishni o‘rgandik. Lekin real mahsulot ko‘pincha brauzerda:\nsayt, kabinet, admin panel, forma, foydalanuvchi ro‘yxati…", {
            "size": 20, "bold": True, "color": NAVY, "space_after": 16,
        }),
        ("Savol: faqat print() va oddiy fayllar bilan to‘liq veb-tizim bo‘ladimi?\nURL marshrutlash, baza, login, xavfsizlik, HTML — bularni noldan yig‘ish og‘ir.", {
            "size": 17, "color": MUTED, "space_after": 16,
        }),
        ("Shuning uchun boshlang‘ich web uchun framework tanlaymiz.", {
            "size": 18, "bold": True, "color": AMBER,
        }),
    ])

    # ---- 10. SOLUTION: Django ----
    s = new_slide(prs, GREEN)
    heading(s, "YECHIM 1 · DJANGO", "Boshlang‘ich web uchun asosiy tavsiya")
    panel(s, Inches(0.55), Inches(1.3), Inches(12.2), Inches(1.35), SOLUTION_BG, GREEN)
    textbox(s, Inches(0.85), Inches(1.5), Inches(11.6), Inches(1.05), [
        ("Django — Python dagi to‘liq (full-stack) veb framework.\n“Batteries included”: auth, admin, ORM, template, xavfsizlik — tayyor karkas.", {
            "size": 16, "bold": True, "color": NAVY, "space_after": 0,
        }),
    ])
    reasons = [
        ("Nima uchun Django?", "Boshlang‘ich uchun yo‘l aniq: Project/App, URL, View, Model, Template. Ko‘p narsa ichida."),
        ("Nima beradi?", "Login/ro‘yxat, admin panel, baza bilan ORM orqali ishlash, HTML sahifalar, CSRF himoya."),
        ("Qanday o‘rganamiz?", "Avval so‘rov qanday yurishini tushunamiz. Keyin kichik sayt. Keyin API bosqichi."),
    ]
    for i, (t, b) in enumerate(reasons):
        card(s, Inches(0.5) + Inches(i * 4.2), Inches(2.95), Inches(4.05), Inches(3.8), t, b, (GREEN, CYAN, AMBER)[i], SOLUTION_BG)

    # ---- 11. Django request flow ----
    s = new_slide(prs)
    heading(s, "DJANGO · QANDAY ISHLAYDI?", "Bitta so‘rovning ketma-ketligi")
    steps = [
        ("1. Request", "Brauzer manzil ochadi\nyoki forma yuboradi"),
        ("2. URL", "Django to‘g‘ri yo‘lni\ntopadi (urls.py)"),
        ("3. View", "Mantiq ishlaydi:\ntekshiruv, hisob"),
        ("4. Model", "Kerak bo‘lsa bazadan\no‘qiydi / yozadi"),
        ("5. Template", "HTML sahifa yasaydi\n(klassik usul)"),
        ("6. Response", "Javob brauzerga\nqaytadi"),
    ]
    for i, (t, b) in enumerate(steps):
        col, row = i % 3, i // 3
        card(
            s,
            Inches(0.5) + Inches(col * 4.2),
            Inches(1.35) + Inches(row * 2.85),
            Inches(4.05),
            Inches(2.7),
            t, b, (CYAN, AMBER, GREEN, CORAL, CYAN, AMBER)[i],
        )

    # ---- 12. MTV ----
    s = new_slide(prs)
    heading(s, "DJANGO · MTV", "Uchta rol — eslab qolish oson")
    card(s, Inches(0.5), Inches(1.4), Inches(4.05), Inches(5.3),
         "Model",
         "Ma’lumot modeli.\n\nMasalan: User, Product, Post.\n\nORM orqali SQL kamroq yoziladi — Python klasslari bilan baza boshqariladi.",
         CYAN)
    card(s, Inches(4.7), Inches(1.4), Inches(4.05), Inches(5.3),
         "Template",
         "Ko‘rinish (HTML).\n\nFoydalanuvchi brauzerda shuni ko‘radi.\n\nView dan kelgan ma’lumot sahifaga joylanadi.",
         AMBER)
    card(s, Inches(8.9), Inches(1.4), Inches(3.9), Inches(5.3),
         "View",
         "Mantiq markazi.\n\nSo‘rov keldi → qaror:\nqaysi model? qaysi template?\n\nJavobni tayyorlaydi.",
         GREEN)

    # ---- 13. PROBLEM 2: multi-platform ----
    s = new_slide(prs, CORAL)
    heading(s, "MUAMMO 2", "Faqat sayt yetarli emas — real hayot")
    panel(s, Inches(0.55), Inches(1.3), Inches(12.2), Inches(5.55), PROBLEM_BG, CORAL)
    textbox(s, Inches(0.9), Inches(1.55), Inches(11.5), Inches(5.1), [
        ("MUAMMO", {"size": 15, "bold": True, "color": CORAL, "space_after": 10}),
        ("Biz yozgan kod faqat kompyuter brauzerida emas.\nTelefon ilova + desktop dastur + veb — parallel ishlashi kerak.", {
            "size": 20, "bold": True, "color": NAVY, "space_after": 14,
        }),
        ("Klassik Django ko‘pincha HTML qaytaradi.\nMobil/desktop ilova esa HTML emas — ma’lumot (odatda JSON) so‘raydi.", {
            "size": 17, "color": MUTED, "space_after": 14,
        }),
        ("Xulosa-muammo: faqat Template bilan bitta backendni\nuchala platformaga to‘g‘ri ulash qiyin. Kuchliroq tushuncha kerak: API.", {
            "size": 17, "bold": True, "color": AMBER,
        }),
    ])

    # ---- 14. See clients ----
    s = new_slide(prs, CORAL)
    heading(s, "MUAMMO 2 · KO‘RINISH", "Uchta mijoz — bitta ma’lumot")
    for i, (t, b) in enumerate([
        ("Telefon", "Mobil ilova.\nHTML emas — API kerak."),
        ("Desktop", "Kompyuter dasturi.\nHam ma’lumot so‘raydi."),
        ("Veb", "Brauzer / SPA.\nHTML yoki API."),
    ]):
        card(s, Inches(0.5) + Inches(i * 4.2), Inches(1.4), Inches(4.05), Inches(2.5), t, b, CORAL, PROBLEM_BG)
    panel(s, Inches(0.55), Inches(4.2), Inches(12.2), Inches(2.55), CARD, AMBER)
    textbox(s, Inches(0.9), Inches(4.45), Inches(11.5), Inches(2.15), [
        ("Savol: mahsulot/foydalanuvchi ma’lumotini uchalasiga qanday beramiz?", {
            "size": 18, "bold": True, "color": NAVY, "space_after": 10,
        }),
        ("Agar faqat HTML bersak — telefon va desktop “tushunmaydi”.\nYechim sifatida Django REST Framework (DRF) tavsiya qilinadi.", {
            "size": 16, "color": MUTED,
        }),
    ])

    # ---- 15. SOLUTION: DRF (final substantive slide) ----
    s = new_slide(prs, GREEN)
    heading(s, "YECHIM 2 · DJANGO REST FRAMEWORK", "Bir backend — ko‘p platforma")
    panel(s, Inches(0.55), Inches(1.3), Inches(12.2), Inches(1.4), SOLUTION_BG, GREEN)
    textbox(s, Inches(0.85), Inches(1.5), Inches(11.6), Inches(1.1), [
        ("DRF — Django ustida API qatlami. Ma’lumotni JSON qilib beradi.\nTelefon, desktop, veb — parallel ulanadi. Django o‘rnini bosmaydi — uni kengaytiradi.", {
            "size": 16, "bold": True, "color": NAVY, "space_after": 0,
        }),
    ])
    card(s, Inches(0.5), Inches(2.95), Inches(4.05), Inches(3.8),
         "Nima qiladi?",
         "HTML o‘rniga JSON.\nMasalan: /api/products/\n\nSerializer, ViewSet, Router, auth — API uchun asosiy vositalar.",
         GREEN, SOLUTION_BG)
    card(s, Inches(4.7), Inches(2.95), Inches(4.05), Inches(3.8),
         "Nima uchun kerak?",
         "Bir marta yozilgan biznes-mantiq\nbarcha mijozlarga xizmat qiladi.\n\nReal hayotdagi “parallel ishlash” shu yerda yechiladi.",
         CYAN, SOLUTION_BG)
    card(s, Inches(8.9), Inches(2.95), Inches(3.9), Inches(3.8),
         "O‘rganish tartibi",
         "1) Python asoslari\n2) Django (sayt)\n3) DRF (API)\n\nAvval muammo, keyin yechim — shu tartibda.",
         AMBER, SOLUTION_BG)

    out.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(out))
    print(f"Saved: {out} ({len(prs.slides)} slides)")


if __name__ == "__main__":
    out_dir = Path(__file__).resolve().parent
    primary = out_dir / "Python-Django-PBL-v6.pptx"
    build(primary)
    shutil.copyfile(primary, out_dir / "Python-Django-PBL-v5.pptx")
    shutil.copyfile(primary, out_dir / "Python-Dars-01-YANGI.pptx")
    shutil.copyfile(primary, out_dir / "Python-Django-Yorqin.pptx")
    shutil.copyfile(primary, out_dir / "Python-Django-Vaaav.pptx")
