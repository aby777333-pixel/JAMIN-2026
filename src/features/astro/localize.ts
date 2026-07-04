import type { TFunction } from 'i18next';

import { RASHIS, type Fortune } from './engine';
import { FESTIVALS, type Festival } from './festivals';
import { panchang } from './panchang';

/**
 * Rebuilds a {@link Fortune} into the active language from its stable keys +
 * the `astro.engine.*` i18n templates. The engine stays the deterministic,
 * English-canonical source of truth (and its unit tests); this is a pure,
 * side-effect-free presentation layer. English falls through to strings that
 * mirror the engine exactly, so English output is identical to before.
 */
export interface LocalizedFortune {
  band: string;
  planetName: string;
  graha: string;
  yoga: string;
  elementName: string;
  gem: string;
  directionName: string;
  nakshatraName: string;
  color: string;
  blessing: string;
  highlights: string[];
}

export function localizeFortune(f: Fortune, t: TFunction): LocalizedFortune {
  const k = f.keys;
  const e = (path: string, opts?: Record<string, unknown>) =>
    t(`astro.engine.${path}`, opts ?? {}) as unknown as string;

  const planetName = e(`planet.${k.planet}.name`);
  const graha = e(`planet.${k.planet}.graha`);
  const gift = e(`planet.${k.planet}.gift`);
  const gem = e(`gem.${k.planet}`);
  const yoga = e(`yoga.${k.yoga}`);
  const elementName = e(`element.${k.element}`);
  const directionName = e(`direction.${k.direction}`);
  const nakshatraName = e(`nakshatra.${k.nakshatra}`);
  const color = e(`color.${k.color}`);
  const band = e(`band.${k.band}`);
  const place = k.placeIsFallback ? e('thisLand') : k.place;

  const blessing = e('blessing', { graha, place, gift });
  const highlights = [
    e('highlight.yoga', { yoga }),
    e('highlight.mulank', { n: k.mulank, gift: e(`mulank.${k.mulank}`) }),
    e('highlight.element', { element: elementName }),
    e('highlight.direction', { direction: directionName }),
  ];

  return { band, planetName, graha, yoga, elementName, gem, directionName, nakshatraName, color, blessing, highlights };
}

/** Stable i18n key for a festival: strip the year suffix ('diwali_2026' → 'diwali'). */
const festBaseKey = (key: string) => key.replace(/_\d{4}$/, '');

/** Festival name in the active language (DB-managed festivals fall back to their stored name). */
export function localizeFestivalName(f: Pick<Festival, 'key' | 'name'>, t: TFunction): string {
  return t(`astro.fest.${festBaseKey(f.key)}.name`, { defaultValue: f.name }) as unknown as string;
}

/** Festival blurb in the active language (falls back to the stored English blurb). */
export function localizeFestivalBlurb(f: Pick<Festival, 'key' | 'blurb'>, t: TFunction): string {
  return t(`astro.fest.${festBaseKey(f.key)}.blurb`, { defaultValue: f.blurb }) as unknown as string;
}

/**
 * Localized twin of muhurat's `auspiciousNote` — same logic, active language.
 * Nakshatra/tithi stay as Sanskrit proper nouns; the template + weekday
 * blessing translate. The engine (and its tests) remain English-canonical.
 */
export function localizeAuspiciousNote(date: Date, t: TFunction): string {
  const p2 = (n: number) => String(n).padStart(2, '0');
  const ymd = `${date.getFullYear()}-${p2(date.getMonth() + 1)}-${p2(date.getDate())}`;
  const fest = FESTIVALS.find((f) => f.date === ymd);
  if (fest) {
    return t('astro.muhurat.festivalNote', { name: localizeFestivalName(fest, t) }) as unknown as string;
  }
  const p = panchang(date);
  return t('astro.muhurat.dayNote', {
    nakshatra: p.nakshatraName,
    tithi: p.tithiName,
    weekday: t(`astro.muhurat.weekday.${p.vara}`) as unknown as string,
  }) as unknown as string;
}

/** Localized, always-affirming compatibility note for a buyer's Rashi. */
export function localizeRashiHarmony(rashiKey: string, f: Fortune, t: TFunction): string {
  const rashi = RASHIS.find((r) => r.key === rashiKey);
  const name = rashi
    ? (t(`astro.engine.rashiName.${rashiKey}`) as unknown as string)
    : (t('astro.engine.rashiYou') as unknown as string);
  const trait = t(`astro.engine.rashi.${rashiKey}`) as unknown as string;
  const graha = t(`astro.engine.planet.${f.keys.planet}.graha`) as unknown as string;
  return t('astro.engine.rashiHarmony', { name, trait, graha }) as unknown as string;
}
