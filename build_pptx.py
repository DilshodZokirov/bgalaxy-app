#!/usr/bin/env python3
"""Python -> Frameworklar -> Django -> DRF (yorqin oq fon)."""

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
CARD = RGBColor(0xF0, 0xF9, 0xFF)
INK = RGBColor(0x0F, 0x17, 0x2A)
MUTED = RGBColor(0x33, 0x41, 0x55)
CYAN = RGBColor(0x02, 0x84, 0xC7)
AMBER = RGBColor(0xEA, 0x58, 0x00)
CORAL = RGBColor(0xE1, 0x1D, 0x48)
GREEN = RGBColor(0x05, 0x96, 0x69)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LINE = RGBColor(0x7D, 0xD3, 0xFC)
NAVY = RGBColor(0x0C, 0x4A, 0x6E)


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
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.18), H)
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
        p.space_after = Pt(kwargs.get("space_after", 6))
        run = p.add_run()
        run.text = text
        set_run(run, size=kwargs.get("size", 20), bold=kwargs.get("bold", False), color=kwargs.get("color", INK))
    return box


def card(slide, left, top, width, height, title, body, accent=CYAN):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shp.fill.solid()
    shp.fill.fore_color.rgb = CARD
    shp.line.color.rgb = accent
    shp.line.width = Pt(2.25)
    strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(0.14), height)
    strip.fill.solid()
    strip.fill.fore_color.rgb = accent
    strip.line.fill.background()
    textbox(
        slide,
        left + Inches(0.32),
        top + Inches(0.22),
        width - Inches(0.45),
        height - Inches(0.35),
        [
            (title, {"size": 18, "bold": True, "color": NAVY, "space_after": 8}),
            (body, {"size": 14, "color": MUTED, "space_after": 0}),
        ],
    )


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


def new_slide(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide)
    accent_bar(slide)
    return slide


def grid_cards(slide, items, colors, y0=1.5, h=2.45):
    for i, (t, b) in enumerate(items):
        col, row = i % 3, i // 3
        card(
            slide,
            Inches(0.55) + Inches(col * 4.2),
            Inches(y0) + Inches(row * (h + 0.25)),
            Inches(4.0),
            Inches(h),
            t,
            b,
            colors[i % len(colors)],
        )


