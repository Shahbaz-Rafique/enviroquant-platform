"""Small, dependency-light charts for the generated EIA Word report."""

from __future__ import annotations

from io import BytesIO

from PIL import Image, ImageDraw, ImageFont


INK = "#18372c"
GREEN = "#287451"
MUTED = "#697a73"
GRID = "#dce6e1"
PALETTE = ["#287451", "#4b9b73", "#78b993", "#a1cfae", "#497a6a", "#7f9f8f", "#b4cabc", "#315d4e"]


def _font(size: int, *, bold: bool = False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _png(image: Image.Image) -> BytesIO:
    output = BytesIO()
    image.save(output, format="PNG", optimize=True)
    output.seek(0)
    return output


def content_volume_chart(sections: list[dict[str, object]]) -> BytesIO:
    """Render an accessible horizontal bar chart of word counts per section."""
    rows = []
    for section in sections:
        count = sum(len(str(item.get("content", "")).split()) for item in section["subsections"])
        rows.append((f"{section['section_number']}. {section['title']}", count))

    width = 1500
    row_height = 86
    height = max(500, 160 + max(len(rows), 1) * row_height)
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    title_font = _font(34, bold=True)
    label_font = _font(22)
    value_font = _font(21, bold=True)
    draw.text((45, 30), "Content volume by section", fill=INK, font=title_font)
    draw.text((45, 78), "Words in the compiled report", fill=MUTED, font=label_font)

    chart_left, chart_right = 540, width - 90
    maximum = max((value for _, value in rows), default=1) or 1
    for index, (label, value) in enumerate(rows):
        y = 140 + index * row_height
        shortened = label if len(label) <= 42 else label[:39] + "…"
        draw.text((45, y + 9), shortened, fill=INK, font=label_font)
        draw.rounded_rectangle((chart_left, y + 10, chart_right, y + 43), radius=15, fill="#edf3ef")
        filled = chart_left + max(8, int((chart_right - chart_left) * value / maximum))
        draw.rounded_rectangle((chart_left, y + 10, filled, y + 43), radius=15, fill=GREEN)
        draw.text((chart_right + 12, y + 10), f"{value:,}", fill=INK, font=value_font)
    return _png(image)


def subsection_distribution_chart(sections: list[dict[str, object]]) -> BytesIO:
    """Render a donut chart showing how report subsections are distributed."""
    width, height = 1500, 720
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    title_font = _font(34, bold=True)
    label_font = _font(22)
    value_font = _font(22, bold=True)
    draw.text((45, 30), "Report structure", fill=INK, font=title_font)
    draw.text((45, 78), "Distribution of subsections", fill=MUTED, font=label_font)

    values = [len(section["subsections"]) for section in sections]
    total = sum(values) or 1
    box = (80, 145, 570, 635)
    start = -90.0
    for index, value in enumerate(values):
        end = start + 360 * value / total
        draw.pieslice(box, start=start, end=end, fill=PALETTE[index % len(PALETTE)], outline="white", width=3)
        start = end
    draw.ellipse((205, 270, 445, 510), fill="white")
    total_text = str(total)
    bbox = draw.textbbox((0, 0), total_text, font=_font(48, bold=True))
    draw.text((325 - (bbox[2] - bbox[0]) / 2, 330), total_text, fill=INK, font=_font(48, bold=True))
    draw.text((255, 393), "subsections", fill=MUTED, font=label_font)

    legend_x = 660
    for index, section in enumerate(sections):
        y = 155 + index * 64
        color = PALETTE[index % len(PALETTE)]
        draw.rounded_rectangle((legend_x, y + 4, legend_x + 28, y + 32), radius=5, fill=color)
        label = f"{section['section_number']}. {section['title']}"
        if len(label) > 48:
            label = label[:45] + "…"
        draw.text((legend_x + 45, y), label, fill=INK, font=label_font)
        draw.text((width - 125, y), str(values[index]), fill=INK, font=value_font)
    return _png(image)
