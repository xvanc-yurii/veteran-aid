from io import BytesIO
from pathlib import Path
import re

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


FONT_PATH = Path(__file__).resolve().parent.parent / "assets" / "fonts" / "DejaVuSans.ttf"
FONT_NAME = "DejaVuSans"
FONT_BOLD = "DejaVuSans-Bold"

_registered = False


def _ensure_font_registered():
    global _registered
    if _registered:
        return
    if not FONT_PATH.exists():
        raise FileNotFoundError(
            f"Font file not found: {FONT_PATH}. "
            f"Copy DejaVuSans.ttf to app/assets/fonts/DejaVuSans.ttf"
        )

    pdfmetrics.registerFont(TTFont(FONT_NAME, str(FONT_PATH)))
    pdfmetrics.registerFont(
        TTFont(FONT_BOLD, str(FONT_PATH))  # DejaVuSans має жирний у самому файлі
    )
    _registered = True


def _wrap(c, text, font, size, max_width):
    lines = []
    for raw in (text or "").split("\n"):
        if raw.strip() == "":
            lines.append("")
            continue
        words = raw.split(" ")
        cur = ""
        for w in words:
            cand = (cur + " " + w).strip()
            if c.stringWidth(cand, font, size) <= max_width:
                cur = cand
            else:
                if cur:
                    lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
    return lines


def _parse(text: str) -> dict:
    def grab(tag: str) -> str:
        m = re.search(rf"\[{tag}\]\s*(.*?)(?=\n\[[A-Z_]+\]|\Z)", text, re.S)
        return m.group(1).strip() if m else ""

    att = grab("ATTACHMENTS")
    attachments = [
        l.lstrip("-").strip()
        for l in att.splitlines()
        if l.strip()
    ]

    return {
        "to": grab("TO"),
        "from": grab("FROM"),
        "body": grab("BODY"),
        "attachments": attachments,
    }


def application_text_to_pdf_bytes(text: str, title: str = "ЗАЯВА") -> bytes:
    _ensure_font_registered()
    parts = _parse(text)

    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4

    left = 18 * mm
    right = 18 * mm
    top = 16 * mm
    bottom = 18 * mm

    usable_w = w - left - right

    title_size = 16
    body_size = 11
    small_size = 10
    line_h = 6 * mm
    indent = 8 * mm

    def new_page():
        c.showPage()
        c.setFont(FONT_NAME, body_size)

    y = h - top

    # ===== ЗАГОЛОВОК =====
    c.setFont(FONT_BOLD, title_size)
    c.drawCentredString(w / 2, y, title)
    y -= 12 * mm

    # ===== ПРАВИЙ БЛОК КОМУ / ВІД =====
    block_w = usable_w * 0.55
    block_x = w - right - block_w

    def draw_right_block(label: str, content: str):
        nonlocal y
        c.setFont(FONT_BOLD, small_size)
        c.drawRightString(w - right, y, label)
        y -= 5 * mm

        c.setFont(FONT_NAME, small_size)
        for line in _wrap(c, content, FONT_NAME, small_size, block_w):
            c.drawRightString(w - right, y, line)
            y -= 5 * mm

        y -= 3 * mm

    draw_right_block("Кому:", parts["to"])
    draw_right_block("Від:", parts["from"])

    y -= 6 * mm

    # ===== ТІЛО ЗАЯВИ =====
    c.setFont(FONT_NAME, body_size)
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", parts["body"]) if p.strip()]

    for p in paragraphs:
        lines = _wrap(c, p, FONT_NAME, body_size, usable_w - indent)
        for i, line in enumerate(lines):
            if y <= bottom:
                new_page()
                y = h - top
            x = left + (indent if i == 0 else 0)
            c.drawString(x, y, line)
            y -= line_h
        y -= 3 * mm

    # ===== ДОДАТКИ =====
    if parts["attachments"]:
        if y <= bottom + 35 * mm:
            new_page()
            y = h - top

        c.setFont(FONT_BOLD, body_size)
        c.drawString(left, y, "Додатки:")
        y -= line_h

        c.setFont(FONT_NAME, body_size)
        for i, item in enumerate(parts["attachments"], 1):
            bullet = f"{i}. {item}"
            for line in _wrap(c, bullet, FONT_NAME, body_size, usable_w - 6 * mm):
                c.drawString(left + 6 * mm, y, line)
                y -= line_h
        y -= 4 * mm

    # ===== ДАТА / ПІДПИС =====
    if y <= bottom + 25 * mm:
        new_page()
        y = h - top

    y -= 8 * mm
    c.setFont(FONT_NAME, body_size)
    c.setLineWidth(0.6)

    c.drawString(left, y, "Дата:")
    c.line(left + 18 * mm, y - 1.5 * mm, left + 70 * mm, y - 1.5 * mm)

    c.drawString(w - right - 90 * mm, y, "Підпис:")
    c.line(w - right - 60 * mm, y - 1.5 * mm, w - right, y - 1.5 * mm)

    c.save()
    buf.seek(0)
    return buf.read()
