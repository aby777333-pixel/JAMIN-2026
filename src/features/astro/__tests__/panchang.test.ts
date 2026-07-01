import { describe, expect, it } from '@jest/globals';

import { NAKSHATRA_NAMES, panchang } from '@/features/astro/panchang';

describe('panchang (astronomical tithi/nakshatra/vara)', () => {
  it('is deterministic for a calendar day', () => {
    const a = panchang(new Date(2026, 6, 1, 9, 30));
    const b = panchang(new Date(2026, 6, 1, 18, 0));
    expect(a).toEqual(b); // time-of-day is normalised to the sunrise proxy
  });

  it('Diwali 2026-11-08 lands on Amavasya (new moon)', () => {
    const p = panchang(new Date(2026, 10, 8));
    // Robust across timezones — Chaturdashi/Amavasya boundary.
    expect([29, 30]).toContain(p.tithi);
    expect(p.paksha).toBe('Krishna');
  });

  it('always returns in-range, named values', () => {
    for (let i = 0; i < 40; i++) {
      const p = panchang(new Date(2026, 0, 1 + i * 9));
      expect(p.tithi).toBeGreaterThanOrEqual(1);
      expect(p.tithi).toBeLessThanOrEqual(30);
      expect(p.nakshatra).toBeGreaterThanOrEqual(1);
      expect(p.nakshatra).toBeLessThanOrEqual(27);
      expect(p.vara).toBeGreaterThanOrEqual(0);
      expect(p.vara).toBeLessThanOrEqual(6);
      expect(NAKSHATRA_NAMES).toContain(p.nakshatraName);
    }
  });

  it('sees a realistic number of new & full moons across a year', () => {
    let amavasya = 0;
    let purnima = 0;
    let prevT = panchang(new Date(2026, 0, 1)).tithi;
    for (let i = 1; i < 365; i++) {
      const t = panchang(new Date(2026, 0, 1 + i)).tithi;
      if (t === 30 && prevT !== 30) amavasya++;
      if (t === 15 && prevT !== 15) purnima++;
      prevT = t;
    }
    expect(amavasya).toBeGreaterThanOrEqual(11);
    expect(amavasya).toBeLessThanOrEqual(13);
    expect(purnima).toBeGreaterThanOrEqual(11);
    expect(purnima).toBeLessThanOrEqual(13);
  });
});
