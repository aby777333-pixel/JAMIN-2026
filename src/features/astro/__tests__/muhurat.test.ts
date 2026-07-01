import { describe, expect, it } from '@jest/globals';

import { upcomingFestival } from '@/features/astro/festivals';
import { isAuspiciousDay, isFestivalDay, nextAuspiciousDates } from '@/features/astro/muhurat';

describe('muhurat helper (positive-only, deterministic)', () => {
  it('flags favourable weekdays (Mon/Wed/Thu/Fri) as auspicious', () => {
    // 2026-07-06 is a Monday.
    expect(isAuspiciousDay(new Date(2026, 6, 6))).toBe(true); // Mon
    expect(isAuspiciousDay(new Date(2026, 6, 8))).toBe(true); // Wed
    expect(isAuspiciousDay(new Date(2026, 6, 9))).toBe(true); // Thu
    expect(isAuspiciousDay(new Date(2026, 6, 10))).toBe(true); // Fri
    expect(isAuspiciousDay(new Date(2026, 6, 7))).toBe(false); // Tue
    expect(isAuspiciousDay(new Date(2026, 6, 11))).toBe(false); // Sat
  });

  it('recognises festival days as auspicious even on an off weekday', () => {
    // Diwali 2026-11-08 is a Sunday (normally not a favoured weekday).
    const diwali = new Date(2026, 10, 8);
    expect(isFestivalDay(diwali)).toBe(true);
    expect(isAuspiciousDay(diwali)).toBe(true);
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

  it('upcomingFestival finds the nearest festival within the window', () => {
    const f = upcomingFestival(new Date(2026, 6, 1), 45);
    expect(f).not.toBeNull();
    expect(f!.inDays).toBeGreaterThanOrEqual(0);
    expect(f!.inDays).toBeLessThanOrEqual(45);
  });

  it('upcomingFestival returns null when none is near', () => {
    // Far from any listed festival window.
    const f = upcomingFestival(new Date(2026, 11, 1), 5);
    expect(f).toBeNull();
  });
});
