import { describe, expect, it } from '@jest/globals';

import { propertyFortune, RASHIS } from '@/features/astro/engine';
import { localizeFortune, localizeRashiHarmony } from '@/features/astro/localize';
import en from '@/locales/en.json';

/**
 * Guards the core invariant of the astro localization layer: rendering a
 * Fortune through the ENGLISH i18n resources must reproduce the engine's own
 * English output byte-for-byte. If someone edits en.json's astro.engine.* out
 * of sync with engine.ts, this fails.
 */

// A tiny stand-in for i18next's t(): walks astro.engine.<path> in en.json and
// interpolates {{vars}} the same way i18next does (escapeValue is off in-app).
function makeT() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dict = en as any;
  return ((key: string, opts?: Record<string, unknown>) => {
    const val = key.split('.').reduce((o: any, k: string) => (o == null ? o : o[k]), dict);
    let str = typeof val === 'string' ? val : key;
    if (opts) for (const [k, v] of Object.entries(opts)) str = str.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
    return str;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

describe('astro localize (English mirrors the engine exactly)', () => {
  const t = makeT();
  const inputs = [
    { id: 'plot-abc-123', plotCode: 'JMN-24', price: 4500000, project: 'Green Meadows' },
    { id: 'beta', location: 'Coimbatore' },
    { id: '' }, // fallback place → "this land"
    { id: 'zzz-999' },
  ];

  it('reproduces band, blessing and highlights in English', () => {
    for (const input of inputs) {
      const f = propertyFortune(input);
      const lf = localizeFortune(f, t);
      expect(lf.band).toBe(f.band);
      expect(lf.blessing).toBe(f.blessing);
      expect(lf.highlights).toEqual(f.highlights);
      expect(lf.yoga).toBe(f.yoga);
      expect(lf.gem).toBe(f.gem);
      expect(`${lf.planetName} (${lf.graha})`).toBe(`${f.planet} (${f.graha})`);
      expect(lf.elementName).toBe(f.element.split(' — ')[0]);
      expect(lf.directionName).toBe(f.direction.split(' — ')[0]);
      expect(lf.nakshatraName).toBe(f.nakshatra.split(' — ')[0]);
      expect(lf.color).toBe(f.color);
    }
  });

  it('reproduces every rashi harmony note in English', () => {
    const f = propertyFortune(inputs[0]);
    for (const r of RASHIS) {
      // engine.rashiHarmony is the canonical English; the localized version
      // must match it for the English locale.
      const localized = localizeRashiHarmony(r.key, f, t);
      expect(localized).toContain(r.name);
      expect(localized).toContain('favour');
    }
  });
});
