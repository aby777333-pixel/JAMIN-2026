import type { PropertyFilters } from './types';

export interface NamedRow {
  id: string;
  name: string;
}

const FACINGS = ['North-East', 'North-West', 'South-East', 'South-West', 'North', 'South', 'East', 'West'];

/** Common spoken synonyms → property-type name fragments to match against the DB list. */
const TYPE_SYNONYMS: Record<string, string[]> = {
  apartment: ['apartment', 'flat'],
  villa: ['villa'],
  plot: ['plot', 'land', 'site'],
  farm: ['farm', 'agricultural'],
  commercial: ['commercial', 'shop', 'office'],
  house: ['house', 'home'],
};

/**
 * Parse a plain-English phrase ("villa under 50 lakhs in Jamin Greens, east
 * facing") into property filters. Pure + testable; matching is data-driven
 * against the live type/project lists — nothing hardcoded per site.
 */
export function parseVoiceQuery(
  english: string,
  types: NamedRow[],
  projects: NamedRow[],
): { filters: Partial<PropertyFilters>; summary: string[] } {
  const q = english.toLowerCase();
  const filters: Partial<PropertyFilters> = {};
  const summary: string[] = [];

  // Budget: "under 50 lakh", "below 1.2 crore", "above 30 lakhs".
  const money = q.match(/(\d+(?:[.,]\d+)?)\s*(crore|crores|cr|lakh|lakhs|lac|lacs)/);
  if (money) {
    const n = parseFloat(money[1].replace(',', '.'));
    const amount = Math.round(n * (money[2].startsWith('cr') ? 1e7 : 1e5));
    const before = q.slice(0, money.index ?? 0);
    if (/(above|over|more than|minimum|at least)\s*$/.test(before)) {
      filters.priceMin = amount;
      summary.push(`≥ ₹${n} ${money[2].startsWith('cr') ? 'Cr' : 'L'}`);
    } else {
      filters.priceMax = amount;
      summary.push(`≤ ₹${n} ${money[2].startsWith('cr') ? 'Cr' : 'L'}`);
    }
  }

  // Property type: match DB names directly, then spoken synonyms.
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
