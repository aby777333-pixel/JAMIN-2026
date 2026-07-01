/**
 * Panchang — real, on-device Hindu almanac (tithi · nakshatra · vara) computed
 * from astronomical Sun/Moon positions via `astronomy-engine` (pure JS, MIT, no
 * native deps, no network, no API key). This replaces the earlier weekday-only
 * heuristic with genuinely tithi-accurate auspiciousness.
 *
 * Still guidance, not a full muhurta: we evaluate at a sunrise-proxy (06:00
 * local) and use an approximate Lahiri ayanamsa, so the UI keeps advising users
 * to confirm the exact muhurat with a panchang/priest.
 */

import { EclipticGeoMoon, SunPosition } from 'astronomy-engine';

const norm360 = (x: number) => ((x % 360) + 360) % 360;

const TITHI_BASE = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami',
  'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
];

export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu',
  'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta',
  'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
];

const VARA_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Traditionally avoided tithis for auspicious activity: Rikta (4,9,14 each paksha),
// Ashtami (8,23) and Amavasya (30).
const AVOID_TITHI = new Set([4, 8, 9, 14, 19, 23, 24, 29, 30]);

// Nakshatras generally favoured for property, Griha Pravesh and buying.
const AUSPICIOUS_NAK = new Set([1, 4, 5, 7, 8, 12, 13, 14, 15, 17, 21, 22, 23, 24, 26, 27]);

// Weekdays traditionally favoured (Mon, Wed, Thu, Fri).
const FAVOURABLE_VARA = new Set([1, 3, 4, 5]);

/** Approximate Lahiri (Chitrapaksha) ayanamsa in degrees for a date. */
function lahiriAyanamsa(date: Date): number {
  const yrs = (date.getTime() - Date.UTC(2000, 0, 1)) / (365.25 * 86400000);
  return 23.853 + (50.2564 / 3600) * yrs; // ~24.2° around 2026 — within nakshatra tolerance
}

/** A sunrise-proxy instant (06:00 local) for the given calendar day. */
function referenceInstant(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 6, 0, 0, 0);
}

export type PanchangQuality = 'high' | 'good' | 'neutral';

export interface Panchang {
  tithi: number; // 1..30
  tithiName: string;
  paksha: 'Shukla' | 'Krishna';
  nakshatra: number; // 1..27
  nakshatraName: string;
  vara: number; // 0..6 (Sun..Sat)
  varaName: string;
  auspicious: boolean;
  quality: PanchangQuality;
}

function tithiName(tithi: number): string {
  if (tithi === 15) return 'Purnima';
  if (tithi === 30) return 'Amavasya';
  return TITHI_BASE[(tithi - 1) % 15];
}

/** Compute the panchang for a calendar day (evaluated at the sunrise proxy). */
export function panchang(date: Date): Panchang {
  const at = referenceInstant(date);
  const sunLon = SunPosition(at).elon;
  const moonLon = EclipticGeoMoon(at).lon;

  const elong = norm360(moonLon - sunLon);
  const tithi = Math.min(30, Math.floor(elong / 12) + 1); // 1..30
  const paksha: 'Shukla' | 'Krishna' = tithi <= 15 ? 'Shukla' : 'Krishna';

  const sidMoon = norm360(moonLon - lahiriAyanamsa(at));
  const nakshatra = Math.min(27, Math.floor(sidMoon / (360 / 27)) + 1); // 1..27

  const vara = at.getDay();

  const tithiOk = !AVOID_TITHI.has(tithi);
  const varaOk = FAVOURABLE_VARA.has(vara);
  const nakOk = AUSPICIOUS_NAK.has(nakshatra);
  const auspicious = tithiOk && (varaOk || nakOk);
  const quality: PanchangQuality = tithiOk && varaOk && nakOk ? 'high' : auspicious ? 'good' : 'neutral';

  return {
    tithi,
    tithiName: tithiName(tithi),
    paksha,
    nakshatra,
    nakshatraName: NAKSHATRA_NAMES[nakshatra - 1],
    vara,
    varaName: VARA_NAMES[vara],
    auspicious,
    quality,
  };
}
