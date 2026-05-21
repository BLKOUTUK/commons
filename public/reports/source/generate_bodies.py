#!/usr/bin/env python3
"""
Render the two report bodies (essay-form markdown) into PDFs that pair
with the Ancestral Frequency covers, then concatenate cover + body
into the final PDFs at /commons/reports/.

Body aesthetic:
  cream paper field (continuous with cover's display title cream)
  obsidian body text
  gold for section markers, mono labels, accents, sigil
  Work Sans / LibreBaskerville (italic) / Geist Mono
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

import markdown as md
from weasyprint import HTML

HERE = Path(__file__).resolve().parent
COVERS = HERE / "covers"
FONTS_DIR = Path(
    "/home/robbe/.claude/plugins/cache/anthropic-agent-skills/"
    "document-skills/690f15cac7f7/skills/canvas-design/canvas-fonts"
)
SIGIL_PATH = Path(
    "/home/robbe/wt/comms-lockfile/public/images/blkoutlogo_wht_transparent.png"
)
# A dark sigil variant for use against cream backgrounds
DARK_SIGIL = HERE / "covers" / "blkout-sigil-dark.png"

# Palette
PAPER = "#F2EAD3"
INK = "#171717"
GOLD = "#B7892C"        # deeper gold for legible accent on cream
GOLD_BRIGHT = "#D4AF37"  # cover gold echo where needed
MUTED = "#5C5347"        # muted ink for secondary text

OUT_DIR = HERE  # working dir
FINAL_DIR = HERE.parent  # /commons/reports/


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


CSS = """
{font_faces}

@page {{
  size: 210mm 297mm;
  margin: 30mm 22mm 24mm 22mm;
  background: {paper};

  @top-left {{
    content: string(report-title);
    font-family: 'GeistMono', monospace;
    font-size: 6.8pt;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: {gold};
    margin-top: 10mm;
  }}
  @top-right {{
    content: "// THE COMMONS";
    font-family: 'GeistMono', monospace;
    font-size: 6.8pt;
    letter-spacing: 0.22em;
    color: {gold};
    margin-top: 10mm;
  }}
  @bottom-left {{
    content: "BLKOUT UK · MAY 2026";
    font-family: 'GeistMono', monospace;
    font-size: 6.8pt;
    letter-spacing: 0.22em;
    color: {gold};
    margin-bottom: 8mm;
  }}
  @bottom-right {{
    content: counter(page);
    font-family: 'GeistMono', monospace;
    font-size: 6.8pt;
    letter-spacing: 0.22em;
    color: {gold};
    margin-bottom: 8mm;
  }}
}}

@page :first {{
  margin-top: 36mm;
}}

html, body {{
  background: {paper};
  color: {ink};
  font-family: 'WorkSans', sans-serif;
  font-size: 10.5pt;
  line-height: 1.62;
  letter-spacing: 0.005em;
  margin: 0;
  padding: 0;
}}

/* Running-header string set from the first H1 (kept hidden visually) */
h1 {{
  string-set: report-title content();
  /* hide H1 visually since the cover carries the title */
  position: absolute; left: -9999px; top: -9999px;
  font-size: 0;
}}

h2 {{
  font-family: 'WorkSans', sans-serif;
  font-weight: 700;
  font-size: 22pt;
  line-height: 1.1;
  color: {ink};
  margin: 18mm 0 6mm 0;
  letter-spacing: -0.012em;
  page-break-after: avoid;
  break-after: avoid;
}}

/* Numbered section headings (e.g. "1. The ledger") — pull the digits out
   as a gold marker via a class-free trick: we wrap them with a span class
   added by the markdown post-processor below. */
h2 .num {{
  display: block;
  font-family: 'GeistMono', monospace;
  font-size: 8.5pt;
  letter-spacing: 0.34em;
  color: {gold};
  text-transform: uppercase;
  font-weight: 400;
  margin-bottom: 4mm;
}}

h2.section-divider {{
  border-top: 0.5pt solid {gold};
  padding-top: 14mm;
  margin-top: 22mm;
}}

