import { describe, expect, it } from '@jest/globals';

import { upcomingFestival } from '@/features/astro/festivals';
import { auspiciousNote, isAuspiciousDay, isFestivalDay, nextAuspiciousDates } from '@/features/astro/muhurat';
import { panchang } from '@/features/astro/panchang';

// Tithis traditionally avoided (Rikta, Ashtami, Amavasya) — mirrors panchang.ts.
const AVOID = new Set([4, 8, 9, 14, 19, 23, 24, 29, 30]);

describe('muhurat helper (panchang-driven, positive-only)', () => {
  it('recognises festival days as auspicious even on an off day', () => {
    // Diwali 2026-11-08 falls on Amavasya (an otherwise-avoided tithi).
    const diwali = new Date(2026, 10, 8);
    expect(isFestivalDay(diwali)).toBe(true);
    expect(isAuspiciousDay(diwali)).toBe(true);
    expect(auspiciousNote(diwali)).toContain('Diwali');
  });

  it('nextAuspiciousDates returns the requested count, all auspicious & in the future', () => {
    const from = new Date(2026, 6, 1);
    const days = nextAuspiciousDates(from, 6);
    expect(days.length).toBe(6);
    for (const d of days) {
      expect(d.date.getTime()).toBeGreaterThan(from.getTime());
      expect(isAuspiciousDay(d.date)).toBe(true);
      expect(d.note.length).toBeGreaterThan(0);
    }
  });

  it('non-festival auspicious days never fall on an avoided tithi', () => {
    const days = nextAuspiciousDates(new Date(2026, 6, 1), 12);
    for (const d of days) {
      if (!d.festival) {
        expect(AVOID.has(panchang(d.date).tithi)).toBe(false);
      }
    }
  });

  it('upcomingFestival finds the nearest festival within the window', () => {
    const f = upcomingFestival(new Date(2026, 6, 1), 45);
    expect(f).not.toBeNull();
    expect(f!.inDays).toBeGreaterThanOrEqual(0);
    expect(f!.inDays).toBeLessThanOrEqual(45);
  });

  it('upcomingFestival returns null when none is near', () => {
    const f = upcomingFestival(new Date(2026, 11, 1), 5);
    expect(f).toBeNull();
  });
});
