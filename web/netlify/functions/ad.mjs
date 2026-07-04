// Serves /ad/<slug> with per-ad Open Graph tags injected, so WhatsApp / social
// previews show the real flyer image (crawlers don't run the page JS). Falls back
// to the static ad.html untouched on any error. The page's own JS still runs for
// humans (the browser URL stays /ad/<slug>).
const SUPABASE_URL = 'https://oaqwnjgaypmuafvnfhxv.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcXduamdheXBtdWFmdm5maHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMDI2ODAsImV4cCI6MjA5Nzc3ODY4MH0.2tfyC3Z8Kzib8FdLjnE-z8m830PZUd9vfcWtDXIqp3E';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * WhatsApp drops link-preview thumbnails over ~600 KB, and our flyer PNGs
 * routinely exceed that. Serve crawlers a resized copy instead; the page
 * itself still shows the full PNG. Supabase's own image CDN (Pro image
 * transformations) resizes first-party with no cold third-party hop — the
 * weserv proxy stalled past WhatsApp's crawl timeout on first fetch, which
 * cached a preview-less card. weserv stays as fallback for non-Supabase URLs.
 */
const previewImage = (imageUrl) => {
  const u = String(imageUrl);
  if (u.includes('/storage/v1/object/public/')) {
    return u.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=900&quality=80';
  }
  return 'https://images.weserv.nl/?url=' + encodeURIComponent(u.replace(/^https?:\/\//, '')) + '&w=900&output=jpg&q=80';
};

export default async (request) => {
  const url = new URL(request.url);
  const slug = url.pathname.split('/').filter(Boolean).pop() || '';

  // Load the static template (a real file, served directly — not via this function).
  let html = '';
  try {
    html = await fetch(`${url.origin}/ad.html`).then((r) => r.text());
  } catch {
    /* ignore */
  }
  if (!html) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/html' } });

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/shared_ads?slug=eq.${encodeURIComponent(slug)}&select=image_url,place,agent_name&limit=1`,
      { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } },
    );
    const rows = await r.json();
    const ad = Array.isArray(rows) ? rows[0] : null;
    if (ad?.image_url) {
      const img = esc(previewImage(ad.image_url));
      const title = esc('JAMIN Properties — Real property' + (ad.place ? ` · ${ad.place}` : ''));
      const desc = esc(
        (ad.agent_name ? `${ad.agent_name} · ` : '') + "View this property's live photo, location & contact.",
      );
      html = html
        .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${img}" />`)
        .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${title}" />`)
        .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${desc}" />`)
        .replace('</head>', `<meta name="twitter:image" content="${img}" /></head>`);
    }
  } catch {
    /* serve unchanged — the template's JAMIN-logo og:image still previews */
  }

  // Always present, ad or not: canonical URL + site name (WhatsApp/FB renderers
  // are far more reliable with og:url; the template's logo og:image is the
  // fallback so every /ad link previews with JAMIN branding at minimum).
  html = html.replace(
    '</head>',
    `<meta property="og:url" content="${esc(`${url.origin}/ad/${slug}`)}" /><meta property="og:site_name" content="JAMIN Properties" /></head>`,
  );

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
};
