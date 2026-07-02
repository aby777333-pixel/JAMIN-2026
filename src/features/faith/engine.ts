/**
 * Faith & Culture engine — pure, deterministic helpers powering the
 * tradition-aware experience (SuperPrompt: we sell to every community).
 * No I/O here: everything is computable and unit-tested, mirroring the
 * astro/ module's engine+UI split. Positive-only framing throughout.
 */

export type Tradition = 'hindu' | 'muslim' | 'christian' | 'sikh' | 'jain' | 'other' | 'none';

export const TRADITIONS: { key: Tradition; label: string; icon: string }[] = [
  { key: 'hindu', label: 'Hindu', icon: 'flower' },
  { key: 'muslim', label: 'Muslim', icon: 'moon' },
  { key: 'christian', label: 'Christian', icon: 'add' },
  { key: 'sikh', label: 'Sikh', icon: 'sunny' },
  { key: 'jain', label: 'Jain', icon: 'leaf' },
  { key: 'other', label: 'Other', icon: 'sparkles' },
  { key: 'none', label: 'Prefer not to say', icon: 'happy' },
];

// ── Qibla ─────────────────────────────────────────────────────────────────────
/** The Kaaba, Makkah. */
const KAABA = { lat: 21.422487, lng: 39.826206 };

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Great-circle initial bearing (° from true north, 0–360) from a point to the Kaaba. */
export function qiblaBearing(lat: number, lng: number): number {
  const φ1 = rad(lat);
  const φ2 = rad(KAABA.lat);
  const Δλ = rad(KAABA.lng - lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

/** 16-point compass label for a bearing. */
export function compassPoint(bearing: number): string {
  return POINTS[Math.round(((bearing % 360) + 360) % 360 / 22.5) % 16];
}

// ── Hijri calendar (tabular / Kuwaiti algorithm, ±1 day) ─────────────────────
export const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi al-Awwal", "Rabi al-Thani", 'Jumada al-Awwal', 'Jumada al-Thani',
  'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhul Qa'dah", 'Dhul Hijjah',
];

export interface HijriDate {
  year: number;
  month: number; // 1..12
  day: number;
  monthName: string;
}

/** Gregorian → tabular Hijri (civil epoch). Good to ±1 day — fine for "blessed periods". */
export function toHijri(date: Date): HijriDate {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  // Gregorian → Julian day number
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn =
    d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  // Julian day → tabular Islamic (civil epoch 1948440)
  const days = jdn - 1948440 + 10632;
  const n = Math.floor((days - 1) / 10631);
  const r = days - 10631 * n + 354;
  const j =
    Math.floor((10985 - r) / 5316) * Math.floor((50 * r) / 17719) +
    Math.floor(r / 5670) * Math.floor((43 * r) / 15238);
  const r2 =
    r - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * r2) / 709);
  const day = r2 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day, monthName: HIJRI_MONTHS[month - 1] ?? '' };
}

// ── Easter (anonymous Gregorian computus) ────────────────────────────────────
/** Easter Sunday (UTC) for a Gregorian year. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const dd = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - dd - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const mth = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * mth + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * mth + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/** True while the date falls in Lent (Ash Wednesday … Holy Saturday). */
export function isLent(date: Date): boolean {
  const easter = easterSunday(date.getUTCFullYear());
  const ash = new Date(easter.getTime() - 46 * 864e5);
  return date.getTime() >= ash.getTime() && date.getTime() < easter.getTime();
}

// ── Fixed-date tables (major days; festivals table stays the editable source) ─
/** Sikh Gurpurabs & major days (lunar ones are best-known dates). */
const SIKH_DAYS: { date: string; name: string }[] = [
  { date: '2026-11-24', name: 'Guru Nanak Gurpurab' },
  { date: '2027-01-05', name: 'Guru Gobind Singh Jayanti' },
  { date: '2027-04-14', name: 'Vaisakhi' },
  { date: '2027-11-14', name: 'Guru Nanak Gurpurab' },
  { date: '2028-01-25', name: 'Guru Gobind Singh Jayanti' },
  { date: '2028-04-13', name: 'Vaisakhi' },
];

/** Paryushan windows (celebrations pause; resume joyfully after). */
const PARYUSHAN: { start: string; end: string }[] = [
  { start: '2026-09-08', end: '2026-09-15' },
  { start: '2027-08-28', end: '2027-09-04' },
  { start: '2028-09-15', end: '2028-09-22' },
];

const inWindow = (d: Date, start: string, end: string) => {
  const t = d.getTime();
  return t >= Date.parse(start + 'T00:00:00Z') && t <= Date.parse(end + 'T23:59:59Z');
};

