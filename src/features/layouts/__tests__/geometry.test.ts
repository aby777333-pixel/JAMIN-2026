import { describe, expect, it } from '@jest/globals';

import { EDAPPADI_LAYOUT as L } from '../data/edappadi';

/**
 * Guards the sanctioned Edappadi layout data.
 *
 * src/features/layouts/data/edappadi.ts is generated from the DTCP approval
 * drawing by scripts/extract-dtcp-layout.py. These assertions are the legal
 * facts off the sheet, so a bad re-extraction fails here rather than shipping a
 * plan that no longer matches the approval.
 */

// Plot schedule, sheet 2. Block letters skip "I" exactly as the sheet does.
const SCHEDULE: Array<[string, number[], number, number, number]> = [
  ['A', [1, 2, 3, 4, 5], 12.2, 18.3, 223.26],
  ['B', [6, 7, 8, 9, 10], 12.2, 17.8, 217.16],
  ['C', [11, 12, 13, 14, 15], 12.2, 17.8, 217.16],
  ['D', [16, 17], 12.2, 19.3, 235.46],
  ['E', [18, 19], 12.2, 16.75, 204.35],
  ['F', [20, 21], 12.2, 16.75, 204.35],
  ['G', [22, 23], 12.2, 16.75, 204.35],
  ['H', [24, 25], 12.2, 16.75, 204.35],
  ['J', [26, 27], 12.2, 16.75, 204.35],
];

describe('Edappadi DTCP layout', () => {
  it('carries the approval identity from the title block', () => {
    expect(L.approvalNo).toBe('LP/EDP/2026/0148');
    expect(L.scale).toBe('1:1000');
    expect(L.surveyNos).toBe('214/1B, 214/2, 215/1');
    expect(L.village).toBe('Poolavari');
    expect(L.taluk).toBe('Edappadi');
    expect(L.district).toBe('Salem');
  });

  it('has all 27 sanctioned plots, numbered 1..27 without gaps', () => {
    expect(L.plots).toHaveLength(27);
    expect(L.totalPlots).toBe(27);
    const numbers = L.plots.map((p) => p.number).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
  });

  it.each(SCHEDULE)('block %s matches the plot schedule', (block, members, w, d, area) => {
    const plots = L.plots.filter((p) => p.block === block);
    expect(plots.map((p) => p.number)).toEqual(members);
    for (const p of plots) {
      expect(p.widthM).toBe(w);
      expect(p.depthM).toBe(d);
      expect(p.areaSqm).toBe(area);
    }
  });

  it('reproduces the sheet area statement verbatim', () => {
    expect(L.areaStatement).toEqual([
      { label: 'Total extent of site', areaSqm: 13420, percent: 100 },
      { label: 'Area under roads', areaSqm: 3218, percent: 24 },
      { label: 'Open space reservation', areaSqm: 1342, percent: 10 },
      { label: 'Saleable plot area', areaSqm: 8860, percent: 66 },
    ]);
    // The OSR is 10% of the total extent, as the notes require.
    expect(L.osr.areaSqm).toBeCloseTo(13420 * 0.1, 2);
  });

  it('keeps the sheet’s own internal inconsistency rather than silently fixing it', () => {
    // The per-plot areas sum to 5 802.32 while the schedule total and the area
    // statement both read 8 860.00. Both figures are carried through as drawn;
    // resolving them is the surveyor's call, not ours.
    const sum = L.plots.reduce((t, p) => t + p.areaSqm, 0);
    expect(sum).toBeCloseTo(5802.32, 2);
    expect(sum).not.toBeCloseTo(8860, 2);
  });

  it('has a closed 7-vertex site boundary', () => {
    expect(L.boundary).toHaveLength(7);
    const [first] = L.boundary;
    const last = L.boundary[L.boundary.length - 1];
    expect(first).not.toEqual(last); // stored as an open ring
  });

  it('places every plot inside the site boundary', () => {
    for (const p of L.plots) {
      const [x0, y0, x1, y1] = p.rect;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      expect(pointInPolygon(cx, cy, L.boundary)).toBe(true);
    }
  });

  it('never overlaps two plots', () => {
    for (let i = 0; i < L.plots.length; i++) {
      for (let j = i + 1; j < L.plots.length; j++) {
        const a = L.plots[i].rect;
        const b = L.plots[j].rect;
        const overlapX = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
        const overlapY = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
        // shared edges are fine; real area overlap is not
        const overlaps = overlapX > 0.01 && overlapY > 0.01;
        expect(overlaps).toBe(false);
      }
    }
  });

  it('resolves the OSR overhang against the boundary', () => {
    // As drawn the OSR rectangle runs past the site edge; the stored polygon is
    // the part actually inside, so it must be narrower than the raw rect.
    const rectRight = L.osr.rect[2];
    const polyRight = Math.max(...L.osr.polygon.map((p) => p[0]));
    expect(polyRight).toBeLessThan(rectRight);
    for (const [x, y] of L.osr.polygon) {
      expect(pointInPolygon(x, y, L.boundary, true)).toBe(true);
    }
  });

  it('keeps the road widths that the sheet labels', () => {
    expect(L.roads.map((r) => r.widthM)).toEqual([9, 9, 12]);
    expect(L.existingRoad.widthM).toBe(12);
    expect(L.dimensions.map((d) => d.label)).toEqual(['72.40 m', '118.60 m', '246.15 m']);
  });
});

/** Ray casting. `onEdge` accepts points lying on the boundary itself. */
function pointInPolygon(
  x: number,
  y: number,
  poly: ReadonlyArray<readonly [number, number]>,
  onEdge = false,
): boolean {
  if (onEdge) {
    for (let i = 0; i < poly.length; i++) {
      const [x0, y0] = poly[i];
      const [x1, y1] = poly[(i + 1) % poly.length];
      const cross = (x1 - x0) * (y - y0) - (y1 - y0) * (x - x0);
      const within =
        Math.min(x0, x1) - 0.02 <= x && x <= Math.max(x0, x1) + 0.02 &&
        Math.min(y0, y1) - 0.02 <= y && y <= Math.max(y0, y1) + 0.02;
      if (Math.abs(cross) < 0.5 && within) return true;
    }
  }
  let inside = false;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    if (y0 > y !== y1 > y) {
      const xin = ((x1 - x0) * (y - y0)) / (y1 - y0) + x0;
      if (x < xin) inside = !inside;
    }
  }
  return inside;
}
