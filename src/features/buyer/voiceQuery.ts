import type { PropertyFilters } from './types';

export interface NamedRow {
  id: string;
  name: string;
}

const FACINGS = ['North-East', 'North-West', 'South-East', 'South-West', 'North', 'South', 'East', 'West'];

/**
 * Common spoken synonyms → property-type name fragments to match against the
 * DB list. Each group mixes English AND native-script words (hi/bn/gu/ta/te/
 * kn/ml/mr/ur) so a raw transcript still matches when translation is skipped
 * or fails — the ENGLISH members double as the fragment matched against the
 * (English) DB type names.
 */
const TYPE_SYNONYMS: Record<string, string[]> = {
  apartment: ['apartment', 'flat', 'फ्लैट', 'अपार्टमेंट', 'ফ্ল্যাট', 'ફ્લેટ', 'ஃபிளாட்', 'ఫ్లాట్', 'ಫ್ಲಾಟ್', 'ഫ്ലാറ്റ്', 'അപ്പാർട്ട്', 'فلیٹ'],
  villa: ['villa', 'विला', 'ভিলা', 'વિલા', 'வில்லா', 'విల్లా', 'ವಿಲ್ಲಾ', 'വില്ല', 'ولا'],
  plot: ['plot', 'land', 'site', 'प्लॉट', 'जमीन', 'ज़मीन', 'প্লট', 'জমি', 'પ્લોટ', 'மனை', 'நிலம்', 'ப்ளாட்', 'ప్లాట్', 'స్థలం', 'ನಿವೇಶನ', 'ಪ್ಲಾಟ್', 'ಜಮೀನು', 'പ്ലോട്ട്', 'സ്ഥലം', 'پلاٹ', 'زمین'],
  farm: ['farm', 'agricultural', 'खेत', 'পোলং', 'વાડી', 'வயல்', 'பண்ணை', 'పొలం', 'ಹೊಲ', 'കൃഷി', 'کھیت'],
  commercial: ['commercial', 'shop', 'office', 'दुकान', 'দোকান', 'કોમર્શિયલ', 'கடை', 'కమర్షియల్', 'ಅಂಗಡಿ', 'കട', 'دکان'],
  house: ['house', 'home', 'घर', 'मकान', 'বাড়ি', 'ઘર', 'வீடு', 'ఇల్లు', 'ಮನೆ', 'വീട്', 'گھر', 'مکان'],
};

/** Money units — English + native scripts. Longer alternatives listed first. */
const CRORE_WORDS = ['crores', 'crore', 'करोड़', 'करोड', 'কোটি', 'કરોડ', 'ਕਰੋੜ', 'கோடி', 'కోటి', 'ಕೋಟಿ', 'കോടി', 'کروڑ', 'cr'];
const LAKH_WORDS = ['lakhs', 'lakh', 'lacs', 'lac', 'लाख', 'লাখ', 'লক্ষ', 'લાખ', 'ਲੱਖ', 'லட்சத்', 'லட்சம்', 'లక్షలు', 'లక్ష', 'ಲಕ್ಷ', 'ലക്ഷം', 'ലക്ഷത്തി', 'ലക്ഷ', 'لاکھ'];
const UNIT_RE = `(${[...CRORE_WORDS, ...LAKH_WORDS].join('|')})`;

/** "X to Y" separators across languages ("20 തൊട്ട് 50 ലക്ഷം", "20 से 50 लाख", "20-50 lakh"). */
const RANGE_SEP =
  '(?:\\s*[-–]\\s*|\\s+(?:to|and|se|തൊട്ട്|മുതൽ|से|থেকে|થી|முதல்|தொட்டு|నుంచి|నుండి|ರಿಂದ|سے)\\s+)';

const NUM = '(\\d+(?:[.,]\\d+)?)';

