#!/usr/bin/env python3
"""
Emit a standalone, self-contained SVG of a sanctioned layout.

This is the "print / share / embed anywhere" artefact: no scripts, no fonts to
load, no data fetch — just the traced plan with every plot as its own element
carrying `id`, `data-*` metadata and an accessible <title>. Drop it into an
email, a brochure, an <img> tag or a CAD viewer and the geometry still matches
the approval drawing exactly.

    python scripts/render-layout-svg.py            # -> web/edappadi-layout.svg
    python scripts/render-layout-svg.py out.svg

Regenerate the source data first with scripts/extract-dtcp-layout.py.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DATA = REPO / "web" / "layout-data.js"
DEFAULT_OUT = REPO / "web" / "edappadi-layout.svg"

PALETTE = {
    "road": "#ececE8", "osr": "#eef5ea", "osrLine": "#5b8c3a",
    "site": "#d0402f", "existing": "#f4efdc", "existingLine": "#7a6b32",
    "plot": "#ffffff", "plotLine": "#1e9e5a", "muted": "#74746e",
}


def esc(s: str) -> str:
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def load() -> dict:
    src = DATA.read_text(encoding="utf-8")
    body = src.split("window.JAMIN_LAYOUT = ", 1)[1]
    # stop at the object's own closing brace, not at a later statement's
    body = body.split("\n};", 1)[0] + "\n}"
    return json.loads(body)


def render(g: dict) -> str:
    vb = g["viewBox"]
    boundary = " ".join(f"{x},{y}" for x, y in g["boundary"])
    xs = [p[0] for p in g["boundary"]]
    ys = [p[1] for p in g["boundary"]]
    o = g["osr"]["rect"]

    out: list[str] = []
    add = out.append
    add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(str(v) for v in vb)}" '
        f'width="{vb[2] * 2}" height="{vb[3] * 2}" role="img" '
        f'aria-label="{esc(g["name"])} — sanctioned layout plan">')
    add(f'<title>{esc(g["name"])}</title>')
    add(f'<desc>{esc(g["title"])} · {esc(g["place"])} · DTCP application '
        f'{esc(g["approvalNo"])}. Geometry traced from the approved drawing; '
        f'sizes and areas quoted from the sanctioned plot schedule.</desc>')

    add("<defs><style>"
        ".pn{font:700 6.6px Inter,Helvetica,Arial,sans-serif;fill:%s;text-anchor:middle}"
        ".pa{font:500 3.1px Inter,Helvetica,Arial,sans-serif;fill:#74746e;text-anchor:middle;opacity:.85}"
        ".sl{font:600 3.4px Inter,Helvetica,Arial,sans-serif;fill:#74746e;text-anchor:middle}"
        ".rl{font:500 4px Inter,Helvetica,Arial,sans-serif;fill:%s;text-anchor:middle}"
        ".ol{font:600 6px Inter,Helvetica,Arial,sans-serif;fill:%s;text-anchor:middle}"
        ".os{font:500 4px Inter,Helvetica,Arial,sans-serif;fill:%s;text-anchor:middle}"
        ".dl{font:600 4.2px Inter,Helvetica,Arial,sans-serif;fill:%s;text-anchor:middle}"
        "</style>" % (PALETTE["plotLine"], PALETTE["muted"], PALETTE["osrLine"],
                      PALETTE["osrLine"], PALETTE["muted"]))
    add("</defs>")

    # Ground = the sanctioned site, coloured as road. Plots and the OSR sit on
    # top, so what shows through is exactly the road area. Drawing the boundary
    # polygon itself (rather than clipping a rect to it) keeps this SVG portable
    # to consumers that ignore clipPath.
    add(f'<polygon points="{boundary}" fill="{PALETTE["road"]}"/>')
    osr_poly = " ".join(f"{x},{y}" for x, y in g["osr"]["polygon"])
    add(f'<polygon points="{osr_poly}" fill="{PALETTE["osr"]}" '
        f'stroke="{PALETTE["osrLine"]}" stroke-width="0.5" stroke-dasharray="2.5 1.8"/>')
    _ = (xs, ys, o)

    er = " ".join(f"{x},{y}" for x, y in g["existingRoad"]["quad"])
    add(f'<polygon points="{er}" fill="{PALETTE["existing"]}" '
        f'stroke="{PALETTE["existingLine"]}" stroke-width="0.6"/>')
    add(f'<polygon points="{boundary}" fill="none" stroke="{PALETTE["site"]}" '
        f'stroke-width="1.9" stroke-linejoin="round"/>')

    add('<g id="plots">')
    for p in g["plots"]:
        x0, y0, x1, y1 = p["rect"]
        w, h = round(x1 - x0, 2), round(y1 - y0, 2)
        cx, cy = round(x0 + w / 2, 2), round(y0 + h / 2, 2)
        add(f'<g id="plot-{p["number"]}" data-plot="{p["number"]}" data-block="{p["block"]}" '
            f'data-area-sqm="{p["areaSqm"]}" data-size="{p["widthM"]}x{p["depthM"]}" '
            f'data-facing="{p["facing"]}">')
        add(f'<title>Plot {p["number"]} · Block {p["block"]} · {p["areaSqm"]} Sq.m</title>')
        add(f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" rx="1.8" '
            f'fill="{PALETTE["plot"]}" stroke="{PALETTE["plotLine"]}" stroke-width="0.9"/>')
        add(f'<text class="pn" x="{cx}" y="{cy - 0.8}">{p["number"]}</text>')
        # rounded so the annotation always fits inside the plot box; the exact
        # schedule figure stays in data-area-sqm and in the detail sheet
        add(f'<text class="pa" x="{cx}" y="{cy + 6}">{round(p["areaSqm"])} m\u00b2</text>')
        add("</g>")
    add("</g>")

    add('<g id="labels">')
    for rd in g["roads"]:
        b = rd["band"]
        cx, cy = round((b[0] + b[2]) / 2, 2), round((b[1] + b[3]) / 2, 2)
        rot = f' transform="rotate({rd["rotate"]} {cx} {cy})"' if rd.get("rotate") else ""
        add(f'<text class="rl" x="{cx}" y="{cy + 1.2}"{rot}>{esc(rd["label"])}</text>')
    ox = round((o[0] + min(o[2], max(xs))) / 2, 2)
    add(f'<text class="ol" x="{ox}" y="327">{esc(g["osr"]["label"])}</text>')
    add(f'<text class="os" x="{ox}" y="336">{g["osr"]["areaSqm"]:,.2f} Sq.m</text>')
    q = g["existingRoad"]["quad"]
    ex, ey = round((q[0][0] + q[2][0]) / 2, 2), round((q[0][1] + q[2][1]) / 2 + 14, 2)
    add(f'<text class="rl" x="{ex}" y="{ey}" transform="rotate(-6 {ex} {ey})">'
        f'{esc(g["existingRoad"]["label"])}</text>')
    add("</g>")

    add('<g id="dimensions">')
    import math
    for d in g["dimensions"]:
        f, t = d["from"], d["to"]
        add(f'<line x1="{f[0]}" y1="{f[1]}" x2="{t[0]}" y2="{t[1]}" '
            f'stroke="{PALETTE["muted"]}" stroke-width="0.5" opacity="0.6"/>')
        rad = math.atan2(t[1] - f[1], t[0] - f[0])
        tx, ty = math.cos(rad + math.pi / 2) * 2.4, math.sin(rad + math.pi / 2) * 2.4
        for e in (f, t):
            add(f'<line x1="{e[0] - tx:.2f}" y1="{e[1] - ty:.2f}" '
                f'x2="{e[0] + tx:.2f}" y2="{e[1] + ty:.2f}" '
                f'stroke="{PALETTE["muted"]}" stroke-width="0.5" opacity="0.6"/>')
        mx, my = round((f[0] + t[0]) / 2, 2), round((f[1] + t[1]) / 2, 2)
        ang = math.degrees(rad)
        if ang > 90 or ang < -90:
            ang += 180
        add(f'<text class="dl" x="{mx}" y="{my - 2.6}" '
            f'transform="rotate({ang:.2f} {mx} {my})">{esc(d["label"])}</text>')
    add("</g>")

    # Scale bar, sized from the sheet's own overall dimension rather than the
    # stated 1:1000, so bar and callouts can never disagree.
    mpu = g.get("metresPerUnit")
    if mpu:
        half = 10 / mpu
        bx, by, bh = 46, 628, 2.6
        add('<g id="scalebar">')
        add(f'<rect x="{bx}" y="{by}" width="{half:.2f}" height="{bh}" fill="#1a1a1a"/>')
        add(f'<rect x="{bx + half:.2f}" y="{by}" width="{half:.2f}" height="{bh}" '
            f'fill="none" stroke="#1a1a1a" stroke-width="0.4"/>')
        for i in range(3):
            add(f'<text class="sl" x="{bx + half * i:.2f}" y="{by - 1.6}">{i * 10}</text>')
        add(f'<text class="sl" x="{bx + half:.2f}" y="{by + bh + 3.8}">metres</text>')
        add("</g>")

    # North point
    add('<g id="north" transform="translate(300 132)">')
    add('<polygon points="0,-14 4,4 0,1" fill="#1a1a1a"/>')
    add('<polygon points="0,-14 -4,4 0,1" fill="none" stroke="#1a1a1a" stroke-width="0.7"/>')
    add('<circle cx="0" cy="9" r="5" fill="none" stroke="#1a1a1a" stroke-width="0.7"/>')
    add('<text x="0" y="11" text-anchor="middle" '
        'font-family="Inter,Helvetica,Arial,sans-serif" font-size="6" font-weight="700" fill="#1a1a1a">N</text>')
    add("</g>")

    add("</svg>")
    return "\n".join(out)


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUT
    g = load()
    out.write_text(render(g), encoding="utf-8")
    print(f"wrote {out} ({len(g['plots'])} plots)")


if __name__ == "__main__":
    main()
    _ = re  # keep import for callers extending the parser
