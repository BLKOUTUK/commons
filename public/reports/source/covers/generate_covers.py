#!/usr/bin/env python3
"""
Generate the two report cover PDFs using the Ancestral Frequency design
philosophy. Outputs:
  01-cover.pdf  — Data Capitalism & Algorithmic Racism
  02-cover.pdf  — Strategic Roadmap
"""

from __future__ import annotations

import math
import os
import subprocess
import sys
import textwrap
from pathlib import Path

HERE = Path(__file__).resolve().parent
FONTS_DIR = Path(
    "/home/robbe/.claude/plugins/cache/anthropic-agent-skills/"
    "document-skills/690f15cac7f7/skills/canvas-design/canvas-fonts"
)

SIGIL_PATH = Path(
    "/home/robbe/wt/comms-lockfile/public/images/blkoutlogo_wht_transparent.png"
)

# Colours (Ancestral Frequency palette)
OBSIDIAN = "#050505"     # deep field, carrier wave
GOLD = "#D4AF37"         # the signal
GOLD_LIGHT = "#E8C860"   # display highlight
CREAM = "#F5E9D3"        # display title body
CREAM_MUTED = "rgba(245,233,211,0.62)"
GOLD_DIM = "rgba(212,175,55,0.55)"

# Geometry — A4 portrait, mm
PAGE_W_MM = 210
PAGE_H_MM = 297

# ---------------------------------------------------------------------------
# Cover 1 — Data Capitalism & Algorithmic Racism
# Visual concept: a frequency-analyser plate with conspicuous voids
# ("missing datasets") where data about marginalised communities should be.
# ---------------------------------------------------------------------------

def spectrum_cover_one_svg(width_mm: float = 174, height_mm: float = 78) -> str:
    cols = 220
    bar_w = width_mm / cols * 0.62  # leave white space between bars

    # Deterministic naturalistic envelope
    heights = []
    for i in range(cols):
        x = i / (cols - 1)
        envelope = (
            0.50
            + 0.28 * math.sin(x * math.pi * 2.1 + 0.7)
            + 0.08 * math.sin(x * math.pi * 6.9 + 1.4)
        )
        detail = (
            0.10 * math.sin(x * math.pi * 19 + 1.1)
            + 0.06 * math.cos(x * math.pi * 37 + 2.3)
            + 0.04 * math.sin(x * math.pi * 73 + 0.4)
        )
        h = max(0.0, min(1.0, envelope + detail)) * height_mm
        heights.append(h)

    # Intentional voids — the missing datasets
    voids = [
        (34, 42),
        (78, 92),
        (130, 140),
        (188, 200),
    ]
    for (start, end) in voids:
        for i in range(start, end + 1):
            if 0 <= i < cols:
                heights[i] = 0.0

    # Baseline shift line (subtle horizontal axis)
    bars_xml = []
    for i, h in enumerate(heights):
        if h <= 0.001:
            continue
        x = i / (cols - 1) * width_mm
        y = height_mm - h
        # Bars taper slightly — top is a tiny gold square sitting on a thin
        # stem. Drawn as one rect each (we keep the SVG small).
        bars_xml.append(
            f'<rect x="{x:.3f}" y="{y:.3f}" width="{bar_w:.3f}" '
            f'height="{h:.3f}" fill="{GOLD}" />'
        )
    bars = "\n".join(bars_xml)

    # Axis line + tick marks beneath
    tick_xml = []
    n_ticks = 11
    for t in range(n_ticks):
        tx = t / (n_ticks - 1) * width_mm
        tick_xml.append(
            f'<line x1="{tx:.3f}" y1="{height_mm:.3f}" '
            f'x2="{tx:.3f}" y2="{height_mm + 1.4:.3f}" '
            f'stroke="{GOLD}" stroke-opacity="0.55" stroke-width="0.18" />'
        )
    ticks = "\n".join(tick_xml)

    # Tiny mono labels under each void (the missing-datasets gesture)
    void_labels_xml = []
    void_label_texts = [
        "BLACK QUEER · UK",
        "M.H. ACT · ORIENTATION",
        "DETENTION · INTERSECTION",
        "SUICIDE · CARE LEAVERS",
    ]
    for (vidx, (start, end)) in enumerate(voids):
        midi = (start + end) / 2
        mx = midi / (cols - 1) * width_mm
        label_text = void_label_texts[vidx] if vidx < len(void_label_texts) else ""
        void_labels_xml.append(
            f'<text x="{mx:.3f}" y="{height_mm + 5.5:.3f}" '
            f'font-family="GeistMono, monospace" font-size="1.8" '
            f'fill="{GOLD}" fill-opacity="0.78" text-anchor="middle" '
            f'letter-spacing="0.18">{label_text}</text>'
        )
    void_labels = "\n".join(void_labels_xml)

    # Y-axis amplitude labels (whisper-quiet)
    y_labels_xml = []
    for (yval, label) in [
        (0, "SILENT"),
        (height_mm * 0.5, "PARTIAL"),
        (height_mm * 0.95, "EXTRACTED"),
    ]:
        y_labels_xml.append(
            f'<text x="-2" y="{height_mm - yval:.3f}" '
            f'font-family="GeistMono, monospace" font-size="1.7" '
            f'fill="{GOLD}" fill-opacity="0.5" text-anchor="end" '
            f'letter-spacing="0.16">{label}</text>'
        )
    y_labels = "\n".join(y_labels_xml)

    return f'''<svg xmlns="http://www.w3.org/2000/svg"
    viewBox="-18 -4 {width_mm + 22} {height_mm + 12}"
    width="{width_mm + 22}mm" height="{height_mm + 12}mm"
    preserveAspectRatio="xMidYMid meet">
  {bars}
  <line x1="0" y1="{height_mm:.3f}" x2="{width_mm:.3f}" y2="{height_mm:.3f}"
        stroke="{GOLD}" stroke-opacity="0.75" stroke-width="0.18" />
  {ticks}
  {void_labels}
  {y_labels}
</svg>'''