/** Indic-script digits → ASCII so numbers parse from raw transcripts. */
function normalizeDigits(s: string): string {
  const zeros = [0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x06f0, 0x0660];
  return s.replace(/[٠-٩۰-۹०-९০-৯੦-੯૦-૯୦-୯௦-௯౦-౯೦-೯൦-൯]/g, (ch) => {
    const c = ch.charCodeAt(0);
    for (const z of zeros) if (c >= z && c <= z + 9) return String(c - z);
    return ch;
  });
}

function toAmount(raw: string, unit: string): number {
  const n = parseFloat(raw.replace(',', '.'));
  const isCrore = CRORE_WORDS.includes(unit);
  return Math.round(n * (isCrore ? 1e7 : 1e5));
}

function unitLabel(unit: string): string {
  return CRORE_WORDS.includes(unit) ? 'Cr' : 'L';
}

/**
 * Parse a spoken phrase ("villa under 50 lakhs in Jamin Greens, east facing" —
 * or the raw native-script transcript) into property filters. Pure + testable;
 * type/project matching is data-driven against the live lists.
 */
export function parseVoiceQuery(
  english: string,
  types: NamedRow[],
  projects: NamedRow[],
): { filters: Partial<PropertyFilters>; summary: string[] } {
  const q = normalizeDigits(english).toLowerCase();
  const filters: Partial<PropertyFilters> = {};
  const summary: string[] = [];

  // Budget range first: "20 to 50 lakhs", "20 തൊട്ട് 50 ലക്ഷം", "20-50 lakh".
  const range = q.match(new RegExp(`${NUM}${RANGE_SEP}${NUM}\\s*${UNIT_RE}`));
  if (range) {
    const unit = range[3];
    filters.priceMin = toAmount(range[1], unit);
    filters.priceMax = toAmount(range[2], unit);
    summary.push(`₹${range[1]}–${range[2]} ${unitLabel(unit)}`);
  } else {
    // Single amount: "under 50 lakh", "above 1.2 crore" (default = max).
    const money = q.match(new RegExp(`${NUM}\\s*${UNIT_RE}`));
    if (money) {
      const unit = money[2];
      const amount = toAmount(money[1], unit);
      const before = q.slice(0, money.index ?? 0);
      if (/(above|over|more than|minimum|at least)\s*$/.test(before)) {
        filters.priceMin = amount;
        summary.push(`≥ ₹${money[1]} ${unitLabel(unit)}`);
      } else {
        filters.priceMax = amount;
        summary.push(`≤ ₹${money[1]} ${unitLabel(unit)}`);
      }
    }
  }

  // Property type: match DB names directly, then spoken synonyms (any script).
  const type =
    types.find((x) => q.includes(x.name.toLowerCase())) ??
    types.find((x) =>
      Object.values(TYPE_SYNONYMS).some(
        (syns) => syns.some((s) => q.includes(s)) && syns.some((s) => x.name.toLowerCase().includes(s)),
      ),
    );
  if (type) {
    filters.propertyTypeId = type.id;
    summary.push(type.name);
  }

  // Project: name mention.
  const project = projects.find((x) => x.name && q.includes(x.name.toLowerCase()));
  if (project) {
    filters.projectId = project.id;
    summary.push(project.name);
  }

  // Vastu facing (compound directions listed before plain ones).
  const facing = FACINGS.find(
    (f) => q.includes(f.toLowerCase().replace('-', ' ')) || q.includes(f.toLowerCase()),
  );
  if (facing) {
    filters.facing = facing;
    summary.push(`${facing} facing`);
  }

  if (/\b(verified)\b/.test(q)) {
    filters.verifiedOnly = true;
    summary.push('Verified');
  }
  if (/\b(premium|luxury)\b/.test(q)) {
    filters.premiumOnly = true;
    summary.push('Premium');
  }
  if (/\b(cheap|cheapest|lowest|budget)\b/.test(q)) {
    filters.sort = 'price_asc';
    summary.push('Price ↑');
  }
  if (/\b(new|newest|latest|recent)\b/.test(q)) {
    filters.sort = 'newest';
    summary.push('Newest');
  }

  return { filters, summary };
}
