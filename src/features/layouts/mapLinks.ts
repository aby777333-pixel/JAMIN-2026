/**
 * Map, satellite, street view and Google Earth links for a layout.
 *
 * All four are derived from the layout's latitude/longitude using Google's
 * documented Maps URLs scheme, which needs no API key and no billing account —
 * the same approach the rest of the app takes for maps (OpenStreetMap in the
 * WebView, keyless Google links for hand-off to the native app).
 *
 * An admin can still paste an explicit URL per layout; that always wins, which
 * matters when the plot's own entrance is not what a coordinate lookup lands on.
 */

export interface LayoutLocation {
  latitude?: number | null;
  longitude?: number | null;
  mapsUrl?: string | null;
  streetViewUrl?: string | null;
}

export interface MapLinks {
  /** Standard map pin. */
  maps: string;
  /** Same pin, satellite basemap. */
  satellite: string;
  /** Street-level panorama nearest the pin. */
  streetView: string;
  /** Google Earth, tilted so the site reads in 3D. */
  earth: string;
  /** Keyless OpenStreetMap embed for showing the site inline. */
  embed: string;
}

/** Six decimals ≈ 0.1 m — more than enough, and keeps URLs tidy. */
function fix(v: number): string {
  return v.toFixed(6);
}

/**
 * Strict numeric read.
 *
 * `Number(null)` and `Number('')` are both 0, so a half-filled pin — latitude
 * set, longitude still blank — would otherwise produce a link to 0° longitude,
 * which is in the Atlantic. Anything not genuinely numeric is treated as unset.
 */
function coord(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Build the link set. Returns null when the layout has no coordinates yet, so
 * callers can simply hide the section rather than render dead buttons.
 */
export function mapLinks(loc: LayoutLocation | null | undefined): MapLinks | null {
  if (!loc) return null;
  const lat = coord(loc.latitude);
  const lng = coord(loc.longitude);
  if (lat === null || lng === null || (lat === 0 && lng === 0)) return null;

  const at = `${fix(lat)},${fix(lng)}`;
  // a ~350 m window either side, so the whole site sits in the embed
  const d = 0.0032;
  const bbox = [fix(lng - d), fix(lat - d), fix(lng + d), fix(lat + d)].join(',');

  return {
    maps: loc.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${at}`,
    satellite: `https://www.google.com/maps/@?api=1&map_action=map&center=${at}&zoom=18&basemap=satellite`,
    streetView: loc.streetViewUrl || `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${at}`,
    // 800 m up, 35° tilt — high enough to take in the layout and its approach road
    earth: `https://earth.google.com/web/@${at},0a,800d,35y,0h,45t,0r`,
    embed: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${at}`,
  };
}

/** Human-readable pin, for copy buttons and "share location" text. */
export function formatCoords(loc: LayoutLocation | null | undefined): string | null {
  if (!loc) return null;
  const lat = coord(loc.latitude);
  const lng = coord(loc.longitude);
  if (lat === null || lng === null || (lat === 0 && lng === 0)) return null;
  return `${fix(lat)}° ${lat >= 0 ? 'N' : 'S'}, ${fix(lng)}° ${lng >= 0 ? 'E' : 'W'}`;
}
