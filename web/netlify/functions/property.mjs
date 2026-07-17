// Serves /p/<propertyId> with per-property Open Graph tags injected, so shared
// links (WhatsApp / Telegram / Facebook / X / LinkedIn / iMessage previews)
// show the property's primary photo — or the JAMIN logo when the listing has
// no photos yet. Mirrors ad.mjs: crawlers don't run page JS, so tags are
// injected server-side; humans still get the normal landing page.
const SUPABASE_URL = 'https://oaqwnjgaypmuafvnfhxv.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcXduamdheXBtdWFmdm5maHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMDI2ODAsImV4cCI6MjA5Nzc3ODY4MH0.2tfyC3Z8Kzib8FdLjnE-z8m830PZUd9vfcWtDXIqp3E';

const VIDEO_RE = /\.(mp4|mov|m4v|webm|3gp|mkv)(\?|#|$)/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// WhatsApp drops previews over ~600 KB — resize via Supabase's image CDN
// (first-party, no cold third-party hop; see ad.mjs for the full history).
const previewImage = (imageUrl) => {
  const u = String(imageUrl);
  if (u.includes('/storage/v1/object/public/')) {
    return u.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=900&quality=80';
  }
  return 'https://images.weserv.nl/?url=' + encodeURIComponent(u.replace(/^https?:\/\//, '')) + '&w=900&output=jpg&q=80';
};

/** properties.media holds strings or {url} objects; first non-video image wins. */
const firstImage = (media) => {
  if (!Array.isArray(media)) return null;
  for (const m of media) {
    const u = typeof m === 'string' ? m : m && typeof m === 'object' && m.url ? String(m.url) : null;
    if (u && !VIDEO_RE.test(u)) return u;
  }
  return null;
};

const inr = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? '₹' + n.toLocaleString('en-IN') : null;
};

export default async (request) => {
  const url = new URL(request.url);
  const id = url.pathname.split('/').filter(Boolean).pop() || '';

  // The landing page is the template; the browser URL stays /p/<id> for humans.
  let html = '';
  try {
    html = await fetch(`${url.origin}/index.html`).then((r) => r.text());
  } catch {
    /* ignore */
  }
  if (!html) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/html' } });

  // Branded fallback: every /p link previews with the JAMIN logo at minimum.
  let img = `${url.origin}/logo.jpg`;
  let title = 'JAMIN Properties — Signature for Fortune';
  let desc = 'View this property — details, photos & price on JAMIN Properties.';

  try {
    if (UUID_RE.test(id)) {
      // RLS-safe: property_share_preview (0107) exposes only preview fields
      // for approved, visible listings.
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/property_share_preview`, {
        method: 'POST',
        headers: {
          apikey: ANON,
          Authorization: `Bearer ${ANON}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ p_id: id }),
      });
      const p = await r.json();
      if (p && typeof p === 'object' && p.plot_code) {
        const photo = firstImage(p.media);
        if (photo) img = previewImage(photo);
        const where = [p.project, p.location].filter(Boolean).join(', ');
        title = ['JAMIN Properties', p.plot_code, where].filter(Boolean).join(' · ');
        const price = inr(p.price);
        desc =
          (price ? `${price} · ` : '') +
          'View details, photos & price. Book a free site visit — escrow-protected.';
      }
    }
  } catch {
    /* serve the branded fallback preview */
  }

  const IMG = esc(img);
  html = html
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(desc)}" />`)
    .replace(
      '</head>',
      `<meta property="og:image" content="${IMG}" />` +
        `<meta property="og:url" content="${esc(`${url.origin}/p/${id}`)}" />` +
        `<meta property="og:site_name" content="JAMIN Properties" />` +
        `<meta name="twitter:card" content="summary_large_image" />` +
        `<meta name="twitter:image" content="${IMG}" /></head>`,
    );

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
};
