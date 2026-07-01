import type { TFunction } from 'i18next';

import { RASHIS, type Fortune } from './engine';

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