// ── Blessed dates ─────────────────────────────────────────────────────────────
export interface BlessedDate {
  date: Date;
  reason: string;
}

const DAY = 864e5;

/**
 * Upcoming blessed/celebration-friendly dates for a tradition, from `from`.
 * Hindu is served by the existing Muhurat engine (AuspiciousDatesCard) — this
 * returns [] for it so callers embed that instead. Positive-only reasons.
 */
export function blessedDates(tradition: Tradition, from: Date, count = 6): BlessedDate[] {
  const out: BlessedDate[] = [];
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));

  if (tradition === 'muslim') {
    for (let i = 1; out.length < count && i <= 180; i++) {
      const d = new Date(start.getTime() + i * DAY);
      const h = toHijri(d);
      // Respectful pauses: first 10 days of Muharram and the fasting month.
      if ((h.month === 1 && h.day <= 10) || h.month === 9) continue;
      if (h.month === 10 && h.day === 1) {
        out.push({ date: d, reason: 'Eid-ul-Fitr — a day of joy and new beginnings' });
      } else if (h.month === 12 && h.day === 10) {
        out.push({ date: d, reason: 'Eid-ul-Adha — a blessed day of faith and sharing' });
      } else if (h.month === 3 && h.day === 12) {
        out.push({ date: d, reason: 'Milad-un-Nabi — a day of remembrance and blessings' });
      } else if (d.getUTCDay() === 5) {
        out.push({ date: d, reason: "Jumu'ah — the blessed Friday" });
      }
    }
    return out;
  }

  if (tradition === 'christian') {
    for (let i = 1; out.length < count && i <= 180; i++) {
      const d = new Date(start.getTime() + i * DAY);
      const easter = easterSunday(d.getUTCFullYear());
      if (d.getTime() === easter.getTime()) {
        out.push({ date: d, reason: 'Easter — the season of new life' });
        continue;
      }
      if (isLent(d)) continue; // celebrations resume after Lent
      const m = d.getUTCMonth() + 1;
      const day = d.getUTCDate();
      if ((m === 12 && day >= 24) || (m === 1 && day <= 6)) {
        out.push({ date: d, reason: 'Christmas season — joy upon every home' });
      } else if (d.getUTCDay() === 6 || d.getUTCDay() === 0) {
        out.push({ date: d, reason: 'A fine day for a house blessing' });
      }
    }
    return out;
  }

  if (tradition === 'sikh') {
    for (let i = 1; out.length < count && i <= 180; i++) {
      const d = new Date(start.getTime() + i * DAY);
      const iso = d.toISOString().slice(0, 10);
      const special = SIKH_DAYS.find((s) => s.date === iso);
      if (special) {
        out.push({ date: d, reason: `${special.name} — a day of the Guru's light` });
      } else if (d.getUTCDay() === 0) {
        out.push({ date: d, reason: 'Sangat day — every day the Guru blesses' });
      }
    }
    return out;
  }

  if (tradition === 'jain') {
    for (let i = 1; out.length < count && i <= 180; i++) {
      const d = new Date(start.getTime() + i * DAY);
      if (PARYUSHAN.some((w) => inWindow(d, w.start, w.end))) continue; // reflect now, celebrate after
      if (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
        out.push({ date: d, reason: 'An auspicious day for a peaceful beginning' });
      }
    }
    return out;
  }

  if (tradition === 'other' || tradition === 'none') {
    for (let i = 1; out.length < count && i <= 90; i++) {
      const d = new Date(start.getTime() + i * DAY);
      if (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
        out.push({ date: d, reason: 'A relaxed weekend day to celebrate your new home' });
      }
    }
    return out;
  }

  // hindu → the Muhurat engine (AuspiciousDatesCard) is the richer source.
  return out;
}

// ── Sacred places (no POI database needed — deep links from coordinates) ─────
export interface SacredPlaceLink {
  key: string;
  label: string;
  icon: string;
  url: string;
}

/** Google-Maps search links for places of worship near a property. */
export function sacredPlaceLinks(lat: number, lng: number): SacredPlaceLink[] {
  const near = (q: string) =>
    `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${lat},${lng},14z`;
  return [
    { key: 'temple', label: 'Temples', icon: 'flower', url: near('hindu temple') },
    { key: 'church', label: 'Churches', icon: 'add-circle', url: near('church') },
    { key: 'mosque', label: 'Mosques', icon: 'moon', url: near('mosque') },
    { key: 'gurdwara', label: 'Gurdwaras', icon: 'sunny', url: near('gurudwara') },
  ];
}