# ---------------------------------------------------------------------------
# Cover 2 — Strategic Roadmap
# Visual concept: three concentric arcs (the three mistuned frequencies of
# Critical Frequency) coming into tune. Diagrammatic, calibrated, restrained.
# ---------------------------------------------------------------------------

def tuning_cover_two_svg(width_mm: float = 174, height_mm: float = 130) -> str:
    cx = width_mm / 2
    cy = height_mm / 2 + 4

    # Three rings at scaled radii
    rings = [
        ("DIAGNOSTIC FREQUENCY", 56, 0.50),
        ("EVIDENCE FREQUENCY",   42, 0.65),
        ("INTERVENTION FREQUENCY", 28, 0.85),
    ]

    elements = []

    # Outer scale ring — tick marks every 3 degrees
    outer_r = 64
    for deg in range(0, 360, 3):
        rad = math.radians(deg - 90)
        x1 = cx + (outer_r) * math.cos(rad)
        y1 = cy + (outer_r) * math.sin(rad)
        x2 = cx + (outer_r + (1.2 if deg % 30 == 0 else 0.6)) * math.cos(rad)
        y2 = cy + (outer_r + (1.2 if deg % 30 == 0 else 0.6)) * math.sin(rad)
        opacity = 0.7 if deg % 30 == 0 else 0.32
        elements.append(
            f'<line x1="{x1:.3f}" y1="{y1:.3f}" x2="{x2:.3f}" y2="{y2:.3f}" '
            f'stroke="{GOLD}" stroke-opacity="{opacity}" stroke-width="0.18" />'
        )

    # Cardinal degree labels (light, restrained)
    for deg, label in [(0, "000"), (90, "090"), (180, "180"), (270, "270")]:
        rad = math.radians(deg - 90)
        lx = cx + (outer_r + 5) * math.cos(rad)
        ly = cy + (outer_r + 5) * math.sin(rad)
        elements.append(
            f'<text x="{lx:.3f}" y="{ly + 0.6:.3f}" '
            f'font-family="GeistMono, monospace" font-size="1.9" '
            f'fill="{GOLD}" fill-opacity="0.55" text-anchor="middle" '
            f'letter-spacing="0.14">{label}</text>'
        )

    # Three rings + radial sine-modulated marks (the mistuning becomes tuning)
    for idx, (label, radius, mistune) in enumerate(rings):
        # Ring stroke
        elements.append(
            f'<circle cx="{cx:.3f}" cy="{cy:.3f}" r="{radius:.3f}" '
            f'fill="none" stroke="{GOLD}" stroke-opacity="0.32" '
            f'stroke-width="0.16" />'
        )

        # Radial marks around ring — number depends on mistune (less mistune
        # = denser/more-aligned ticks)
        n_marks = 96
        for k in range(n_marks):
            ang = (k / n_marks) * 2 * math.pi - math.pi / 2
            # Mistune offset shimmies the marks off-grid
            shim = (
                mistune
                * 1.6
                * math.sin(k * 0.42 + idx * 1.7)
            )
            r_outer = radius + 1.0 + shim
            r_inner = radius - 1.0 + shim
            x1 = cx + r_inner * math.cos(ang)
            y1 = cy + r_inner * math.sin(ang)
            x2 = cx + r_outer * math.cos(ang)
            y2 = cy + r_outer * math.sin(ang)
            opacity = 0.42 + 0.30 * (1 - mistune)
            elements.append(
                f'<line x1="{x1:.3f}" y1="{y1:.3f}" x2="{x2:.3f}" y2="{y2:.3f}" '
                f'stroke="{GOLD}" stroke-opacity="{opacity:.3f}" '
                f'stroke-width="0.18" />'
            )

        # Label for the ring — placed at top right of its arc
        label_ang = math.radians(-58 - idx * 8)
        lx = cx + (radius + 4.5) * math.cos(label_ang)
        ly = cy + (radius + 4.5) * math.sin(label_ang)
        elements.append(
            f'<text x="{lx:.3f}" y="{ly:.3f}" '
            f'font-family="GeistMono, monospace" font-size="1.85" '
            f'fill="{GOLD}" fill-opacity="0.72" '
            f'text-anchor="start" letter-spacing="0.20">{label}</text>'
        )

    # Centre crosshair + dot (the tuning target)
    elements.append(
        f'<line x1="{cx - 3:.3f}" y1="{cy:.3f}" x2="{cx + 3:.3f}" y2="{cy:.3f}" '
        f'stroke="{GOLD}" stroke-opacity="0.9" stroke-width="0.22" />'
    )
    elements.append(
        f'<line x1="{cx:.3f}" y1="{cy - 3:.3f}" x2="{cx:.3f}" y2="{cy + 3:.3f}" '
        f'stroke="{GOLD}" stroke-opacity="0.9" stroke-width="0.22" />'
    )
    elements.append(
        f'<circle cx="{cx:.3f}" cy="{cy:.3f}" r="0.7" fill="{GOLD}" />'
    )

    # Small caption at bottom: critical frequency
    elements.append(
        f'<text x="{cx:.3f}" y="{height_mm + 4:.3f}" '
        f'font-family="GeistMono, monospace" font-size="2.0" '
        f'fill="{GOLD}" fill-opacity="0.78" text-anchor="middle" '
        f'letter-spacing="0.26">CRITICAL FREQUENCY · RETUNING THE INSTRUMENT</text>'
    )

    body = "\n  ".join(elements)
    return f'''<svg xmlns="http://www.w3.org/2000/svg"
    viewBox="-8 -8 {width_mm + 16} {height_mm + 14}"
    width="{width_mm + 16}mm" height="{height_mm + 14}mm"
    preserveAspectRatio="xMidYMid meet">
  {body}
</svg>'''