h3 {{
  font-family: 'WorkSans', sans-serif;
  font-weight: 700;
  font-size: 13pt;
  color: {ink};
  margin: 10mm 0 3mm 0;
  letter-spacing: -0.005em;
  page-break-after: avoid;
  break-after: avoid;
}}

h4 {{
  font-family: 'GeistMono', monospace;
  font-size: 8pt;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: {gold};
  margin: 9mm 0 3mm 0;
  font-weight: 400;
}}

p {{
  margin: 0 0 4mm 0;
  hyphens: auto;
  orphans: 3;
  widows: 3;
}}

/* Subtitle paragraph immediately under H2 in the title block of a report
   (handled in HTML preprocessing) */
.deck {{
  font-family: 'LibreBaskerville', serif;
  font-style: italic;
  font-size: 14pt;
  line-height: 1.45;
  color: {gold};
  margin: 0 0 12mm 0;
}}

/* The standfirst: the first paragraph after the report opens. Larger.
   Set via class added in preprocessing. */
.standfirst {{
  font-family: 'LibreBaskerville', serif;
  font-style: italic;
  font-size: 13pt;
  line-height: 1.5;
  color: {ink};
  margin-bottom: 6mm;
}}

em, i {{
  font-family: 'LibreBaskerville', serif;
  font-style: italic;
  font-size: 11.2pt;
  letter-spacing: 0;
}}

strong, b {{
  font-weight: 700;
  color: {ink};
}}

blockquote {{
  margin: 7mm 8mm;
  padding: 0 0 0 6mm;
  border-left: 0.7pt solid {gold};
  font-family: 'LibreBaskerville', serif;
  font-style: italic;
  font-size: 11.5pt;
  line-height: 1.55;
  color: {ink};
}}

ul, ol {{
  margin: 0 0 5mm 6mm;
  padding: 0;
}}
li {{ margin-bottom: 2mm; }}

a {{ color: {gold}; text-decoration: none; }}

hr {{
  border: none;
  border-top: 0.5pt solid {gold};
  margin: 14mm 0 14mm 0;
  opacity: 0.6;
}}

/* The sources cited section gets its own treatment */
h2#sources-cited,
h2[id^="sources"] {{
  font-size: 14pt;
  margin-top: 22mm;
  border-top: 0.5pt solid {gold};
  padding-top: 12mm;
  font-family: 'GeistMono', monospace;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  font-weight: 400;
  color: {gold};
}}

h2#sources-cited ~ ul,
h2[id^="sources"] ~ ul {{
  font-size: 9pt;
  line-height: 1.55;
  list-style: none;
  margin-left: 0;
  padding-left: 0;
}}
h2#sources-cited ~ ul li,
h2[id^="sources"] ~ ul li {{
  text-indent: -6mm;
  padding-left: 6mm;
  margin-bottom: 3.5mm;
}}

/* Pull quote treatment for blockquotes that contain only an italic
   single-line content (we mark them in preprocessing via .pull) */
blockquote.pull {{
  border-left: none;
  border-top: 0.5pt solid {gold};
  border-bottom: 0.5pt solid {gold};
  padding: 6mm 8mm;
  margin: 10mm 14mm;
  font-size: 14pt;
  line-height: 1.4;
  color: {gold};
  text-align: left;
}}

/* Section opener — small heading-like text with mono small-cap label */
.section-eyebrow {{
  font-family: 'GeistMono', monospace;
  font-size: 7.5pt;
  letter-spacing: 0.30em;
  color: {gold};
  text-transform: uppercase;
  margin-bottom: 2mm;
}}

