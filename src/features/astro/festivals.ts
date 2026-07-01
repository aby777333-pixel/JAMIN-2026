/**
 * Auspicious festivals — traditionally favourable occasions for buying land,
 * gold and property in India (Akshaya Tritiya, Dhanteras, etc.). Dates are
 * best-effort for the current window; the UI always advises confirming the
 * exact muhurat with a panchang/priest, so small lunar-calendar drift is safe.
 *
 * Pure data + a pure selector (takes `from` so it stays testable).
 */

export interface Festival {
  key: string;
  name: string;
  /** Local date, YYYY-MM-DD. */
  date: string;
  blurb: string;
}

/** Curated, chronologically sorted. Extend yearly. */
export const FESTIVALS: Festival[] = [
  { key: 'guru_purnima_2026', name: 'Guru Purnima', date: '2026-07-29', blurb: 'A day of gratitude and new learning — a blessed time to begin ventures.' },
  { key: 'ganesh_chaturthi_2026', name: 'Ganesh Chaturthi', date: '2026-09-14', blurb: 'Lord Ganesha removes obstacles — auspicious for new beginnings and homes.' },
  { key: 'navratri_2026', name: 'Navratri begins', date: '2026-10-11', blurb: 'Nine nights of Shakti — a powerful, prosperous window for big decisions.' },
  { key: 'dussehra_2026', name: 'Dussehra (Vijayadashami)', date: '2026-10-20', blurb: 'Victory of good — one of the most auspicious days to start something new.' },
  { key: 'dhanteras_2026', name: 'Dhanteras', date: '2026-11-06', blurb: 'The day of Dhanvantari & Kubera — traditionally ideal for buying gold, land & property.' },
  { key: 'diwali_2026', name: 'Diwali · Lakshmi Puja', date: '2026-11-08', blurb: 'Invite Goddess Lakshmi home — a most fortunate time for wealth & new property.' },
  { key: 'makar_sankranti_2027', name: 'Makar Sankranti', date: '2027-01-14', blurb: 'The sun turns northward (Uttarayana) — an auspicious season for fresh starts.' },
  { key: 'ugadi_2027', name: 'Ugadi · Gudi Padwa', date: '2027-03-18', blurb: 'The traditional New Year — a favoured day for Griha Pravesh and investments.' },
  { key: 'akshaya_tritiya_2027', name: 'Akshaya Tritiya', date: '2027-05-18', blurb: 'The day of never-diminishing fortune — the most auspicious of all to buy land & gold.' },
];

function atMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function parseLocalDate(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day);
}

/** The nearest upcoming festival within `withinDays`, with days-until, else null. */
export function upcomingFestival(
  from: Date,
  withinDays = 45,
): (Festival & { inDays: number }) | null {
  const base = atMidnight(from);
  let best: (Festival & { inDays: number }) | null = null;
  for (const f of FESTIVALS) {
    const inDays = Math.round((atMidnight(parseLocalDate(f.date)) - base) / 86400000);
    if (inDays >= 0 && inDays <= withinDays && (!best || inDays < best.inDays)) {
      best = { ...f, inDays };
    }
  }
  return best;
}
