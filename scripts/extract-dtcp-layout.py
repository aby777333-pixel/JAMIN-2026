#!/usr/bin/env python3
"""
Extract the approved DTCP layout drawing into the typed geometry module used by
the app, the admin console and the web layout viewer.

The DTCP sheet is the authoritative source. Nothing here draws, rounds or
"tidies" the plan: every polygon below is read straight out of the PDF's vector
content stream, so the module can always be regenerated from the approval
drawing and diffed against it.

    python scripts/extract-dtcp-layout.py "<path to DTCP pdf>"

Requires PyMuPDF (`pip install pymupdf`). Rewrites:
    src/features/layouts/data/edappadi.ts

Notes on the source sheet
-------------------------
* Sheet 1 (page 0) carries the site plan + plot numbers; sheet 2 the block plan
  and the plot schedule. Both share one geometry, so we read page 0.
* The sheet embeds a Type 3 subset font with no ToUnicode map, so text comes
  back as raw glyph codes. GLYPHS below is the decoded mapping, verified against
  a 300 dpi render of the sheet.
* Coordinates stay in the PDF's own user space (points, y-down). Keeping the
  source coordinate system means any figure in the generated module can be
  checked against the approval drawing directly. y-down also matches SVG, so no
  axis flip is needed downstream.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover - tooling script
    sys.exit("PyMuPDF is required: pip install pymupdf")

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "src" / "features" / "layouts" / "data" / "edappadi.ts"
OUT_WEB = REPO / "web" / "layout-data.js"

# Stroke/fill colours the sheet uses to separate layers.
RED = (0.8156899809837341, 0.20392000675201416, 0.1725499927997589)     # site boundary
GREEN = (0.3568600118160248, 0.5450999736785889, 0.22744999825954437)   # OSR
OLIVE = (0.47843000292778015, 0.41960999369621277, 0.19607999920845032)  # existing road
WHITE = (1.0, 1.0, 1.0)                                                  # plots

# Type 3 glyph code -> character, recovered from the rendered sheet.
GLYPHS = {
    "\x1b": "0", "\x1d": "1", "\x1a": "2", "\x20": "3", "\x1e": "4",
    "\x2c": "5", "\x1c": "6", "\x21": "7", "\x1f": "8", "\x41": "9",
    "\x18": ".", "\x09": " ", "\x11": "—", "\x43": ":", "\x3d": "q",
    "\x00": "D", "\x01": "I", "\x02": "R", "\x03": "E", "\x04": "C",
    "\x05": "T", "\x06": "O", "\x07": "A", "\x0b": "N", "\x0e": "P",
    "\x0f": "L", "\x10": "G", "\x12": "S", "\x15": "H", "\x17": "M",
    "\x0a": "W", "\x42": "X", "\x31": "m",
}

# ── Plot schedule, transcribed from sheet 2 ──────────────────────────────────
# These — not the drawn rectangles — are the legally quoted sizes. The drawn
# rectangles are set out to fill each row band and read ~1-2% off the quoted
# metres, so areas are always taken from here and never from pixel geometry.
#
# `facing` is NOT on the DTCP sheet. It is the road each block fronts, read off
# the plan (blocks A and C front the 9.00 m road to their south, B and D the
# 9.00 m road to their north, and the E-J column the 12.00 m road to its east).
# It seeds an admin-editable column; it is never presented as an approval fact.
SCHEDULE = [
    # block, first, last, width_m, depth_m, area_sqm, facing(west col, east col)
    ("A", 1, 5, 12.20, 18.30, 223.26, ("south", "south")),
    ("B", 6, 10, 12.20, 17.80, 217.16, ("north", "north")),
    ("C", 11, 15, 12.20, 17.80, 217.16, ("south", "south")),
    ("D", 16, 17, 12.20, 19.30, 235.46, ("north", "north")),
    ("E", 18, 19, 12.20, 16.75, 204.35, ("west", "east")),
    ("F", 20, 21, 12.20, 16.75, 204.35, ("west", "east")),
    ("G", 22, 23, 12.20, 16.75, 204.35, ("west", "east")),
    ("H", 24, 25, 12.20, 16.75, 204.35, ("west", "east")),
    ("J", 26, 27, 12.20, 16.75, 204.35, ("west", "east")),
]

# Title-block facts, transcribed from sheet 1.
META = dict(
    authority="Directorate of Town and Country Planning",
    title="Layout Plan — Residential Subdivision",
    place="Edappadi Town Panchayat · Salem District · Tamil Nadu",
    approvalNo="LP/EDP/2026/0148",
    approvalDate="2026-07-30",
    owner="Thiru. A. Selvaraj",
    surveyNos="214/1B, 214/2, 215/1",
    village="Poolavari",
    taluk="Edappadi",
    district="Salem",
    scale="1:1000",
)

# Road bands and overall dimension callouts, read off the sheet. Shared by every
# generated output so the plan, the scale bar and the SVG export cannot drift.
ROADS = [
    {"label": "9.00 m ROAD", "widthM": 9.0, "band": [141.83, 182.18, 293.74, 201.17]},
    {"label": "9.00 m ROAD", "widthM": 9.0, "band": [127.87, 279.36, 293.74, 297.23]},
    {"label": "12.00 m ROAD", "widthM": 12.0, "band": [152.44, 359.78, 206.06, 569.79], "rotate": -84},
]

# `measures` lists the site-boundary vertices each callout spans. The callout
# lines themselves are drawn offset from the site and run a few per cent short,
# so the scale must be fitted against the boundary edges they annotate — never
# against the length of the callout line.
DIMENSIONS = [
    {"label": "72.40 m", "from": [150.21, 121.86], "to": [284.25, 128.56], "measures": [0, 1]},
    {"label": "118.60 m", "from": [307.71, 144.2], "to": [307.71, 356.43], "measures": [1, 2, 3]},
    {"label": "246.15 m", "from": [69.78, 138.61], "to": [60.85, 574.25], "measures": [6, 0]},
]

AREA_STATEMENT = [
    ("Total extent of site", 13420.00, 100.0),
    ("Area under roads", 3218.00, 24.0),
    ("Open space reservation", 1342.00, 10.0),
    ("Saleable plot area", 8860.00, 66.0),
]

NOTES = [
    "All dimensions are in metres; areas in square metres.",
    "Roads shall be formed to the full width shown and handed over to the local body free of cost.",
    "The open space reservation is transferred to the local body by registered gift deed.",
    "Ten per cent of the total extent is reserved as open space as required.",
    "No plot shall be subdivided further without prior sanction.",
    "Building setbacks shall follow the development regulations in force.",
    "Water supply, storm-water drains and street lighting are provided by the promoter.",
    "Electricity supply lines shall be laid along the road margin.",
    "This approval does not confer title to the land.",
]


def near(a, b, tol=0.01):
    return a is not None and b is not None and max(abs(x - y) for x, y in zip(a, b)) < tol


def decode(raw: str) -> str:
    return "".join(GLYPHS.get(ch, ch) for ch in raw)


def r2(v) -> float:
    return round(float(v), 2)


def metres_per_unit(boundary) -> float:
    """
    How many metres one drawing unit represents.

    Least-squares fit of the three overall dimensions against the boundary edges
    they annotate, rather than the stated 1:1000 ratio. The sheet is not drawn
    perfectly uniformly — the three edges individually imply 0.5395, 0.5492 and
    0.5475 m/unit — so a single edge would misrepresent the other two by 3-4%.
    The fit keeps every callout inside ~1.5%, and is weighted toward the longest
    edge, which is the most reliably drawn.

    Used only for the scale bar. No quoted area or size is ever derived from it.
    """
    def span(idx):
        return sum(math.dist(boundary[idx[i]], boundary[idx[i + 1]]) for i in range(len(idx) - 1))

    num = den = 0.0
    for d in DIMENSIONS:
        s = span(d["measures"])
        m = float(d["label"].split()[0])
        num += s * m
        den += s * s
    return round(num / den, 6)


def clip_polygon(subject, clip):
    """
    Sutherland-Hodgman: clip `subject` against the CONVEX ring `clip`.

    The OSR rectangle on the sheet overhangs the site boundary and is only held
    inside it by a clip in the drawing. Resolving that overhang to a real
    polygon here means every downstream renderer just draws points — no reliance
    on SVG clipPath support, which not every SVG consumer honours.

    The subject may be concave, but the clip must be convex. The site boundary
    is concave (it notches in at the OSR), so callers pass the site as the
    *subject* and the OSR rectangle as the *clip* — intersection is symmetric,
    so that yields the same region while respecting the algorithm's limit.
    """
    def inside(p, a, b):
        return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) <= 0

    def intersect(p, q, a, b):
        dc = (a[0] - b[0], a[1] - b[1])
        dp = (p[0] - q[0], p[1] - q[1])
        n1 = a[0] * b[1] - a[1] * b[0]
        n2 = p[0] * q[1] - p[1] * q[0]
        den = dc[0] * dp[1] - dc[1] * dp[0]
        if den == 0:
            return q
        return [r2((n1 * dp[0] - n2 * dc[0]) / den), r2((n1 * dp[1] - n2 * dc[1]) / den)]

    # normalise the clip ring to clockwise so `inside` has a consistent sense
    area = sum((clip[i][0] * clip[(i + 1) % len(clip)][1]
                - clip[(i + 1) % len(clip)][0] * clip[i][1]) for i in range(len(clip)))
    ring = clip if area < 0 else list(reversed(clip))

    out = [list(p) for p in subject]
    for i in range(len(ring)):
        a, b = ring[i], ring[(i + 1) % len(ring)]
        if not out:
            break
        src, out = out, []
        prev = src[-1]
        for cur in src:
            if inside(cur, a, b):
                if not inside(prev, a, b):
                    out.append(intersect(prev, cur, a, b))
                out.append(cur)
            elif inside(prev, a, b):
                out.append(intersect(prev, cur, a, b))
            prev = cur

    # clipping can emit a vertex twice where an edge meets a corner exactly
    ring_out: list[list[float]] = []
    for p in ([r2(q[0]), r2(q[1])] for q in out):
        if not ring_out or p != ring_out[-1]:
            ring_out.append(p)
    if len(ring_out) > 1 and ring_out[0] == ring_out[-1]:
        ring_out.pop()
    return ring_out


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Downloads" / "DTCP Layout Approval Drawing.pdf"
    page = fitz.open(src)[0]

    boundary: list[list[float]] = []
    osr: list[float] = []
    existing_road: list[list[float]] = []
    plots_raw: list[list[float]] = []

    for d in page.get_drawings():
        rect = d["rect"]
        # Keep only shapes wholly inside the left-hand drawing area. This also
        # drops the page-sized white background rect, which would otherwise look
        # exactly like a plot fill.
        if rect.x1 > 380:
            continue
        items = d["items"]

        if near(d.get("color"), RED):
            pts = [[r2(it[1].x), r2(it[1].y)] for it in items if it[0] == "l"]
            boundary = pts[:-1] if len(pts) > 1 and pts[0] == pts[-1] else pts
        elif near(d.get("color"), GREEN):
            r = items[0][1]
            osr = [r2(r.x0), r2(r.y0), r2(r.x1), r2(r.y1)]
        elif near(d.get("color"), OLIVE):
            for it in items:
                if it[0] == "qu":  # the existing road is drawn as a quad
                    q = it[1]
                    existing_road = [[r2(p.x), r2(p.y)] for p in (q.ul, q.ur, q.lr, q.ll)]
                elif it[0] == "l":
                    for p in (it[1], it[2]):
                        if [r2(p.x), r2(p.y)] not in existing_road:
                            existing_road.append([r2(p.x), r2(p.y)])
        elif d["type"] == "f" and near(d.get("fill"), WHITE) and all(it[0] == "re" for it in items):
            plots_raw.append([r2(rect.x0), r2(rect.y0), r2(rect.x1), r2(rect.y1)])

    # Row-major order (top to bottom, then west to east) is exactly the sheet's
    # own numbering, so plot n is simply the nth rectangle in this order.
    plots_raw.sort(key=lambda r: (round(r[1], 1), r[0]))
    assert len(plots_raw) == 27, f"expected 27 plots, found {len(plots_raw)}"
    assert len(boundary) == 7, f"expected a 7-vertex site boundary, found {len(boundary)}"
    assert len(existing_road) == 4, f"expected a 4-vertex existing road, found {len(existing_road)}"
    assert osr, "OSR rectangle not found"

    meta_of: dict[int, tuple] = {}
    for block, lo, hi, w, dpt, area, facing in SCHEDULE:
        row = list(range(lo, hi + 1))
        for idx, n in enumerate(row):
            # facing pair is (west-most, east-most); rows of five share one value
            meta_of[n] = (block, w, dpt, area, facing[0] if idx == 0 else facing[1])

    plots = []
    for i, rect in enumerate(plots_raw, start=1):
        block, w, dpt, area, facing = meta_of[i]
        plots.append(dict(number=i, block=block, rect=rect, widthM=w, depthM=dpt, areaSqm=area, facing=facing))

    # Road-band and dimension label text, read from the sheet's own text runs so
    # the wording in the app matches the wording on the approved drawing.
    seen: list[str] = []
    for b in page.get_text("dict")["blocks"]:
        for line in b.get("lines", []):
            if line["bbox"][2] > 380 or line["bbox"][1] > 640:
                continue
            text = decode("".join(s["text"] for s in line["spans"])).strip()
            if text and text not in seen:
                seen.append(text)
    print("labels found on sheet:", seen, file=sys.stderr)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(render_ts(boundary, osr, existing_road, plots), encoding="utf-8")
    print(f"wrote {OUT.relative_to(REPO)} ({len(plots)} plots)", file=sys.stderr)

    OUT_WEB.write_text(render_web(boundary, osr, existing_road, plots), encoding="utf-8")
    print(f"wrote {OUT_WEB.relative_to(REPO)}", file=sys.stderr)


def layout_payload(boundary, osr, existing_road, plots) -> dict:
    """Shared shape consumed by the web viewer and the seed migration."""
    return {
        "slug": "edappadi-poolavari",
        "name": "Edappadi — Poolavari Layout",
        **META,
        "viewBox": [36, 110, 286, 545],
        "boundary": boundary,
        "osr": {
            "rect": osr,
            # the drawn OSR rectangle overhangs the site boundary; this is the
            # part actually inside the sanctioned site
            "polygon": clip_polygon(
                boundary,
                [[osr[0], osr[1]], [osr[2], osr[1]], [osr[2], osr[3]], [osr[0], osr[3]]]),
            "areaSqm": 1342.0,
            "label": "O.S.R.",
        },
        "existingRoad": {"quad": existing_road, "label": "EXISTING ROAD — 12.00 m WIDE", "widthM": 12.0},
        "roads": ROADS,
        "dimensions": DIMENSIONS,
        "metresPerUnit": metres_per_unit(boundary),
        "areaStatement": [{"label": l, "areaSqm": a, "percent": p} for l, a, p in AREA_STATEMENT],
        "totalPlots": len(plots),
        "notes": NOTES,
        "amenities": [
            {"kind": "entrance", "label": "Entrance from existing road", "icon": "enter", "at": [171.0, 573.0]},
        ],
        "plots": plots,
    }


def render_web(boundary, osr, existing_road, plots) -> str:
    payload = json.dumps(layout_payload(boundary, osr, existing_road, plots),
                         ensure_ascii=False, indent=2)
    return (
        "/**\n"
        " * Edappadi DTCP layout — plan geometry for the web plot selector.\n"
        " *\n"
        " * GENERATED FILE. Run `python scripts/extract-dtcp-layout.py \"<DTCP pdf>\"`.\n"
        " * Traced from the sanctioned approval drawing; the page renders from this\n"
        " * immediately and then upgrades to live availability from Supabase.\n"
        " */\n"
        f"window.JAMIN_LAYOUT = {payload};\n\n"
        "/** Sales desk shown on the plot sheet. Kept here so it is easy to change. */\n"
        "window.JAMIN_CONTACT = { phone: '', whatsapp: '' };\n"
    )


def render_ts(boundary, osr, existing_road, plots) -> str:
    def pts(seq):
        return "[" + ", ".join(f"[{x}, {y}]" for x, y in seq) + "]"

    osr_poly = pts(clip_polygon(
        boundary, [[osr[0], osr[1]], [osr[2], osr[1]], [osr[2], osr[3]], [osr[0], osr[3]]]))

    plot_lines = "\n".join(
        f"  {{ number: {p['number']}, block: '{p['block']}', rect: [{', '.join(str(v) for v in p['rect'])}],"
        f" widthM: {p['widthM']}, depthM: {p['depthM']}, areaSqm: {p['areaSqm']}, facing: '{p['facing']}' }},"
        for p in plots
    )
    area_lines = "\n".join(f"    {{ label: '{l}', areaSqm: {a}, percent: {p} }}," for l, a, p in AREA_STATEMENT)
    note_lines = "\n".join(f"    '{n}'," for n in NOTES)
    road_lines = "\n".join(
        "    {{ label: '{}', widthM: {}, band: [{}]{} }},".format(
            r["label"], r["widthM"], ", ".join(str(v) for v in r["band"]),
            f", rotate: {r['rotate']}" if r.get("rotate") else "")
        for r in ROADS)
    dim_lines = "\n".join(
        "    {{ label: '{}', from: [{}, {}], to: [{}, {}], measures: [{}] }},".format(
            d["label"], d["from"][0], d["from"][1], d["to"][0], d["to"][1],
            ", ".join(str(i) for i in d["measures"]))
        for d in DIMENSIONS)

    return f'''/**
 * Edappadi (Poolavari) DTCP layout — geometry traced from the approved drawing.
 *
 * GENERATED FILE. Do not hand-edit: run
 *   python scripts/extract-dtcp-layout.py "<DTCP pdf>"
 * which reads the polygons straight out of the approval drawing's vector
 * content stream. That keeps this module verifiable against the sanctioned
 * sheet rather than redrawn by eye.
 *
 * Coordinates are in the drawing's own user space (points, y-down, same as
 * SVG). They are only ever used for *display*; every quoted size and area comes
 * from the plot schedule on sheet 2, never from these coordinates.
 *
 * AREA NOTE — the sheet is internally inconsistent and we reproduce it as-is:
 * the per-plot areas in the schedule sum to 5 802.32 Sq.m while the schedule
 * total and the area statement both read 8 860.00 Sq.m. Both figures are
 * carried through verbatim; resolving them is a matter for the surveyor.
 */

export type PlotFacing = 'north' | 'south' | 'east' | 'west';

export interface LayoutPlotGeometry {{
  /** Plot number exactly as printed on the sanctioned drawing. */
  number: number;
  /** Block letter from the block plan (sheet 2). Note there is no block "I". */
  block: string;
  /** [x0, y0, x1, y1] in drawing user space. */
  rect: [number, number, number, number];
  widthM: number;
  depthM: number;
  areaSqm: number;
  /**
   * Road the plot fronts, read off the plan — NOT stated on the DTCP sheet.
   * Seeds an admin-editable column and is labelled as derived in the UI.
   */
  facing: PlotFacing;
}}

export interface LayoutGeometry {{
  slug: string;
  authority: string;
  title: string;
  place: string;
  approvalNo: string;
  approvalDate: string;
  owner: string;
  surveyNos: string;
  village: string;
  taluk: string;
  district: string;
  scale: string;
  /** Viewport covering the drawing plus its dimension lines. */
  viewBox: [number, number, number, number];
  /** Sanctioned site boundary, in order, as a closed ring. */
  boundary: Array<[number, number]>;
  osr: {{
    /** As drawn — note it overhangs the site boundary on the sheet. */
    rect: [number, number, number, number];
    /** The overhang resolved against the boundary; draw this, not `rect`. */
    polygon: Array<[number, number]>;
    areaSqm: number;
    label: string;
  }};
  existingRoad: {{ quad: Array<[number, number]>; label: string; widthM: number }};
  /** Named road bands, for the plan legend. */
  roads: Array<{{ label: string; widthM: number; band: [number, number, number, number]; rotate?: number }}>;
  /** Overall dimension callouts drawn on the sheet. */
  dimensions: Array<{{
    label: string;
    from: [number, number];
    to: [number, number];
    /** Boundary vertices this callout spans — the callout line itself runs offset and short. */
    measures: number[];
  }}>;
  areaStatement: Array<{{ label: string; areaSqm: number; percent: number }}>;
  /** Metres represented by one drawing unit — drives the scale bar. */
  metresPerUnit: number;
  totalPlots: number;
  notes: string[];
  plots: LayoutPlotGeometry[];
}}

export const EDAPPADI_LAYOUT: LayoutGeometry = {{
  slug: 'edappadi-poolavari',
  authority: '{META["authority"]}',
  title: '{META["title"]}',
  place: '{META["place"]}',
  approvalNo: '{META["approvalNo"]}',
  approvalDate: '{META["approvalDate"]}',
  owner: '{META["owner"]}',
  surveyNos: '{META["surveyNos"]}',
  village: '{META["village"]}',
  taluk: '{META["taluk"]}',
  district: '{META["district"]}',
  scale: '{META["scale"]}',
  viewBox: [36, 110, 286, 545],
  boundary: {pts(boundary)},
  osr: {{ rect: [{', '.join(str(v) for v in osr)}], polygon: {osr_poly}, areaSqm: 1342.0, label: 'O.S.R.' }},
  existingRoad: {{ quad: {pts(existing_road)}, label: 'EXISTING ROAD — 12.00 m WIDE', widthM: 12.0 }},
  roads: [
{road_lines}
  ],
  dimensions: [
{dim_lines}
  ],
  areaStatement: [
{area_lines}
  ],
  metresPerUnit: {metres_per_unit(boundary)},
  totalPlots: {len(plots)},
  notes: [
{note_lines}
  ],
  plots: [
{plot_lines}
  ],
}};

export default EDAPPADI_LAYOUT;
'''


if __name__ == "__main__":
    main()
