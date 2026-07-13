import { describe, expect, it } from '@jest/globals';

import { parseVoiceQuery } from '@/features/buyer/voiceQuery';

const TYPES = [
  { id: 't-apt', name: 'Apartment' },
  { id: 't-villa', name: 'Villa' },
  { id: 't-plot', name: 'Residential Plot' },
];
const PROJECTS = [
  { id: 'p-greens', name: 'Jamin Greens' },
  { id: 'p-lake', name: 'Lakeview Estate' },
];

describe('parseVoiceQuery', () => {
  it('parses "under X lakhs" as a max budget', () => {
    const { filters } = parseVoiceQuery('villa under 50 lakhs', TYPES, PROJECTS);
    expect(filters.priceMax).toBe(5000000);
    expect(filters.propertyTypeId).toBe('t-villa');
  });

  it('parses crores and "above" as a min budget', () => {
    const { filters } = parseVoiceQuery('plots above 1.5 crore', TYPES, PROJECTS);
    expect(filters.priceMin).toBe(15000000);
    expect(filters.propertyTypeId).toBe('t-plot');
  });

  it('matches spoken synonyms (flat → Apartment, land → Plot)', () => {
    expect(parseVoiceQuery('a flat in the city', TYPES, PROJECTS).filters.propertyTypeId).toBe('t-apt');
    expect(parseVoiceQuery('agricultural land cheap', TYPES, PROJECTS).filters.propertyTypeId).toBe('t-plot');
  });

  it('matches project names and facing', () => {
    const { filters } = parseVoiceQuery('east facing plot in jamin greens', TYPES, PROJECTS);
    expect(filters.projectId).toBe('p-greens');
    expect(filters.facing).toBe('East');
  });

  it('prefers compound facings over plain ones', () => {
    expect(parseVoiceQuery('north east facing villa', TYPES, PROJECTS).filters.facing).toBe('North-East');
  });

  it('maps quality words to flags and sorts', () => {
    const { filters } = parseVoiceQuery('cheapest verified premium apartment', TYPES, PROJECTS);
    expect(filters.verifiedOnly).toBe(true);
    expect(filters.premiumOnly).toBe(true);
    expect(filters.sort).toBe('price_asc');
  });

  it('returns an empty summary when nothing matches', () => {
    const { summary } = parseVoiceQuery('hello how are you', TYPES, PROJECTS);
    expect(summary).toHaveLength(0);
  });

  it('parses an English budget range as min + max', () => {
    const { filters } = parseVoiceQuery('plots from 20 to 50 lakhs', TYPES, PROJECTS);
    expect(filters.priceMin).toBe(2000000);
    expect(filters.priceMax).toBe(5000000);
    expect(filters.propertyTypeId).toBe('t-plot');
  });

  it('parses the raw Malayalam transcript (range + type, no translation)', () => {
    // The exact phrase from the owner's device: "plots from 20 to 50 lakhs".
    const { filters } = parseVoiceQuery('ഒരു 20 തൊട്ട് 50 ലക്ഷം വരെ ഉള്ള പ്ലോട്ട്സ്', TYPES, PROJECTS);
    expect(filters.priceMin).toBe(2000000);
    expect(filters.priceMax).toBe(5000000);
    expect(filters.propertyTypeId).toBe('t-plot');
  });

  it('parses raw Hindi and Tamil phrases', () => {
    const hi = parseVoiceQuery('50 लाख तक का प्लॉट', TYPES, PROJECTS).filters;
    expect(hi.priceMax).toBe(5000000);
    expect(hi.propertyTypeId).toBe('t-plot');
    const ta = parseVoiceQuery('50 லட்சம் வரை வில்லா', TYPES, PROJECTS).filters;
    expect(ta.priceMax).toBe(5000000);
    expect(ta.propertyTypeId).toBe('t-villa');
  });

  it('normalizes Indic digits', () => {
    const { filters } = parseVoiceQuery('५० लाख का फ्लैट', TYPES, PROJECTS);
    expect(filters.priceMax).toBe(5000000);
    expect(filters.propertyTypeId).toBe('t-apt');
  });

  it('still parses "1.5 crore" as a single amount, not a range', () => {
    const { filters } = parseVoiceQuery('villa above 1.5 crore', TYPES, PROJECTS);
    expect(filters.priceMin).toBe(15000000);
    expect(filters.priceMax).toBeUndefined();
  });
});