# ---------------------------------------------------------------------------
# HTML template — shared design grammar
# ---------------------------------------------------------------------------

def font_face_block() -> str:
    def ff(name: str, file: str, weight: int = 400, style: str = "normal"):
        return (
            f"@font-face {{ font-family: '{name}'; "
            f"src: url('file://{FONTS_DIR / file}') format('truetype'); "
            f"font-weight: {weight}; font-style: {style}; }}"
        )
    return "\n  ".join([
        ff("WorkSans", "WorkSans-Regular.ttf", 400),
        ff("WorkSans", "WorkSans-Bold.ttf", 700),
        ff("WorkSans", "WorkSans-Italic.ttf", 400, "italic"),
        ff("WorkSans", "WorkSans-BoldItalic.ttf", 700, "italic"),
        ff("GeistMono", "GeistMono-Regular.ttf", 400),
        ff("GeistMono", "GeistMono-Bold.ttf", 700),
        ff("LibreBaskerville", "LibreBaskerville-Regular.ttf", 400),
    ])


def render_cover_html(
    *,
    label_left: str,
    label_right: str,
    title_lines: list[str],
    subtitle: str,
    svg_inline: str,
    footer_left: str,
    footer_right: str,
    epigraph: str | None = None,
    page_no_text: str | None = None,
    title_anchor_top_mm: float = 36,
    svg_top_mm: float = 160,
) -> str:
    title_html = "<br>".join(title_lines)
    epigraph_html = (
        f'<div class="epigraph">{epigraph}</div>' if epigraph else ""
    )
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  {font_face_block()}

  @page {{ size: {PAGE_W_MM}mm {PAGE_H_MM}mm; margin: 0; }}

  html, body {{ margin: 0; padding: 0; background: {OBSIDIAN}; color: {CREAM}; }}
  body {{
    width: {PAGE_W_MM}mm; height: {PAGE_H_MM}mm;
    font-family: 'WorkSans', sans-serif;
    position: relative;
    overflow: hidden;
  }}

  /* Top eyebrow */
  .eyebrow {{
    position: absolute; top: 16mm; left: 18mm; right: 18mm;
    display: flex; justify-content: space-between; align-items: center;
    font-family: 'GeistMono', monospace;
    font-size: 7.5pt; letter-spacing: 0.22em; text-transform: uppercase;
    color: {GOLD}; opacity: 0.86;
  }}
  .eyebrow .right {{ color: {GOLD}; }}
  .brand {{ display: flex; align-items: center; gap: 4mm; white-space: nowrap; }}
  .brand img {{ width: 12mm; height: 12mm; display: block; opacity: 1; }}
  .brand span {{ position: relative; top: 0.3mm; white-space: nowrap; }}

  /* Discreet horizontal rule under eyebrow */
  .eyebrow-rule {{
    position: absolute; top: 30mm; left: 18mm; right: 18mm;
    height: 0; border-top: 0.4pt solid {GOLD}; opacity: 0.45;
  }}

  /* Title block */
  .title {{
    position: absolute; left: 18mm; right: 18mm;
    top: {title_anchor_top_mm}mm;
  }}
  .title h1 {{
    font-family: 'WorkSans', sans-serif;
    font-weight: 700;
    font-size: 44pt;
    line-height: 0.94;
    letter-spacing: -0.022em;
    text-transform: uppercase;
    color: {CREAM};
    margin: 0;
  }}
  .title .accent {{ color: {GOLD}; }}
  .subtitle {{
    margin-top: 10mm;
    font-family: 'LibreBaskerville', serif;
    font-style: italic;
    font-weight: 400;
    font-size: 13.5pt;
    line-height: 1.45;
    color: {GOLD_LIGHT};
    max-width: 140mm;
    letter-spacing: 0.005em;
  }}

  .epigraph {{
    margin-top: 8mm;
    font-family: 'GeistMono', monospace;
    font-size: 7.5pt; letter-spacing: 0.20em; text-transform: uppercase;
    color: {GOLD}; opacity: 0.78;
    max-width: 140mm;
  }}

  /* SVG composition */
  .canvas {{
    position: absolute;
    left: 18mm;
    top: {svg_top_mm}mm;
  }}

  /* Footer */
  .footer {{
    position: absolute; bottom: 18mm; left: 18mm; right: 18mm;
    display: flex; justify-content: space-between; align-items: flex-end;
    font-family: 'GeistMono', monospace;
    font-size: 7.5pt; letter-spacing: 0.22em; text-transform: uppercase;
    color: {GOLD}; opacity: 0.82;
  }}
  .footer-rule {{
    position: absolute; bottom: 23mm; left: 18mm; right: 18mm;
    border-top: 0.4pt solid {GOLD}; opacity: 0.45;
  }}

  /* Page number block bottom-right of title area */
  .page-mark {{
    position: absolute;
    top: 18mm;
    right: 18mm;
    font-family: 'GeistMono', monospace;
    font-size: 7.5pt; letter-spacing: 0.22em; text-transform: uppercase;
    color: {GOLD}; opacity: 0.78;
  }}
