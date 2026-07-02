import { describe, expect, it } from '@jest/globals';

import {
  blessedDates,
  compassPoint,
  easterSunday,
  isLent,
  qiblaBearing,
  sacredPlaceLinks,
  toHijri,
} from '../engine';
import { BLESSING_CHECKLISTS } from '../checklists';

describe('qiblaBearing', () => {
  // Published qibla bearings (true north): Kochi ≈ 292–296°, Delhi ≈ 262–268°, Mumbai ≈ 278–284°.
  it('points WNW from Kochi', () => {
    const b = qiblaBearing(9.9312, 76.2673);
    expect(b).toBeGreaterThan(288);
    expect(b).toBeLessThan(300);
    expect(['W', 'WNW', 'NW']).toContain(compassPoint(b));
  });
  it('points W from Delhi', () => {
    const b = qiblaBearing(28.6139, 77.209);
    expect(b).toBeGreaterThan(258);
    expect(b).toBeLessThan(272);
  });
  it('points W from Mumbai', () => {
    const b = qiblaBearing(19.076, 72.8777);
    expect(b).toBeGreaterThan(275);
    expect(b).toBeLessThan(287);
  });
  it('is 0-360 everywhere', () => {
    const b = qiblaBearing(-33.8688, 151.2093); // Sydney
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe('toHijri (tabular, ±1 day)', () => {
  it('lands Ramadan 1445 around 11 Mar 2024', () => {
    const h = toHijri(new Date(Date.UTC(2024, 2, 12)));
    expect(h.year).toBe(1445);
    expect(h.month).toBe(9); // Ramadan
    expect(h.day).toBeLessThanOrEqual(3);
  });
  it('month names line up', () => {
    const h = toHijri(new Date(Date.UTC(2024, 2, 12)));
    expect(h.monthName).toBe('Ramadan');
  });
});

describe('easterSunday (exact computus)', () => {
  it.each([
    [2024, '2024-03-31'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2030, '2030-04-21'],
  ])('year %i → %s', (year, iso) => {
    expect(easterSunday(year as number).toISOString().slice(0, 10)).toBe(iso);
  });
  it('isLent true mid-Lent, false after Easter', () => {
    expect(isLent(new Date(Date.UTC(2027, 2, 1)))).toBe(true); // 1 Mar 2027 (Easter 28 Mar)
    expect(isLent(new Date(Date.UTC(2027, 3, 5)))).toBe(false);
  });
});

describe('blessedDates', () => {
  const from = new Date(Date.UTC(2026, 6, 2)); // 2 Jul 2026

  it('muslim: suggests Fridays with respectful reasons', () => {
    const out = blessedDates('muslim', from, 5);
    expect(out.length).toBe(5);
    expect(out.some((d) => d.reason.includes('Friday'))).toBe(true);
    out.forEach((d) => expect(d.date.getTime()).toBeGreaterThan(from.getTime()));
  });

  it('christian: skips Lent entirely', () => {
    const lentStart = new Date(Date.UTC(2027, 1, 12)); // inside Lent 2027 (Easter 28 Mar)
    const out = blessedDates('christian', lentStart, 3);
    // Nothing suggested before Easter Sunday.
    out.forEach((d) => {
      expect(d.date.getTime()).toBeGreaterThanOrEqual(easterSunday(2027).getTime());
    });
  });

  it('sikh: includes Gurpurab when in range', () => {
    const out = blessedDates('sikh', new Date(Date.UTC(2026, 10, 20)), 4);
    expect(out.some((d) => d.reason.includes('Gurpurab'))).toBe(true);
  });

  it('jain: skips Paryushan windows', () => {
    const out = blessedDates('jain', new Date(Date.UTC(2026, 8, 5)), 4); // 5 Sep 2026, Paryushan 8-15 Sep
    out.forEach((d) => {
      const iso = d.date.toISOString().slice(0, 10);
      expect(iso >= '2026-09-08' && iso <= '2026-09-15').toBe(false);
    });
  });

  it('hindu: defers to the Muhurat engine (empty here)', () => {
    expect(blessedDates('hindu', from, 4)).toEqual([]);
  });

  it('none: weekend suggestions', () => {
    const out = blessedDates('none', from, 3);
    expect(out.length).toBe(3);
    out.forEach((d) => expect([0, 6]).toContain(d.date.getUTCDay()));
  });
});

describe('sacredPlaceLinks', () => {
  it('builds all four faith links around the coordinates', () => {
    const links = sacredPlaceLinks(9.93, 76.27);
    expect(links.map((l) => l.key)).toEqual(['temple', 'church', 'mosque', 'gurdwara']);
    links.forEach((l) => {
      expect(l.url).toContain('9.93');
      expect(l.url).toContain('76.27');
      expect(l.url).toContain('google.com/maps/search');
    });
  });
});

describe('checklists', () => {
  it('every non-hindu tradition has a checklist with items', () => {
    (['muslim', 'christian', 'sikh', 'jain', 'other', 'none'] as const).forEach((t) => {
      const c = BLESSING_CHECKLISTS[t];
      expect(c).toBeTruthy();
      expect(c!.items.length).toBeGreaterThanOrEqual(4);
      c!.items.forEach((i) => expect(i.title.length).toBeGreaterThan(3));
    });
  });
});
