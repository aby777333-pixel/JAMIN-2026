/**
 * Muhurat — a light, positive-only helper that suggests auspicious days for
 * site visits, bookings and Griha Pravesh. This is traditional guidance (based
 * on favourable weekdays and festival days), never a substitute for a proper
 * panchang — the UI says so. Pure & testable: every function takes `from`.
 */

import { FESTIVALS } from './festivals';
import { panchang } from './panchang';

const WEEKDAY_BLESSING: Record<number, string> = {
  0: 'Surya’s day',
  1: 'Chandra’s day',
  2: 'Mangal’s day',
  3: 'Budh’s day',
  4: 'Guru’s day — most blessed for wealth',
  5: 'Shukra’s day',
  6: 'Shani’s day',
};

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const FESTIVAL_DATES = new Set(FESTIVALS.map((f) => f.date));

/** Is this a festival day (highest auspiciousness)? */
export function isFestivalDay(date: Date): boolean {
  return FESTIVAL_DATES.has(ymd(date));
}

/**
 * A generally-auspicious day, from the real panchang (tithi + nakshatra + vara)
 * or a festival. Festivals always count, even on an otherwise-quiet day.
 */
export function isAuspiciousDay(date: Date): boolean {
  return isFestivalDay(date) || panchang(date).auspicious;
}

/** A short, positive reason a day is auspicious (festival takes precedence). */
export function auspiciousNote(date: Date): string {
  const fest = FESTIVALS.find((f) => f.date === ymd(date));
  if (fest) return `${fest.name} — a specially auspicious day`;
  const p = panchang(date);
  return `${p.nakshatraName} nakshatra · ${p.tithiName} · ${WEEKDAY_BLESSING[p.vara]}`;
}

export interface AuspiciousDay {
  date: Date;
  label: string;
  note: string;
  festival: boolean;
}

/**
 * The next `count` auspicious days starting the day after `from`, festivals
 * flagged. Deterministic given `from`.
 */
export function nextAuspiciousDates(from: Date, count = 6): AuspiciousDay[] {
  const out: AuspiciousDay[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let guard = 0;
  while (out.length < count && guard < 120) {
    cursor.setDate(cursor.getDate() + 1);
    guard++;
    if (!isAuspiciousDay(cursor)) continue;
    const d = new Date(cursor);
    out.push({
      date: d,
      label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      note: auspiciousNote(d),
      festival: isFestivalDay(d),
    });
  }
  return out;
}