</style>
</head>
<body>
  <div class="eyebrow">
    <span class="brand">
      <img src="file://{SIGIL_PATH}" alt="BLKOUT">
      <span>{label_left}</span>
    </span>
    <span class="right">{label_right}</span>
  </div>
  <div class="eyebrow-rule"></div>

  <div class="title">
    <h1>{title_html}</h1>
    <div class="subtitle">{subtitle}</div>
    {epigraph_html}
  </div>

  <div class="canvas">
    {svg_inline}
  </div>

  <div class="footer-rule"></div>
  <div class="footer">
    <span>{footer_left}</span>
    <span>{footer_right}</span>
  </div>
</body>
</html>
"""


def render_pdf(html: str, out_pdf: Path) -> None:
    # weasyprint
    from weasyprint import HTML
    HTML(string=html, base_url=str(HERE)).write_pdf(str(out_pdf))


def main() -> None:
    cover1_svg = spectrum_cover_one_svg()
    cover1_html = render_cover_html(
        label_left="// THE COMMONS",
        label_right="REPORT 01 / 02",
        title_lines=[
            "DATA",
            "CAPITALISM",
            "& ALGORITHMIC",
            "<span class='accent'>RACISM</span>",
        ],
        subtitle=(
            "From the plantation to the platform — and the visibility "
            "missing in between."
        ),
        epigraph=(
            "// THE TWIN HARMS &nbsp;—&nbsp; "
            "EXTRACTION &amp; ERASURE"
        ),
        svg_inline=cover1_svg,
        footer_left="ROB BERKELEY · BLKOUT UK",
        footer_right="MAY 2026 · BLKOUTUK.COM/COMMONS",
        title_anchor_top_mm=36,
        svg_top_mm=176,
    )

    cover2_svg = tuning_cover_two_svg()
    cover2_html = render_cover_html(
        label_left="// THE COMMONS",
        label_right="REPORT 02 / 02",
        title_lines=[
            "STRATEGIC",
            "<span class='accent'>ROADMAP</span>",
        ],
        subtitle=(
            "What we're building, and what travels."
        ),
        epigraph=(
            "// HERITAGE &nbsp;·&nbsp; POLICY &nbsp;·&nbsp; PLATFORM "
            "&nbsp;·&nbsp; THE PATTERN THAT TRAVELS"
        ),
        svg_inline=cover2_svg,
        footer_left="ROB BERKELEY · BLKOUT UK",
        footer_right="MAY 2026 · BLKOUTUK.COM/COMMONS",
        title_anchor_top_mm=36,
        svg_top_mm=120,
    )

    out_html1 = HERE / "01-cover.html"
    out_html2 = HERE / "02-cover.html"
    out_html1.write_text(cover1_html, encoding="utf-8")
    out_html2.write_text(cover2_html, encoding="utf-8")

    out_pdf1 = HERE / "01-cover.pdf"
    out_pdf2 = HERE / "02-cover.pdf"
    render_pdf(cover1_html, out_pdf1)
    render_pdf(cover2_html, out_pdf2)

    print("OK", out_pdf1, out_pdf2)


if __name__ == "__main__":
    main()
