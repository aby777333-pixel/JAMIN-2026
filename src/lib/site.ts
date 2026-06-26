/**
 * Public site base URL used for all shareable links (referral `/r/<code>`,
 * property `/p/<id>`, ad pages, business card QR).
 *
 * ⚠️ The custom domain `jaminproperties.co` has no live DNS yet, so links to it
 * fail (NXDOMAIN). Until it's registered + attached in Netlify, point at the
 * working Netlify domain so every shared link resolves. When the real domain is
 * live, change this ONE line.
 */
export const SITE_URL = 'https://wonderful-cupcake-0d3074.netlify.app';

/** Host only (no scheme) — for compact display, e.g. on the business card. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');
