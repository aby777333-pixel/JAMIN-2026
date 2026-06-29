// Geo helpers for the AR plot-boundary overlay — project real lat/lng corner
// points onto the camera view using the device's GPS + compass heading.

export interface LatLng {
  lat: number;
  lng: number;
}

export function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Compass bearing (degrees, 0 = North, clockwise) from `from` to `to`. */
export function bearingDeg(from: LatLng, to: LatLng): number {
  const f1 = (from.lat * Math.PI) / 180;
  const f2 = (to.lat * Math.PI) / 180;
  const dl = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Offset a point by north/east metres. */
export function offsetMeters(center: LatLng, dN: number, dE: number): LatLng {
  const dLat = dN / 111320;
  const dLng = dE / (111320 * Math.cos((center.lat * Math.PI) / 180));
  return { lat: center.lat + dLat, lng: center.lng + dLng };
}

/** A square boundary (NW, NE, SE, SW) around a centre for a given area in m². */
export function squareBoundary(center: LatLng, areaSqm: number): LatLng[] {
  const side = Math.sqrt(Math.max(areaSqm, 1));
  const h = side / 2;
  return [
    offsetMeters(center, h, -h),
    offsetMeters(center, h, h),
    offsetMeters(center, -h, h),
    offsetMeters(center, -h, -h),
  ];
}

/** Signed angle (deg, -180..180) of a bearing relative to where the device points. */
export function relAngle(bearing: number, heading: number): number {
  let d = bearing - heading;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

const UNIT_TO_SQM: { test: (u: string) => boolean; f: number }[] = [
  { test: (u) => u.includes('acre'), f: 4046.86 },
  { test: (u) => u.includes('hectare'), f: 10000 },
  { test: (u) => u.includes('cent'), f: 40.4686 },
  { test: (u) => u.includes('ground'), f: 222.967 },
  { test: (u) => u.includes('guntha'), f: 101.17 },
  { test: (u) => u.includes('ankanam'), f: 6.689 },
  { test: (u) => u.includes('bigha'), f: 2529.28 },
  { test: (u) => u.includes('katha') || u.includes('kanal'), f: 505.857 },
  { test: (u) => u.includes('marla'), f: 25.2929 },
  { test: (u) => u.includes('yard') || u.includes('gaj'), f: 0.836127 },
  { test: (u) => u.includes('meter') || u.includes('sqm') || u.includes('sq m'), f: 1 },
];

/** Parse an admin/seller "Plot area" string (e.g. "2400 sq ft", "5 cents") → m². */
export function parseAreaSqm(text: unknown): number {
  if (text == null) return 0;
  const s = String(text).toLowerCase();
  const m = s.match(/([\d,.]+)/);
  if (!m) return 0;
  const num = parseFloat(m[1].replace(/,/g, ''));
  if (!Number.isFinite(num) || num <= 0) return 0;
  const unit = s.slice(m.index! + m[1].length).trim();
  const hit = UNIT_TO_SQM.find((u) => u.test(unit));
  const factor = hit ? hit.f : 0.092903; // default: square feet
  return num * factor;
}
