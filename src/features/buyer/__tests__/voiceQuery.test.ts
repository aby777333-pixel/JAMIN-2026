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
});
