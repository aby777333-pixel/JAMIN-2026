import { describe, expect, it } from '@jest/globals';

import { propertyFortune, rashiHarmony, RASHIS, toMulank } from '@/features/astro/engine';

describe('astro fortune engine (positive-only, deterministic)', () => {
  const input = { id: 'plot-abc-123', plotCode: 'JMN-24', price: 4500000, project: 'Green Meadows' };

  it('is deterministic — same id yields the same reading', () => {
    const a = propertyFortune(input);
    const b = propertyFortune({ ...input });
    expect(a).toEqual(b);
  });

  it('different properties can differ', () => {
    const a = propertyFortune({ id: 'alpha' });
    const b = propertyFortune({ id: 'beta' });
    // At least one facet should differ across distinct seeds.
    const differs =
      a.planet !== b.planet || a.yoga !== b.yoga || a.score !== b.score || a.direction !== b.direction;
    expect(differs).toBe(true);
  });

  it('score is always in the favourable 84–99 band', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'zzz', '12345', '']) {
      const f = propertyFortune({ id });
      expect(f.score).toBeGreaterThanOrEqual(84);
      expect(f.score).toBeLessThanOrEqual(99);
      expect(f.band.length).toBeGreaterThan(0);
    }
  });

  it('always returns complete, non-empty positive content', () => {
    const f = propertyFortune(input);
    expect(f.highlights.length).toBe(4);
    expect(f.blessing).toContain(f.graha);
    expect(f.gem.length).toBeGreaterThan(0);
    expect(f.mulank).toBeGreaterThanOrEqual(1);
    expect(f.mulank).toBeLessThanOrEqual(9);
  });

  it('handles a missing/empty id gracefully', () => {
    expect(() => propertyFortune({ id: '' })).not.toThrow();
  });

  it('toMulank reduces to a single digit 1–9', () => {
    expect(toMulank('24')).toBe(6);
    expect(toMulank('B-108')).toBe(9);
    expect(toMulank(4500000)).toBe(9);
    expect(toMulank('no-digits')).toBe(9);
    expect(toMulank('9')).toBe(9);
  });

  it('rashiHarmony affirms every rashi', () => {
    const f = propertyFortune(input);
    for (const r of RASHIS) {
      const note = rashiHarmony(r.key, f);
      expect(note).toContain(r.name);
      expect(note).toContain('favour');
    }
  });
});
