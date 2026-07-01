/**
 * JAMIN — Auspicious Insights engine.
 *
 * A creative, POSITIVE-ONLY "fortune" reading for a property, meant to
 * celebrate the good vibrations of investing in land. Every output is
 * deterministic (seeded by the property's stable id) so the same plot always
 * shows the same reading — no randomness, fully unit-testable, no network, no DB.
 *
 * This is cultural / feel-good content, never a prediction or guarantee. By
 * design it never surfaces anything negative: all planets, elements and stars
 * are framed by their most auspicious quality.
 */

export type Planet =
  | 'Sun'
  | 'Moon'
  | 'Mars'
  | 'Mercury'
  | 'Jupiter'
  | 'Venus'
  | 'Saturn'
  | 'Rahu'
  | 'Ketu';

export interface FortuneInput {
  id: string;
  plotCode?: string | null;
  price?: number | null;
  project?: string | null;
  location?: string | null;
}

export interface Fortune {
  /** 84–99. A always-favourable "Prosperity Index". */
  score: number;
  /** Warm label for the score band. */
  band: string;
  planet: Planet;
  /** Sanskrit/graha name for flavour. */
  graha: string;
  /** Auspicious wealth combination (yoga). */
  yoga: string;
  /** One of the Pancha Bhoota (five elements). */
  element: string;
  /** Lucky gemstone aligned to the ruling planet. */
  gem: string;
  /** Favourable compass direction. */
  direction: string;
  /** Auspicious birth-star. */
  nakshatra: string;
  /** Prosperity number (Mulank), 1–9. */
  mulank: number;
  /** Lucky colour. */
  color: string;
  /** A short, positive blessing. */
  blessing: string;
  /** 3–4 positive talking points. */
  highlights: string[];
}

/** Deterministic 32-bit FNV-1a hash of a string → unsigned int. */
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pick<T>(list: readonly T[], seed: number): T {
  return list[seed % list.length];
}

const GRAHA: Record<Planet, string> = {
  Sun: 'Surya',
  Moon: 'Chandra',
  Mars: 'Mangal',
  Mercury: 'Budh',
  Jupiter: 'Guru (Brihaspati)',
  Venus: 'Shukra',
  Saturn: 'Shani',
  Rahu: 'Rahu',
  Ketu: 'Ketu',
};

const PLANET_GIFT: Record<Planet, string> = {
  Sun: 'radiant success, authority and a bright rise in status',
  Moon: 'peace of mind, a nurturing home and emotional wealth',
  Mars: 'courage, decisive action and strong property gains',
  Mercury: 'sharp business sense and quick, steady prosperity',
  Jupiter: 'wisdom, expansion and the abundant blessings of Lakshmi',
  Venus: 'comfort, luxury and harmonious family fortune',
  Saturn: 'discipline and lasting, well-rooted wealth',
  Rahu: 'bold ambition and welcome, unexpected windfalls',
  Ketu: 'contentment and quiet, hidden treasures',
};

const GEM: Record<Planet, string> = {
  Sun: 'Ruby (Manik)',
  Moon: 'Pearl (Moti)',
  Mars: 'Red Coral (Moonga)',
  Mercury: 'Emerald (Panna)',
  Jupiter: 'Yellow Sapphire (Pukhraj)',
  Venus: 'Diamond (Heera)',
  Saturn: 'Blue Sapphire (Neelam)',
  Rahu: 'Hessonite (Gomed)',
  Ketu: "Cat's Eye (Lehsunia)",
};

const PLANETS: readonly Planet[] = [
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
  'Rahu',
  'Ketu',
];

const YOGAS = [
  'Dhan Yoga — a combination for wealth',
  'Lakshmi Yoga — fortune and grace',
  'Gaja Kesari Yoga — fame and success',
  'Raj Yoga — royal, rising prosperity',
  'Kubera Yoga — treasure and abundance',
  'Budhaditya Yoga — intellect meets prosperity',
  'Chandra-Mangal Yoga — flowing financial gains',
] as const;

const ELEMENTS = [
  'Prithvi (Earth) — grounded, stable wealth',
  'Jala (Water) — a smooth flow of prosperity',
  'Agni (Fire) — energy, ambition and drive',
  'Vayu (Air) — fresh opportunity and movement',
  'Akasha (Ether) — limitless growth',
] as const;

const DIRECTIONS = [
  'North-East (Ishanya) — the corner of blessings',
  'North (Kubera) — the direction of wealth',
  'East (Surya) — sunrise, health and vitality',
] as const;

const NAKSHATRAS = [
  'Pushya — the most nourishing, fortune-bringing star',
  'Rohini — growth and blossoming',
  'Anuradha — friendship and success',
  'Hasta — skill and steady gains',
  'Revati — safe passage and prosperity',
  'Shravana — fame and good name',
  'Uttara Phalguni — patronage and comfort',
  'Ashwini — swift, auspicious new beginnings',
] as const;

const COLORS = [
  'Gold',
  'Saffron',
  'Emerald Green',
  'Royal Blue',
  'Ivory White',
  'Auspicious Red',
  'Silver',
] as const;