/* End signature block — author/contact at very end */
.signature {{
  margin-top: 18mm;
  padding-top: 6mm;
  border-top: 0.5pt solid {gold};
  font-family: 'GeistMono', monospace;
  font-size: 7.5pt;
  letter-spacing: 0.22em;
  color: {gold};
  text-transform: uppercase;
}}
"""


def strip_frontmatter(text: str) -> tuple[dict, str]:
    """Pull YAML frontmatter off the top of the markdown."""
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    raw = parts[1]
    body = parts[2].lstrip("\n")
    meta = {}
    for line in raw.strip().splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip()
    return meta, body


def preprocess_markdown(text: str) -> str:
    """Light touches before markdown→HTML:
    - drop the title block (cover handles it)
    - tag the first non-empty paragraph as .standfirst
    - turn '### Sources cited' style anchors into known ids
    """
    meta, body = strip_frontmatter(text)
    return meta, body


def postprocess_html(html: str) -> str:
    """Tweaks on the rendered HTML before binding into the page:
    - mark the first paragraph .standfirst
    - mark the subtitle (the very first h2) handling
    - rewrap numbered ## headers so the digits become a gold marker
    """
    # Keep the H1 in the DOM so string-set can read its content for the
    # running header — CSS positions it off-screen so it isn't visible.

    # Convert the FIRST H2 (the subtitle) into a .deck paragraph.
    def _first_h2_to_deck(m: re.Match) -> str:
        return f'<p class="deck">{m.group(1)}</p>'
    html = re.sub(
        r"<h2[^>]*>([^<]+)</h2>", _first_h2_to_deck, html, count=1
    )

    # Mark the first paragraph after the deck as .standfirst (the lead).
    html = re.sub(
        r'(<p class="deck">[^<]*</p>\s*)<p>([^<]+(?:<[^<]+){0,3})</p>',
        r'\1<p class="standfirst">\2</p>',
        html,
        count=1,
        flags=re.DOTALL,
    )

    # Numbered H2 sections: pull "N." out as a gold "SECTION 0N" marker.
    def _split_section_num(m: re.Match) -> str:
        attrs = m.group(1)
        full = m.group(2).strip()
        num_match = re.match(r"^(\d+)\.\s+(.*)$", full)
        if not num_match:
            return f"<h2{attrs}>{full}</h2>"
        return (
            f'<h2 class="section-divider"{attrs}>'
            f'<span class="num">SECTION {num_match.group(1).zfill(2)}</span>'
            f'{num_match.group(2)}</h2>'
        )
    html = re.sub(r"<h2([^>]*)>([^<]+)</h2>", _split_section_num, html)

    # Tag the Sources cited heading by id (CSS already targets that id).
    html = re.sub(
        r'<h2([^>]*)>Sources cited</h2>',
        r'<h2\1 id="sources-cited">Sources cited</h2>',
        html,
        flags=re.IGNORECASE,
    )
    # The Closing heading gets the divider treatment.
    html = re.sub(
        r'<h2([^>]*)>Closing</h2>',
        r'<h2\1 class="section-divider">Closing</h2>',
        html,
        flags=re.IGNORECASE,
    )

    # The final signature line.
    html = re.sub(
        r'<p>—\s*(.+?)</p>\s*$',
        r'<div class="signature">\1</div>',
        html,
        flags=re.DOTALL,
    )

    return html


def render_body_pdf(md_path: Path, out_pdf: Path) -> None:
    text = md_path.read_text(encoding="utf-8")
    meta, body_md = preprocess_markdown(text)
    raw_html = md.markdown(
        body_md,
        extensions=["extra", "sane_lists", "smarty", "toc"],
    )
    inner_html = postprocess_html(raw_html)

    css = CSS.format(
        font_faces=font_face_block(),
        paper=PAPER, ink=INK, gold=GOLD,
    )
    html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>{css}</style></head>
<body>{inner_html}</body></html>"""

    HTML(string=html, base_url=str(HERE)).write_pdf(str(out_pdf))


def merge_pdfs(cover: Path, body: Path, out: Path) -> None:
    subprocess.run(
        ["pdfunite", str(cover), str(body), str(out)],
        check=True,
    )


def main() -> None:
    pdf1_body = HERE / "01-body.pdf"
    pdf2_body = HERE / "02-body.pdf"
    render_body_pdf(HERE / "01-data-capitalism-algorithmic-racism.md", pdf1_body)
    render_body_pdf(HERE / "02-strategic-roadmap.md", pdf2_body)

    final1 = HERE.parent / "01-data-capitalism-algorithmic-racism.pdf"
    final2 = HERE.parent / "02-strategic-roadmap.pdf"
    merge_pdfs(COVERS / "01-cover.pdf", pdf1_body, final1)
    merge_pdfs(COVERS / "02-cover.pdf", pdf2_body, final2)

    print("OK", final1, final2)


if __name__ == "__main__":
    main()
