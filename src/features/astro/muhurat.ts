/**
 * Muhurat — a light, positive-only helper that suggests auspicious days for
 * site visits, bookings and Griha Pravesh. This is traditional guidance (based
 * on favourable weekdays and festival days), never a substitute for a proper
 * panchang — the UI says so. Pure & testable: every function takes `from`.
 */

import { FESTIVALS } from './festivals';

/** Weekdays traditionally favoured for auspicious activity (Mon, Wed, Thu, Fri). */
const AUSPICIOUS_WEEKDAYS = new Set([1, 3, 4, 5]);

const WEEKDAY_BLESSING: Record<number, string> = {
  0: 'Sunday — Surya’s day, good for bold, confident steps',
  1: 'Monday — Chandra’s day, gentle and harmonious',
  2: 'Tuesday — Mangal’s day, strong energy for the determined',
  3: 'Wednesday — Budh’s day, excellent for deals & paperwork',
  4: 'Thursday — Guru’s day, most blessed for wealth & property',
  5: 'Friday — Shukra’s day, brings comfort and prosperity',
  6: 'Saturday — Shani’s day, best for patient, long-term decisions',
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

/** A generally-auspicious day: a favoured weekday or a festival. */
export function isAuspiciousDay(date: Date): boolean {
  return isFestivalDay(date) || AUSPICIOUS_WEEKDAYS.has(date.getDay());
}

/** A short, positive reason a day is auspicious (festival takes precedence). */
export function auspiciousNote(date: Date): string {
  const fest = FESTIVALS.find((f) => f.date === ymd(date));
  if (fest) return `${fest.name} — a specially auspicious day`;
  return WEEKDAY_BLESSING[date.getDay()];
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