function bandFor(score: number): string {
  if (score >= 96) return 'Exceptionally Auspicious';
  if (score >= 92) return 'Highly Auspicious';
  if (score >= 88) return 'Blessed & Favourable';
  return 'Fortunate';
}

/** Reduce any number/string of digits to a single-digit Mulank (1–9). */
export function toMulank(raw: string | number): number {
  const digits = (String(raw).match(/\d/g) ?? []).map(Number);
  if (digits.length === 0) return 9; // graceful, still positive
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9) {
    sum = String(sum)
      .split('')
      .reduce((a, b) => a + Number(b), 0);
  }
  return sum === 0 ? 9 : sum;
}

const MULANK_GIFT: Record<number, string> = {
  1: 'leadership and a strong, independent start',
  2: 'harmony, partnership and a happy home',
  3: 'growth, optimism and Guru’s blessings',
  4: 'stability and a firm foundation',
  5: 'luck in business and quick prosperity',
  6: 'love, luxury and domestic bliss',
  7: 'peace, depth and spiritual richness',
  8: 'ambition rewarded with lasting success',
  9: 'energy, completion and abundant returns',
};

/**
 * Build a positive-only fortune reading for a property. Deterministic in `id`.
 */
export function propertyFortune(input: FortuneInput): Fortune {
  const base = hash(input.id || 'jamin');
  // Independent, decorrelated seeds from the base hash.
  const s = (salt: number) => hash(`${input.id}:${salt}:${base}`);

  const score = 84 + (s(1) % 16); // 84–99, always favourable
  const planet = pick(PLANETS, s(2));
  const yoga = pick(YOGAS, s(3));
  const element = pick(ELEMENTS, s(4));
  const direction = pick(DIRECTIONS, s(5));
  const nakshatra = pick(NAKSHATRAS, s(6));
  const color = pick(COLORS, s(7));
  const mulank = toMulank(`${input.plotCode ?? ''}${input.price ?? s(8)}`);

  const gem = GEM[planet];
  const graha = GRAHA[planet];

  const place = input.project || input.location || 'this land';
  const blessing = `Guided by ${graha}, ${place} carries ${PLANET_GIFT[planet]}.`;

  const highlights = [
    `${yoga} favours this plot.`,
    `Prosperity number ${mulank} brings ${MULANK_GIFT[mulank]}.`,
    `${element.split(' — ')[0]} energy supports those who invest here.`,
    `Aligned with ${direction.split(' — ')[0]} — a wealth-drawing direction.`,
  ];

  return {
    score,
    band: bandFor(score),
    planet,
    graha,
    yoga,
    element,
    gem,
    direction,
    nakshatra,
    mulank,
    color,
    blessing,
    highlights,
  };
}

/* ------------------------------------------------------------------ *
 * Personalisation — the buyer's Rashi (moon sign), always favourable.
 * ------------------------------------------------------------------ */

export interface Rashi {
  key: string;
  name: string; // Vedic name
  english: string; // familiar zodiac name
}

export const RASHIS: readonly Rashi[] = [
  { key: 'mesha', name: 'Mesha', english: 'Aries' },
  { key: 'vrishabha', name: 'Vrishabha', english: 'Taurus' },
  { key: 'mithuna', name: 'Mithuna', english: 'Gemini' },
  { key: 'karka', name: 'Karka', english: 'Cancer' },
  { key: 'simha', name: 'Simha', english: 'Leo' },
  { key: 'kanya', name: 'Kanya', english: 'Virgo' },
  { key: 'tula', name: 'Tula', english: 'Libra' },
  { key: 'vrishchika', name: 'Vrishchika', english: 'Scorpio' },
  { key: 'dhanu', name: 'Dhanu', english: 'Sagittarius' },
  { key: 'makara', name: 'Makara', english: 'Capricorn' },
  { key: 'kumbha', name: 'Kumbha', english: 'Aquarius' },
  { key: 'meena', name: 'Meena', english: 'Pisces' },
];

const RASHI_TRAIT: Record<string, string> = {
  mesha: 'bold pioneers who turn land into legacy',
  vrishabha: 'steady builders who love enduring assets',
  mithuna: 'quick minds who spot rising value early',
  karka: 'family-hearted owners who create warm homes',
  simha: 'natural leaders drawn to premium address',
  kanya: 'careful planners who invest with wisdom',
  tula: 'balance-seekers who value harmony and beauty',
  vrishchika: 'determined investors who commit fully',
  dhanu: 'optimists who grow wealth with vision',
  makara: 'disciplined achievers who build for the long run',
  kumbha: 'forward-thinkers who back tomorrow’s hotspots',
  meena: 'intuitive souls who feel a place’s good fortune',
};

/**
 * A positive compatibility note between a buyer's Rashi and a property's fortune.
 * Always encouraging — this feature only ever affirms.
 */
export function rashiHarmony(rashiKey: string, fortune: Fortune): string {
  const rashi = RASHIS.find((r) => r.key === rashiKey);
  const trait = RASHI_TRAIT[rashiKey] ?? 'fortunate owners';
  const name = rashi ? rashi.name : 'You';
  return `${name} natives are ${trait} — ${fortune.graha}'s energy here works beautifully in your favour.`;
}