def build(out: Path) -> None:
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    colors6 = (CYAN, AMBER, GREEN, CORAL, CYAN, AMBER)

    # 1
    s = new_slide(prs)
    pill(s, Inches(0.7), Inches(1.7), Inches(3.2), Inches(0.4), "PYTHON  →  DJANGO  →  REST")
    textbox(s, Inches(0.7), Inches(2.35), Inches(11.5), Inches(3.5), [
        ("Python dan Django gacha", {"size": 38, "bold": True, "color": NAVY, "space_after": 12}),
        ("Nima qila oladi? Sintaksis? Frameworklar?\nNega Django? Django REST nima uchun?", {"size": 22, "color": MUTED, "space_after": 16}),
        ("Aniq yo‘l: avval Python, keyin eng mashhur veb framework — Django.", {"size": 18, "bold": True, "color": AMBER}),
    ])

    # 2 Python can do
    s = new_slide(prs)
    textbox(s, Inches(0.7), Inches(0.3), Inches(12), Inches(1.0), [
        ("1. PYTHON NIMA QILA OLADI?", {"size": 14, "bold": True, "color": CYAN, "space_after": 4}),
        ("Bitta til — ko‘p kasb va loyiha", {"size": 28, "bold": True, "color": NAVY}),
    ])
    grid_cards(s, [
        ("Veb-saytlar", "Blog, do‘kon, ijtimoiy tarmoq, kabinet, admin"),
        ("Sun’iy intellekt", "Chatbot, rasm/tovush, tavsiya tizimlari"),
        ("Ma’lumotlar", "Hisobot, statistika, katta jadvallar"),
        ("Avtomatlashtirish", "Bot, fayl, takroriy ishlarni dastur bajarsin"),
        ("O‘yinlar", "O‘quv o‘yinlari va oddiy 2D loyihalar"),
        ("Ilm-fan", "Hisob-kitob, tadqiqot, laboratoriya"),
    ], colors6)

    # 3 Syntax traits
    s = new_slide(prs)
    textbox(s, Inches(0.7), Inches(0.3), Inches(12), Inches(1.0), [
        ("2. SINTAKSIS — BOSHQA TILLARDAN AJRALIB TURADI", {"size": 14, "bold": True, "color": AMBER, "space_after": 4}),
        ("Pythonni oson va “toza” qiladigan xislatlar", {"size": 26, "bold": True, "color": NAVY}),
    ])
    grid_cards(s, [
        ("O‘qilishi oson", "Kod oddiy gapga o‘xshaydi. Keraksiz belgilar kam."),
        ("Indentatsiya", "Bo‘sh joy bilan blok — tartib majburiy va foydali."),
        ("Qisqa yozuv", "Ko‘p ish 1–3 qatorda chiqadi."),
        ("Dinamik tip", "Har doim int/str yozib o‘tirmaysiz — tezroq start."),
        ("Kuchli stdlib", "Ko‘p asbob “ichida” — darhol ishlatasiz."),
        ("Bitta uslub", "Soddalik madaniyati — jamoa bir xil o‘qiydi."),
    ], colors6)

    # 4 Code sample
    s = new_slide(prs)
    textbox(s, Inches(0.7), Inches(0.3), Inches(12), Inches(1.0), [
        ("MISOL", {"size": 14, "bold": True, "color": CYAN, "space_after": 4}),
        ("Qisqa sintaksis — tez tushunarli natija", {"size": 28, "bold": True, "color": NAVY}),
    ])
    card(s, Inches(0.7), Inches(1.55), Inches(6.0), Inches(5.1),
         "Python kodi",
         'ism = "Ali"\nprint(f"Salom, {ism}!")\n\nsonlar = [1, 2, 3, 4, 5]\njuft = [x for x in sonlar if x % 2 == 0]\nprint(juft)   # [2, 4]',
         CYAN)
    card(s, Inches(6.95), Inches(1.55), Inches(5.7), Inches(5.1),
         "Nima ajratib turadi?",
         "• Kam “shovqin” — { } ; kamroq\n• f-string — matnni oson yig‘ish\n• comprehension — filter bir qatorda\n• O‘qib tushunish tez\n\nShu bois maktab, kurs va startaplar Pythonni tanlaydi.",
         AMBER)

    # 5 Famous libs/frameworks
    s = new_slide(prs)
    textbox(s, Inches(0.7), Inches(0.25), Inches(12), Inches(1.0), [
        ("3. ENG MASHHUR FRAMEWORK VA KUTUBXONALAR", {"size": 14, "bold": True, "color": CYAN, "space_after": 4}),
        ("Python ekotizimi", {"size": 28, "bold": True, "color": NAVY}),
    ])
    items = [
        ("Django", "To‘liq veb platforma", AMBER),
        ("Flask", "Yengil veb", CYAN),
        ("FastAPI", "Zamonaviy API", GREEN),
        ("Pandas", "Ma’lumotlar jadvali", CORAL),
        ("NumPy", "Tez hisob", CYAN),
        ("PyTorch", "Deep Learning", AMBER),
        ("TensorFlow", "AI / ML", GREEN),
        ("Requests", "HTTP so‘rovlar", CORAL),
        ("Selenium", "Brauzer avtomat", CYAN),
    ]
    for i, (t, b, c) in enumerate(items):
        col, row = i % 3, i // 3
        card(
            s,
            Inches(0.55) + Inches(col * 4.2),
            Inches(1.35) + Inches(row * 1.9),
            Inches(4.0),
            Inches(1.75),
            t,
            b,
            c,
        )

    # 6 Pick Django
    s = new_slide(prs)
    textbox(s, Inches(0.7), Inches(0.3), Inches(12), Inches(1.1), [
        ("4. VEB UCHUN ENG MASHHURI — DJANGO", {"size": 14, "bold": True, "color": AMBER, "space_after": 4}),
        ("Frameworklar ichidan asosiy yo‘l: Django", {"size": 28, "bold": True, "color": NAVY}),
    ])
    card(s, Inches(0.7), Inches(1.7), Inches(4.0), Inches(4.8),
         "Flask",
         "Kichik va erkin.\nKichik sayt/API.\nKo‘p narsani o‘zingiz yig‘asiz.",
         CYAN)
    card(s, Inches(4.95), Inches(1.7), Inches(4.0), Inches(4.8),
         "FastAPI",
         "API uchun zamonaviy.\nTez + avto-hujjat.\nAsosan backend API.",
         GREEN)
    card(s, Inches(9.2), Inches(1.7), Inches(3.4), Inches(4.8),
         "Django ★",
         "To‘liq paket.\nLogin, baza, admin, xavfsizlik — ichida.\n\nKatta saytlar shu yerda boshlanadi.",
         AMBER)

    # 7 Big Django work
    s = new_slide(prs)
    textbox(s, Inches(0.7), Inches(0.3), Inches(12), Inches(1.0), [
        ("5. DJANGO DA QILINGAN KATTA ISHLAR", {"size": 14, "bold": True, "color": CYAN, "space_after": 4}),
        ("Haqiqiy dunyo misollari", {"size": 28, "bold": True, "color": NAVY}),
    ])
    grid_cards(s, [
        ("Instagram", "Yirik ijtimoiy tarmoq — Django asosida"),
        ("Pinterest", "Katta kontent platforma"),
        ("Mozilla", "Mahsulot va ichki tizimlar"),
        ("Disqus", "Millionlab saytlarda izoh tizimi"),
        ("Bitbucket", "Kod hosting / jamoa ishi"),
        ("NASA / ilm", "Ichki veb va ma’lumot tizimlari"),
    ], colors6)

    # 8 Interest in Django
    s = new_slide(prs)
    textbox(s, Inches(0.7), Inches(0.3), Inches(12), Inches(1.0), [
        ("6. NEGA DJANGO GA QIZIQISH KERAK?", {"size": 14, "bold": True, "color": AMBER, "space_after": 4}),
        ("Saytni “nol dan” yig‘ish qiyin — Django yengillashtiradi", {"size": 24, "bold": True, "color": NAVY}),
    ])
    reasons = [
        ("Tez start", "Birinchi sahifa va admin tez chiqadi"),
        ("Xavfsizlik", "Ko‘p hujumlarga tayyor himoya bor"),
        ("Ish bozori", "Django bilgan dasturchiga talab yuqori"),
        ("Katta gacha o‘sadi", "Kichik blogdan yirik loyihagacha yo‘l ochiq"),
    ]
    for i, (t, b) in enumerate(reasons):
        card(
            s,
            Inches(0.7) + Inches((i % 2) * 6.2),
            Inches(1.7) + Inches((i // 2) * 2.5),
            Inches(5.9),
            Inches(2.25),
            t,
            b,
            (CYAN, AMBER, GREEN, CORAL)[i],
        )

    # 9 What Django does (Q&A)
    s = new_slide(prs)
    textbox(s, Inches(0.7), Inches(0.25), Inches(12), Inches(1.0), [
        ("7. DJANGO O‘ZI NIMA VAZIFA BAJARADI?", {"size": 14, "bold": True, "color": CYAN, "space_after": 4}),
        ("Savol → Django javobi", {"size": 28, "bold": True, "color": NAVY}),
    ])
    grid_cards(s, [
        ("Sahifa kerakmi?", "URL + View + Template"),
        ("Ma’lumot saqlash?", "Model + baza (ORM)"),
        ("Login / parol?", "Auth tizimi tayyor"),
        ("Admin panel?", "Tez yoqiladi va sozlanadi"),
        ("Forma / tekshiruv?", "Form + validation"),
        ("Xavfsizlik?", "CSRF, XSS va boshqa himoyalar"),
    ], colors6, y0=1.4, h=2.55)

    # 10 What YOU do
    s = new_slide(prs)
    textbox(s, Inches(0.7), Inches(0.3), Inches(12), Inches(1.0), [
        ("8. SIZ NIMA QILASIZ?", {"size": 14, "bold": True, "color": GREEN, "space_after": 4}),
        ("Django — asbob. Siz — muallif.", {"size": 28, "bold": True, "color": NAVY}),
    ])
    step_data = [
        ("1", "Loyiha yaratasiz", "startproject"),
        ("2", "Modellarni yozasiz", "User, Product…"),
        ("3", "Sahifa / mantiq", "View + Template"),
        ("4", "Admin sozlamalari", "Ma’lumot boshqaruvi"),
        ("5", "Ishga tushurasiz", "Lokal → server"),
    ]
    for i, (n, t, b) in enumerate(step_data):
        x = Inches(0.45) + Inches(i * 2.55)
        box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(1.8), Inches(2.4), Inches(4.4))
        box.fill.solid()
        box.fill.fore_color.rgb = CARD
        box.line.color.rgb = LINE
        box.line.width = Pt(2)
        oval = s.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.75), Inches(2.15), Inches(0.9), Inches(0.9))
        oval.fill.solid()
        oval.fill.fore_color.rgb = (CYAN, AMBER, GREEN, CORAL, CYAN)[i]
        oval.line.fill.background()
        textbox(s, x + Inches(0.75), Inches(2.3), Inches(0.9), Inches(0.6), [
            (n, {"size": 22, "bold": True, "color": WHITE, "align": PP_ALIGN.CENTER, "space_after": 0})
        ], align=PP_ALIGN.CENTER)
        textbox(s, x + Inches(0.15), Inches(3.3), Inches(2.1), Inches(2.5), [
            (t, {"size": 16, "bold": True, "color": NAVY, "space_after": 10}),
            (b, {"size": 13, "color": MUTED}),
        ])

    # 11 Django limits -> REST
    s = new_slide(prs)
    textbox(s, Inches(0.7), Inches(0.3), Inches(12), Inches(1.1), [
        ("9. DJANGO HAMMASINI O‘ZI QILMAYDI", {"size": 14, "bold": True, "color": CORAL, "space_after": 4}),
        ("Mobil / SPA / boshqa dasturlar uchun REST kerak", {"size": 24, "bold": True, "color": NAVY}),
    ])
    card(s, Inches(0.7), Inches(1.7), Inches(5.9), Inches(4.8),
         "Oddiy Django kuchli",
         "HTML sahifa, forma, admin — a’lo.\n\nLekin telefon ilovasi yoki React sayt alohida ma’lumot kanali so‘raydi.",
         CYAN)
    card(s, Inches(6.9), Inches(1.7), Inches(5.7), Inches(4.8),
         "Yechim: REST API",
         "Django ma’lumotni JSON qilib beradi.\n\nMobil va frontend shu JSON ni oladi.\n\nBuning uchun — Django REST Framework.",
         AMBER)

    # 12 DRF
    s = new_slide(prs)
    textbox(s, Inches(0.7), Inches(0.3), Inches(12), Inches(1.0), [
        ("10. DJANGO REST FRAMEWORK (DRF)", {"size": 14, "bold": True, "color": GREEN, "space_after": 4}),
        ("Django yetkazmaydigan joylarni REST orqali yopamiz", {"size": 24, "bold": True, "color": NAVY}),
    ])
    card(s, Inches(0.7), Inches(1.5), Inches(4.0), Inches(5.0),
         "Nima?",
         "Django ustiga qo‘yiladigan API vositasi.\n\nOddiy sahifa emas — ma’lumot xizmati.",
         GREEN)
    card(s, Inches(4.95), Inches(1.5), Inches(4.0), Inches(5.0),
         "Nima beradi?",
         "• JSON API\n• Token / login\n• Serializer\n• Avto hujjatlar\n• Mobil + web — bitta backend",
         CYAN)
    card(s, Inches(9.2), Inches(1.5), Inches(3.4), Inches(5.0),
         "Qachon?",
         "React/Vue, mobil ilova yoki boshqa servis Django bilan gaplashishi kerak bo‘lsa.",
         AMBER)

    # 13 Path
    s = new_slide(prs)
    textbox(s, Inches(0.7), Inches(0.3), Inches(12), Inches(1.0), [
        ("YO‘L XARITA", {"size": 14, "bold": True, "color": CYAN, "space_after": 4}),
        ("Bugungi gap — bitta chiziqda", {"size": 28, "bold": True, "color": NAVY}),
    ])
    path = [
        ("Python", "Nima qiladi +\nsintaksis"),
        ("Ekotizim", "Framework va\nkutubxonalar"),
        ("Django", "Eng mashhur\nveb tanlov"),
        ("Amaliyot", "Model, view,\nadmin"),
        ("DRF", "REST API\nmobil/frontend"),
    ]
    for i, (t, b) in enumerate(path):
        x = Inches(0.45) + Inches(i * 2.55)
        box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, Inches(2.0), Inches(2.4), Inches(3.8))
        box.fill.solid()
        box.fill.fore_color.rgb = CARD
        c = (CYAN, AMBER, GREEN, CORAL, CYAN)[i]
        box.line.color.rgb = c
        box.line.width = Pt(2.5)
        textbox(s, x + Inches(0.15), Inches(2.4), Inches(2.1), Inches(3.2), [
            (f"0{i+1}", {"size": 14, "bold": True, "color": c, "space_after": 10}),
            (t, {"size": 20, "bold": True, "color": NAVY, "space_after": 12}),
            (b, {"size": 14, "color": MUTED}),
        ])

    # 14 Close
    s = new_slide(prs)
    textbox(s, Inches(0.7), Inches(1.9), Inches(12), Inches(4), [
        ("XULOSA", {"size": 14, "bold": True, "color": CYAN, "space_after": 12}),
        ("Python — imkoniyat.\nDjango — veb uchun eng mashhur yo‘l.\nDRF — qolganini REST bilan bog‘lash.", {"size": 28, "bold": True, "color": NAVY, "space_after": 18}),
        ("Keyingi qadam: Python asoslari → kichik loyiha → Django → kerak bo‘lsa DRF.", {"size": 18, "bold": True, "color": AMBER}),
    ])

    out.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(out))
    print(f"Saved: {out} ({len(prs.slides)} slides)")


if __name__ == "__main__":
    out_dir = Path(__file__).resolve().parent
    build(out_dir / "Python-Django-Yorqin.pptx")
    shutil.copyfile(out_dir / "Python-Django-Yorqin.pptx", out_dir / "Python-Django-Vaaav.pptx")
