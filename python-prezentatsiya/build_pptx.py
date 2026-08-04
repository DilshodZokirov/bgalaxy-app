#!/usr/bin/env python3
"""
Problem-Based Learning taqdimoti:
1) Python ga qiziqtirish
2) Muammo: veb kerak → yechim: Django
3) Muammo: sayt yetarli emas (telefon/desktop) → yechim: DRF
Kod bloklari: OCHIQ fon + QORA matn (kontrast).
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
# Ochiq kod paneli — qorong‘i fon muammosini oldini oladi
CODE_BG = RGBColor(0xF8, 0xFA, 0xFC)
CODE_FG = RGBColor(0x0B, 0x12, 0x20)
CODE_COMMENT = RGBColor(0x04, 0x78, 0x57)
PROBLEM_BG = RGBColor(0xFE, 0xF2, 0xF2)
SOLUTION_BG = RGBColor(0xEC, 0xFD, 0xF5)


def set_run(run, size=20, bold=False, color=INK, font="Calibri"):
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    # Explicit srgbClr — ba’zi ko‘ruvchilarda theme color “yutib” yuboradi
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
    shp = panel(slide, left, top, width, height, fill, accent)
    strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(0.12), height)
    strip.fill.solid()
    strip.fill.fore_color.rgb = accent
    strip.line.fill.background()
    textbox(
        slide,
        left + Inches(0.3),
        top + Inches(0.22),
        width - Inches(0.45),
        height - Inches(0.35),
        [
            (title, {"size": 18, "bold": True, "color": NAVY, "space_after": 10}),
            (body, {"size": 14, "color": MUTED, "space_after": 0}),
        ],
    )
    return shp


def code_box(slide, left, top, width, height, title, lines, accent=CYAN):
    """Ochiq fon + qora matn — har doim o‘qiladi."""
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
                "size": 15,
                "bold": False,
                "color": CODE_COMMENT if is_comment else CODE_FG,
                "space_after": 3,
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


def new_slide(prs, bar=CYAN):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide)
    accent_bar(slide, bar)
    return slide


def build(out: Path) -> None:
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H

    # ---- 1. Hook title ----
    s = new_slide(prs)
    banner = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.55), Inches(0.35), Inches(12.2), Inches(0.5))
    banner.fill.solid()
    banner.fill.fore_color.rgb = CORAL
    banner.line.fill.background()
    textbox(
        s, Inches(0.55), Inches(0.38), Inches(12.2), Inches(0.42),
        [("PBL v5 · OCHIQ KOD · muammo → yechim tartibi", {
            "size": 14, "bold": True, "color": WHITE, "align": PP_ALIGN.CENTER, "space_after": 0,
        })],
        align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE,
    )
    pill(s, Inches(0.7), Inches(1.2), Inches(3.4), Inches(0.4), "PROBLEM-BASED LEARNING")
    textbox(s, Inches(0.7), Inches(1.9), Inches(11.8), Inches(4.5), [
        ("Python → Django → Django REST", {"size": 36, "bold": True, "color": NAVY, "space_after": 16}),
        ("Bugungi yo‘l:\n1) Avval Python ga qiziqamiz\n2) Muammo: veb kerak → Django\n3) Yangi muammo: telefon + desktop + sayt birgalikda → DRF", {
            "size": 20, "color": MUTED, "space_after": 18,
        }),
        ("Qoida: avval MUAMMO, keyin YECHIM.", {"size": 18, "bold": True, "color": AMBER}),
    ])

    # ---- 2. Interest hook ----
    s = new_slide(prs)
    heading(s, "1-QADAM · QIZIQTIRISH", "Nima uchun aynan Python?")
    hooks = [
        ("Oddiy til", "Kod o‘qish gap o‘qishga o‘xshaydi. Boshlang‘ich uchun eng yumshoq kirish."),
        ("Tez natija", "Bir necha qator bilan hisob, bot, fayl, sayt — ko‘rinadigan natija chiqadi."),
        ("Keng imkoniyat", "Veb, ma’lumot, AI, avtomatlashtirish — bitta til, ko‘p yo‘nalish."),
        ("Ish / loyiha", "Dunyo bo‘ylab eng ko‘p o‘qitiladigan tillardan. Keyingi bosqichga tayyorlaydi."),
    ]
    for i, (t, b) in enumerate(hooks):
        card(
            s,
            Inches(0.55) + Inches((i % 2) * 6.3),
            Inches(1.4) + Inches((i // 2) * 2.75),
            Inches(6.05),
            Inches(2.55),
            t, b,
            (CYAN, AMBER, GREEN, CORAL)[i],
        )

    # ---- 3. Tiny visible example ----
    s = new_slide(prs)
    heading(s, "1-QADAM DAVOMI", "Python “qiyin emas” — qisqa misol")
    textbox(s, Inches(0.7), Inches(1.35), Inches(12), Inches(0.45), [
        ("Kod paneli ochiq fon + qora matn — proyektorda ham o‘qiladi.", {"size": 15, "color": MUTED}),
    ])
    code_box(
        s, Inches(0.55), Inches(1.95), Inches(6.0), Inches(4.8),
        "Birinchi dastur",
        [
            "ism = \"Dilshod\"",
            "yosh = 18",
            "print(f\"Salom, {ism}!\")",
            "",
            "if yosh >= 18:",
            "    print(\"Katta\")",
            "else:",
            "    print(\"Yosh\")",
        ],
        CYAN,
    )
    code_box(
        s, Inches(6.85), Inches(1.95), Inches(5.9), Inches(4.8),
        "Nima ko‘ramiz?",
        [
            "# Natija:",
            "# Salom, Dilshod!",
            "# Katta",
            "",
            "# Xulosa:",
            "# kam kod → aniq ma’no",
            "# shuning uchun o‘rganish",
            "# qiziqarli boshlanadi",
        ],
        GREEN,
    )

    # ---- 4. PROBLEM: need a website ----
    s = new_slide(prs, CORAL)
    heading(s, "2-QADAM · MUAMMO", "Endi real ehtiyoj chiqadi: veb")
    panel(s, Inches(0.55), Inches(1.4), Inches(12.2), Inches(5.4), PROBLEM_BG, CORAL)
    textbox(s, Inches(0.9), Inches(1.7), Inches(11.5), Inches(4.8), [
        ("MUAMMO", {"size": 16, "bold": True, "color": CORAL, "space_after": 12}),
        ("Oddiy Python skripti kompyuterda ishlaydi.\nLekin bugungi hayotda ko‘pchilik narsa brauzerda: sayt, kabinet, admin, forma…", {
            "size": 22, "bold": True, "color": NAVY, "space_after": 18,
        }),
        ("Savol auditoriyaga:\n«O‘z loyihamizni internetda ochmoqchimiz.\nFaqat print() bilan sayt bo‘ladimi?»", {
            "size": 20, "color": MUTED, "space_after": 16,
        }),
        ("Javob: yo‘q. Bizga veb framework kerak.", {"size": 20, "bold": True, "color": AMBER}),
    ])

    # ---- 5. SOLUTION: Django ----
    s = new_slide(prs, GREEN)
    heading(s, "2-QADAM · YECHIM", "Boshlang‘ich veb uchun tavsiya — Django")
    panel(s, Inches(0.55), Inches(1.35), Inches(12.2), Inches(1.2), SOLUTION_BG, GREEN)
    textbox(s, Inches(0.85), Inches(1.55), Inches(11.6), Inches(0.9), [
        ("YECHIM: Django — Python dagi to‘liq veb framework. Boshlang‘ich web yo‘nalishida asosiy tanlov.", {
            "size": 18, "bold": True, "color": NAVY, "space_after": 0,
        }),
    ])
    reasons = [
        ("Nima beradi?", "URL, View, Model, Template, Admin, Auth, xavfsizlik — tayyor “karkas”."),
        ("Nima uchun boshlang‘ich?", "Ko‘p kerakli narsa ichida. Noldan yig‘ish shart emas."),
        ("Nima o‘rganamiz?", "Sayt qanday ishlaydi: so‘rov keladi → mantiq → javob ketadi."),
    ]
    for i, (t, b) in enumerate(reasons):
        card(s, Inches(0.55) + Inches(i * 4.2), Inches(2.9), Inches(4.0), Inches(3.8), t, b, (GREEN, CYAN, AMBER)[i], SOLUTION_BG)

    # ---- 6. Django how it works ----
    s = new_slide(prs)
    heading(s, "DJANGO NI TUSHUNISH", "Bitta so‘rov qanday yuradi?")
    steps = [
        ("1. Brauzer", "Foydalanuvchi manzil ochadi"),
        ("2. URL", "Django qaysi funksiya?\nTopadi"),
        ("3. View", "Mantiq ishlaydi\n(Python)"),
        ("4. Model", "Kerak bo‘lsa\nbazadan oladi"),
        ("5. Template", "HTML sahifa\nyasaladi"),
        ("6. Javob", "Sayt ko‘rinadi\nbrauzerda"),
    ]
    for i, (t, b) in enumerate(steps):
        col, row = i % 3, i // 3
        card(
            s,
            Inches(0.55) + Inches(col * 4.2),
            Inches(1.4) + Inches(row * 2.75),
            Inches(4.0),
            Inches(2.55),
            t, b,
            (CYAN, AMBER, GREEN, CORAL, CYAN, AMBER)[i],
        )

    # ---- 7. MTV short ----
    s = new_slide(prs)
    heading(s, "DJANGO ASOSI", "MTV — uchta rol")
    card(s, Inches(0.55), Inches(1.5), Inches(4.0), Inches(5.1),
         "Model", "Ma’lumot.\nUser, Product, Post…\nBaza bilan bog‘lanadi.", CYAN)
    card(s, Inches(4.75), Inches(1.5), Inches(4.0), Inches(5.1),
         "Template", "Ko‘rinish.\nHTML sahifa.\nFoydalanuvchi shuni ko‘radi.", AMBER)
    card(s, Inches(8.95), Inches(1.5), Inches(3.8), Inches(5.1),
         "View", "Mantiq.\nSo‘rov → qaror →\nModel/Template chaqiradi.", GREEN)

    # ---- 8. BIG PROBLEM: multi-platform ----
    s = new_slide(prs, CORAL)
    heading(s, "3-QADAM · YANGI MUAMMO", "Real hayotda faqat sayt yetarli emas")
    panel(s, Inches(0.55), Inches(1.35), Inches(12.2), Inches(5.5), PROBLEM_BG, CORAL)
    textbox(s, Inches(0.9), Inches(1.65), Inches(11.5), Inches(5.0), [
        ("MUAMMO", {"size": 16, "bold": True, "color": CORAL, "space_after": 10}),
        ("Biz yozgan kod bugun faqat kompyuter brauzerida emas.\nTelefon ilova + desktop dastur + veb — parallel ishlashi kerak.", {
            "size": 22, "bold": True, "color": NAVY, "space_after": 16,
        }),
        ("Klassik Django asosan sayt uchun: HTML qaytaradi.\nMobil ilova esa HTML emas — ma’lumot (JSON) so‘raydi.", {
            "size": 18, "color": MUTED, "space_after": 16,
        }),
        ("Xulosa-muammo: faqat Django Template bilan\ntelefon/desktop/web bir xil backendga ulanish qiyin.", {
            "size": 18, "bold": True, "color": AMBER,
        }),
    ])

    # ---- 9. Show the gap visually ----
    s = new_slide(prs, CORAL)
    heading(s, "3-QADAM · MUAMMONI KO‘RISH", "Uchta mijoz — bitta ma’lumot kerak")
    clients = [
        ("Telefon", "Mobil ilova\nHTML emas"),
        ("Desktop", "Kompyuter dasturi\nHTML emas"),
        ("Veb", "Brauzer\nHTML yoki SPA"),
    ]
    for i, (t, b) in enumerate(clients):
        card(s, Inches(0.55) + Inches(i * 4.2), Inches(1.45), Inches(4.0), Inches(2.4), t, b, CORAL, PROBLEM_BG)
    panel(s, Inches(0.55), Inches(4.15), Inches(12.2), Inches(2.6), CARD, AMBER)
    textbox(s, Inches(0.9), Inches(4.4), Inches(11.5), Inches(2.2), [
        ("Savol: uchalasiga ham bir xil mahsulot/foydalanuvchi ma’lumotini qanday beramiz?", {
            "size": 20, "bold": True, "color": NAVY, "space_after": 12,
        }),
        ("Agar faqat HTML Template bersak — telefon va desktop “tushunmaydi”.\nBizga kuchliroq tushuncha: API kerak.", {
            "size": 17, "color": MUTED,
        }),
    ])

    # ---- 10. SOLUTION: DRF ----
    s = new_slide(prs, GREEN)
    heading(s, "3-QADAM · YECHIM", "Tavsiya — Django REST Framework (DRF)")
    panel(s, Inches(0.55), Inches(1.35), Inches(12.2), Inches(1.3), SOLUTION_BG, GREEN)
    textbox(s, Inches(0.85), Inches(1.55), Inches(11.6), Inches(1.0), [
        ("YECHIM: DRF — Django ustida API. Ma’lumotni JSON qilib beradi. Telefon, desktop, veb — bitta backend.", {
            "size": 18, "bold": True, "color": NAVY, "space_after": 0,
        }),
    ])
    card(s, Inches(0.55), Inches(2.95), Inches(4.0), Inches(3.7),
         "Nima qiladi?", "HTML o‘rniga JSON.\n/api/products/\nko‘rinishida ma’lumot.", GREEN, SOLUTION_BG)
    card(s, Inches(4.75), Inches(2.95), Inches(4.0), Inches(3.7),
         "Nima uchun kerak?", "Bir marta yozilgan mantiq\nmobil + desktop + webga\nbirga xizmat qiladi.", CYAN, SOLUTION_BG)
    card(s, Inches(8.95), Inches(2.95), Inches(3.8), Inches(3.7),
         "Qachon?", "Avval Django asoslari.\nKeyin DRF — multi-platform\nyechim sifatida.", AMBER, SOLUTION_BG)

    # ---- 11. PBL summary chain ----
    s = new_slide(prs)
    heading(s, "ZANJIR", "Muammo → yechim (bugungi darsning mantiqi)")
    chain = [
        ("Muammo 0", "Dasturlashni\nqayerdan boshlaymiz?", "Python", CYAN),
        ("Muammo 1", "Internetda\nsayt kerak", "Django", AMBER),
        ("Muammo 2", "Telefon + desktop\n+ web parallel", "DRF", GREEN),
    ]
    for i, (eyebrow, problem, solution, color) in enumerate(chain):
        x = Inches(0.55) + Inches(i * 4.2)
        panel(s, x, Inches(1.45), Inches(4.0), Inches(5.2), CARD, color)
        textbox(s, x + Inches(0.25), Inches(1.7), Inches(3.5), Inches(4.7), [
            (eyebrow, {"size": 13, "bold": True, "color": color, "space_after": 10}),
            (problem, {"size": 18, "bold": True, "color": NAVY, "space_after": 18}),
            ("→ YECHIM", {"size": 13, "bold": True, "color": MUTED, "space_after": 8}),
            (solution, {"size": 28, "bold": True, "color": color, "space_after": 0}),
        ])

    # ---- 12. Conclusion ----
    s = new_slide(prs)
    heading(s, "XULOSA", "Nima olib ketamiz?")
    points = [
        ("1", "Python", "Avval qiziqtiramiz: oddiy, tez natija, keng imkoniyat."),
        ("2", "Django", "Boshlang‘ich web uchun asosiy tavsiya — to‘liq framework."),
        ("3", "Muammo", "Faqat sayt yetarli emas: telefon/desktop ham kerak."),
        ("4", "DRF", "Yechim: bitta API orqali barcha platformalar parallel ishlaydi."),
    ]
    for i, (n, t, b) in enumerate(points):
        y = Inches(1.35) + Inches(i * 1.4)
        oval = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.7), y + Inches(0.2), Inches(0.7), Inches(0.7))
        oval.fill.solid()
        oval.fill.fore_color.rgb = (CYAN, AMBER, CORAL, GREEN)[i]
        oval.line.fill.background()
        textbox(s, Inches(0.7), y + Inches(0.32), Inches(0.7), Inches(0.45), [
            (n, {"size": 18, "bold": True, "color": WHITE, "align": PP_ALIGN.CENTER, "space_after": 0})
        ], align=PP_ALIGN.CENTER)
        panel(s, Inches(1.7), y, Inches(10.9), Inches(1.2), CARD, LINE)
        textbox(s, Inches(2.0), y + Inches(0.22), Inches(10.3), Inches(0.9), [
            (t, {"size": 18, "bold": True, "color": NAVY, "space_after": 4}),
            (b, {"size": 15, "color": MUTED, "space_after": 0}),
        ])

    # ---- 13. Next ----
    s = new_slide(prs, GREEN)
    textbox(s, Inches(0.7), Inches(1.8), Inches(11.8), Inches(4.2), [
        ("KEYINGI QADAM", {"size": 14, "bold": True, "color": CYAN, "space_after": 12}),
        ("Python amaliyoti →\nkichik Django sayt →\nkeyin DRF bilan API.", {
            "size": 30, "bold": True, "color": NAVY, "space_after": 20,
        }),
        ("Eslab qoling: avval muammo, keyin yechim.", {"size": 18, "bold": True, "color": AMBER, "space_after": 12}),
        ("Savollar bo‘lsa — shu yerda yozib qo‘yamiz.", {"size": 16, "color": MUTED}),
    ])

    out.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(out))
    print(f"Saved: {out} ({len(prs.slides)} slides)")


if __name__ == "__main__":
    out_dir = Path(__file__).resolve().parent
    primary = out_dir / "Python-Django-PBL-v5.pptx"
    build(primary)
    # Eski nomlarga ham nusxa — lekin asosiy yuklash PBL-v5
    shutil.copyfile(primary, out_dir / "Python-Dars-01-YANGI.pptx")
    shutil.copyfile(primary, out_dir / "Python-Django-Yorqin.pptx")
    shutil.copyfile(primary, out_dir / "Python-Django-Vaaav.pptx")
