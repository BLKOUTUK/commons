# BLKOUT Commons

The public-facing home for BLKOUT's digital commons work — reports, walkthroughs, case studies, briefs. Lives at **[commons.blkoutuk.com](https://commons.blkoutuk.com)**.

## What's here

```
public/
├── index.html                    # commons landing
├── walkthrough.html              # Dreamcatcher walkthrough — how we use AI tools to keep on course
├── blkout-sigil-gold.png
├── rental-to-common-ground.jpg
├── reports/
│   ├── 01-data-capitalism-algorithmic-racism.pdf
│   ├── 02-strategic-roadmap.pdf
│   └── source/                   # markdown source + generators (rebuildable)
│       ├── 01-data-capitalism-algorithmic-racism.md
│       ├── 02-strategic-roadmap.md
│       ├── generate_bodies.py
│       └── covers/
│           ├── design-philosophy.md
│           ├── generate_covers.py
│           ├── 01-cover.pdf
│           └── 02-cover.pdf
└── podcast/                      # podcast assets — adding over time
```

## Deploy

Coolify auto-deploys on push to `main` from this repo. Static-served via `nginx:alpine` (see Dockerfile).

## Rebuilding the reports

The PDFs are reproducible from the markdown source. If you edit a report or want to rebuild after a font update:

```bash
cd public/reports/source
python3 generate_bodies.py   # rebuilds both body PDFs + concatenates with covers
```

To regenerate the covers (Ancestral Frequency design philosophy):

```bash
cd public/reports/source/covers
python3 generate_covers.py
```

System dependencies: `python3-markdown`, `python3-weasyprint`, `poppler-utils` (for `pdfunite` and `pdftoppm`).

## Brand grammar

BLKOUT signature palette: gold-on-obsidian; Work Sans display; LibreBaskerville italic accents; Geist Mono technical labels; BLKOUT sigil mark.

Cover design philosophy: **Ancestral Frequency** — see `public/reports/source/covers/design-philosophy.md`.

## Contact

Rob Berkeley · BLKOUT UK · rob@blkoutuk.com
