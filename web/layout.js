/**
 * Jamin Bazaar — interactive DTCP plot selector.
 *
 * The plan is drawn from geometry traced out of the sanctioned approval drawing
 * (see scripts/extract-dtcp-layout.py). Coordinates are the drawing's own user
 * space, so nothing is re-drawn by eye and the plan can be diffed against the
 * legal sheet. Areas and sizes always come from the plot schedule, never from
 * these coordinates.
 *
 * The page renders from the embedded fallback immediately, then upgrades to
 * live availability from Supabase when the layout is published.
 */
(function () {
  'use strict';

  var SQFT = 10.7639; // 1 sq.m
  var G = window.JAMIN_LAYOUT; // embedded geometry + plot schedule
  var plots = [];
  var layout = null;
  var selected = null;
  var live = false;
  var sb = null;

  var el = function (id) { return document.getElementById(id); };
  var svgNS = 'http://www.w3.org/2000/svg';

  function make(tag, attrs, parent) {
    var n = document.createElementNS(svgNS, tag);
    for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // ── formatting ────────────────────────────────────────────────────────────
  function inr(n) {
    if (n === null || n === undefined || n === '') return null;
    var v = Number(n);
    if (!isFinite(v) || v <= 0) return null;
    return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
  function sqft(sqm) { return Math.round(Number(sqm) * SQFT).toLocaleString('en-IN'); }
  function titleCase(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'; }

  // ── plan rendering ────────────────────────────────────────────────────────
  var STATE_CLASS = {
    available: 'p-available', reserved: 'p-reserved', booked: 'p-booked',
    sold: 'p-sold', blocked: 'p-blocked',
  };

  function drawPlan() {
    var svg = el('plan');
    svg.setAttribute('viewBox', G.viewBox.join(' '));
    svg.innerHTML = '';

    var defs = make('defs', {}, svg);

    // soft elevation for the selected plot
    var f = make('filter', { id: 'lift', x: '-40%', y: '-40%', width: '180%', height: '180%' }, defs);
    make('feDropShadow', { dx: 0, dy: 1.2, stdDeviation: 1.6, 'flood-color': '#2f6bff', 'flood-opacity': 0.45 }, f);

    var vp = make('g', { id: 'viewport' }, svg);

    // ── ground: everything inside the sanctioned boundary that is not a plot
    //    or the OSR is road, exactly as the sheet colours it. Filling the
    //    boundary polygon directly (rather than clipping a rect to it) keeps
    //    this identical to the standalone SVG export.
    make('polygon', { points: ptsOf(G.boundary), class: 'road-fill' }, vp);
    make('polygon', { points: ptsOf(G.osr.polygon), class: 'osr-fill' }, vp);
    make('polygon', { points: ptsOf(G.osr.polygon), class: 'osr-line' }, vp);

    // existing public road, outside the site boundary
    make('polygon', {
      points: ptsOf(G.existingRoad.quad),
      class: 'existing-road',
    }, vp);

    // sanctioned site boundary
    make('polygon', {
      points: ptsOf(G.boundary),
      class: 'site-line',
    }, vp);

    // ── plots
    var gp = make('g', { id: 'plots' }, vp);
    plots.forEach(function (p) {
      var r = p.rect;
      var w = r[2] - r[0], h = r[3] - r[1];
      var g = make('g', {
        class: 'plot ' + (STATE_CLASS[p.status] || 'p-available'),
        'data-number': p.number,
        tabindex: 0,
        role: 'button',
        'aria-label': plotAria(p),
      }, gp);
      // The approval sheet clips its plot rectangles to the site boundary —
      // eight plots run past the edge and the drawing shows the boundary line
      // as their edge. Draw the clipped ring for those; the rest keep the
      // rounded rectangle.
      var shape = (G.plotShapes || {})[String(p.number)];
      if (shape && shape.clipped) {
        make('polygon', { points: ptsOf(shape.poly), class: 'plot-shape' }, g);
      } else {
        make('rect', { x: r[0], y: r[1], width: w, height: h, rx: 1.8, class: 'plot-shape' }, g);
      }
      var at = shape ? shape.at : [r[0] + w / 2, r[1] + h / 2];
      var cx = at[0], cy = at[1];
      // Plot number reads first; the sanctioned area sits under it the way a
      // surveyed sheet annotates each plot.
      make('text', { x: cx, y: cy - 0.8, class: 'plot-no', 'text-anchor': 'middle' }, g)
        .textContent = String(p.number);
      if (p.areaSqm) {
        // rounded on the plan so the annotation always fits inside the plot;
        // the exact schedule figure is in the detail sheet
        make('text', { x: cx, y: cy + 6, class: 'plot-area', 'text-anchor': 'middle' }, g)
          .textContent = Math.round(p.areaSqm) + ' m²';
      }
      make('title', {}, g).textContent =
        'Plot ' + p.number + ' · Block ' + p.block +
        (p.areaSqm ? ' · ' + p.areaSqm + ' Sq.m' : '') +
        (p.widthM && p.depthM ? ' · ' + p.widthM + ' × ' + p.depthM + ' m' : '');
      // state marks, placed off the label anchor so they stay inside a clipped plot
      if (p.status === 'booked') badge(g, cx, cy + 11, 'BOOKED');
      if (p.status === 'sold') badge(g, cx, cy + 11, 'SOLD');
      if (p.status === 'reserved') badge(g, cx, cy + 11, 'HELD');
      if (p.status === 'booked' || p.status === 'sold') lockIcon(g, cx, cy - 9.5);
      if (p.status === 'reserved') clockIcon(g, cx, cy - 9.5);
      g.addEventListener('click', function () { select(p.number); });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(p.number); }
      });
    });

    // ── road / OSR labels straight off the sheet
    var gl = make('g', { id: 'labels' }, vp);
    G.roads.forEach(function (rd) {
      var b = rd.band, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
      var t = make('text', { x: cx, y: cy + 1.2, class: 'road-label', 'text-anchor': 'middle' }, gl);
      if (rd.rotate) t.setAttribute('transform', 'rotate(' + rd.rotate + ' ' + cx + ' ' + cy + ')');
      t.textContent = rd.label;
    });
    var ox = (G.osr.rect[0] + Math.min(G.osr.rect[2], 296.54)) / 2;
    make('text', { x: ox, y: 327, class: 'osr-label', 'text-anchor': 'middle' }, gl).textContent = G.osr.label;
    make('text', { x: ox, y: 336, class: 'osr-sub', 'text-anchor': 'middle' }, gl)
      .textContent = G.osr.areaSqm.toLocaleString('en-IN') + ' Sq.m';

    var er = G.existingRoad.quad;
    var erx = (er[0][0] + er[2][0]) / 2, ery = (er[0][1] + er[2][1]) / 2 + 14;
    var ert = make('text', { x: erx, y: ery, class: 'road-label', 'text-anchor': 'middle' }, gl);
    ert.setAttribute('transform', 'rotate(-6 ' + erx + ' ' + ery + ')');
    ert.textContent = G.existingRoad.label;

    // ── overall dimensions from the sheet, with surveyor's end ticks
    var gd = make('g', { id: 'dims' }, vp);
    G.dimensions.forEach(function (d) {
      make('line', { x1: d.from[0], y1: d.from[1], x2: d.to[0], y2: d.to[1], class: 'dim-line' }, gd);
      var ang = Math.atan2(d.to[1] - d.from[1], d.to[0] - d.from[0]);
      // short ticks square to the run, so each callout reads as a measurement
      var tx = Math.cos(ang + Math.PI / 2) * 2.4, ty = Math.sin(ang + Math.PI / 2) * 2.4;
      [d.from, d.to].forEach(function (e) {
        make('line', { x1: e[0] - tx, y1: e[1] - ty, x2: e[0] + tx, y2: e[1] + ty, class: 'dim-line' }, gd);
      });
      var mx = (d.from[0] + d.to[0]) / 2, my = (d.from[1] + d.to[1]) / 2;
      var deg = ang * 180 / Math.PI;
      if (deg > 90 || deg < -90) deg += 180; // keep text upright
      var t = make('text', { x: mx, y: my - 2.6, class: 'dim-label', 'text-anchor': 'middle' }, gd);
      t.setAttribute('transform', 'rotate(' + deg.toFixed(2) + ' ' + mx + ' ' + my + ')');
      t.textContent = d.label;
    });

    drawScaleBar(vp);

    // ── amenity pins (admin-placeable; only what the sheet itself defines is seeded)
    var ga = make('g', { id: 'amenities' }, vp);
    (layout && layout.amenities ? layout.amenities : G.amenities || []).forEach(function (a) {
      if (!a.at) return;
      var g = make('g', { class: 'amenity' }, ga);
      make('circle', { cx: a.at[0], cy: a.at[1], r: 4.4, class: 'amenity-dot' }, g);
      make('text', { x: a.at[0], y: a.at[1] + 1.9, class: 'amenity-icon', 'text-anchor': 'middle' }, g)
        .textContent = a.kind === 'entrance' ? '⌂' : '❋';
      make('title', {}, g).textContent = a.label;
    });

    applyTransform();
  }

  function badge(g, cx, y, text) {
    make('text', { x: cx, y: y, class: 'plot-badge', 'text-anchor': 'middle' }, g).textContent = text;
  }
  function lockIcon(g, cx, cy) {
    make('rect', { x: cx - 2, y: cy - 0.6, width: 4, height: 3.2, rx: 0.7, class: 'plot-icon-fill' }, g);
    make('path', { d: 'M' + (cx - 1.2) + ' ' + (cy - 0.6) + ' v-1.1 a1.2 1.2 0 0 1 2.4 0 v1.1', class: 'plot-icon-line' }, g);
  }
  function clockIcon(g, cx, cy) {
    make('circle', { cx: cx, cy: cy + 0.9, r: 2, class: 'plot-icon-line' }, g);
    make('path', { d: 'M' + cx + ' ' + (cy - 0.3) + ' v1.2 h1.1', class: 'plot-icon-line' }, g);
  }
  function ptsOf(ring) {
    return ring.map(function (p) { return p.join(','); }).join(' ');
  }

  /**
   * Alternating 0-10-20 m bar, drawn in plan coordinates so it zooms with the
   * drawing — it always represents the same real distance, which is the whole
   * point of a scale bar. Length comes from the sheet's own overall dimension,
   * not from the stated 1:1000, so bar and callouts always agree.
   */
  function drawScaleBar(vp) {
    var mpu = G.metresPerUnit;
    if (!mpu) return;
    var g = make('g', { id: 'scalebar' }, vp);
    var half = 10 / mpu;              // 10 m in drawing units
    var x = 46, y = 628, h = 2.6;
    make('rect', { x: x, y: y, width: half, height: h, class: 'sb-fill' }, g);
    make('rect', { x: x + half, y: y, width: half, height: h, class: 'sb-empty' }, g);
    [0, half, half * 2].forEach(function (dx, i) {
      make('text', { x: x + dx, y: y - 1.6, class: 'sb-label', 'text-anchor': 'middle' }, g)
        .textContent = i * 10;
    });
    make('text', { x: x + half, y: y + h + 3.8, class: 'sb-label', 'text-anchor': 'middle' }, g)
      .textContent = 'metres';
  }
  function plotAria(p) {
    return 'Plot ' + p.number + ', block ' + p.block + ', ' + p.areaSqm + ' square metres, ' +
      (p.status === 'available' ? 'available' : p.status);
  }

  // ── zoom + pan ────────────────────────────────────────────────────────────
  var view = { k: 1, x: 0, y: 0 };
  function applyTransform() {
    var vp = el('plan').querySelector('#viewport');
    if (vp) vp.setAttribute('transform', 'translate(' + view.x + ' ' + view.y + ') scale(' + view.k + ')');
    var z = el('zoomLevel');
    if (z) z.textContent = Math.round(view.k * 100) + '%';
  }
  function zoomBy(factor, ox, oy) {
    var k = Math.min(8, Math.max(0.6, view.k * factor));
    var box = G.viewBox;
    if (ox === undefined) { ox = box[0] + box[2] / 2; oy = box[1] + box[3] / 2; }
    // keep the point under the cursor fixed
    view.x = ox - (ox - view.x) * (k / view.k);
    view.y = oy - (oy - view.y) * (k / view.k);
    view.k = k;
    applyTransform();
  }
  function resetView() { view = { k: 1, x: 0, y: 0 }; applyTransform(); }

  function bindPanZoom() {
    var svg = el('plan');
    var drag = null, pinch = null;

    function toLocal(evt) {
      var r = svg.getBoundingClientRect();
      var box = G.viewBox;
      // uniform scale, content centred (preserveAspectRatio="xMidYMid meet")
      var s = Math.min(r.width / box[2], r.height / box[3]);
      var ox = (r.width - box[2] * s) / 2, oy = (r.height - box[3] * s) / 2;
      return { x: (evt.clientX - r.left - ox) / s + box[0], y: (evt.clientY - r.top - oy) / s + box[1] };
    }

    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var pt = toLocal(e);
      zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, pt.x, pt.y);
    }, { passive: false });

    svg.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' && pinch) return;
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      var r = svg.getBoundingClientRect();
      var box = G.viewBox;
      var s = Math.min(r.width / box[2], r.height / box[3]);
      var dx = (e.clientX - drag.sx) / s, dy = (e.clientY - drag.sy) / s;
      if (Math.abs(dx) + Math.abs(dy) > 1.2) drag.moved = true;
      view.x = drag.vx + dx; view.y = drag.vy + dy;
      applyTransform();
    });
    ['pointerup', 'pointercancel'].forEach(function (evt) {
      svg.addEventListener(evt, function (e) {
        if (drag && drag.id === e.pointerId) {
          // suppress the click that follows a drag
          if (drag.moved) svg.classList.add('dragged');
          setTimeout(function () { svg.classList.remove('dragged'); }, 0);
          drag = null;
        }
      });
    });

    // pinch
    var pts = {};
    svg.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        pinch = { d: touchDist(e.touches), k: view.k };
      }
    }, { passive: true });
    svg.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinch) {
        e.preventDefault();
        var d = touchDist(e.touches);
        var k = Math.min(8, Math.max(0.6, pinch.k * (d / pinch.d)));
        view.k = k; applyTransform();
      }
    }, { passive: false });
    svg.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; }, { passive: true });
    function touchDist(t) {
      return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    }
    void pts;
  }

  // ── selection + detail ────────────────────────────────────────────────────
  function select(number) {
    if (el('plan').classList.contains('dragged')) return;
    var p = plots.filter(function (x) { return x.number === number; })[0];
    if (!p) return;
    selected = number;
    document.querySelectorAll('.plot').forEach(function (n) {
      n.classList.toggle('is-selected', Number(n.getAttribute('data-number')) === number);
    });
    renderDetail(p);
    el('sheet').classList.add('open');
    el('sheet').setAttribute('aria-hidden', 'false');
  }

  /** Walk to the neighbouring plot without closing the sheet. Wraps at the ends. */
  function step(delta) {
    if (!selected) return;
    var order = plots.map(function (p) { return p.number; }).sort(function (a, b) { return a - b; });
    var i = order.indexOf(selected);
    if (i === -1) return;
    select(order[(i + delta + order.length) % order.length]);
  }

  function closeSheet() {
    el('sheet').classList.remove('open');
    el('sheet').setAttribute('aria-hidden', 'true');
    document.querySelectorAll('.plot').forEach(function (n) { n.classList.remove('is-selected'); });
    selected = null;
  }

  function row(label, value) {
    if (value === null || value === undefined || value === '') value = '—';
    return '<div class="row"><span>' + label + '</span><b>' + value + '</b></div>';
  }

  function renderDetail(p) {
    var meta = layout || G;
    var price = inr(p.price), offer = inr(p.offerPrice), total = inr(p.totalCost);
    var statusLabel = { available: 'Available', reserved: 'On hold', booked: 'Booked', sold: 'Sold', blocked: 'Not released' }[p.status];

    var html = '';
    html += '<div class="sheet-head">';
    html += '<div><div class="eyebrow">Block ' + p.block + '</div><h2>Plot ' + p.number + '</h2></div>';
    html += '<div class="chip ' + STATE_CLASS[p.status] + '">' + statusLabel + '</div>';
    html += '</div>';

    html += '<div class="price-block">';
    if (offer && price) {
      html += '<div class="price">' + offer + '</div><div class="was">' + price + '</div>';
      var pct = Math.round((1 - Number(p.offerPrice) / Number(p.price)) * 100);
      if (pct > 0) html += '<div class="save">Save ' + pct + '%</div>';
    } else if (price) {
      html += '<div class="price">' + price + '</div>';
    } else {
      html += '<div class="price muted-price">Pricing on request</div>';
    }
    html += '</div>';

    // ── the sanctioned record. These fields come off the approved drawing, so
    //    they are always present even before the layout is priced.
    html += '<div class="sec-title">Plot record</div>';
    html += '<div class="grid2">';
    html += row('Plot number', String(p.number));
    html += row('Block', p.block);
    html += row('Area', p.areaSqm + ' Sq.m');
    html += row('Area (ft²)', sqft(p.areaSqm) + ' Sq.ft');
    html += row('Dimensions', p.widthM + ' m × ' + p.depthM + ' m');
    html += row('Perimeter', ((Number(p.widthM) + Number(p.depthM)) * 2).toFixed(1) + ' m');
    html += row('Facing', titleCase(p.facing));
    html += row('Road width', p.roadWidthM ? Number(p.roadWidthM).toFixed(2) + ' m' : '—');
    html += row('Corner plot', p.isCorner ? 'Yes' : 'No');
    html += row('Status', statusLabel);
    html += '</div>';
    html += '<div class="hint">Facing and corner status are read from the plan — they are not part of the DTCP approval.</div>';

    // ── money. A wall of dashes reads as "broken", so an unpriced plot gets an
    //    honest single statement instead of an empty table.
    if (Number(p.totalCost) > 0 || price) {
      html += '<div class="sec-title">Cost breakdown</div><div class="grid1">';
      html += row('Plot price', offer || price);
      html += row('Booking amount', inr(p.bookingAmount));
      html += row('Registration charges', inr(p.registrationCharges));
      html += row('Development charges', inr(p.developmentCharges));
      html += '<div class="row total"><span>Total cost</span><b>' + (total || '—') + '</b></div>';
      html += '</div>';
    } else {
      html += '<div class="sec-title">Cost</div>';
      html += '<div class="notice"><b>Pricing for this layout is not published yet.</b>' +
        'Every plot above is confirmed against the sanctioned drawing. Talk to the sales desk ' +
        'for the current rate, booking amount and registration charges on plot ' + p.number + '.</div>';
    }

    // EMI — indicative only, on the total cost
    if (p.totalCost > 0) {
      html += '<div class="sec-title">EMI calculator</div>';
      html += '<div class="emi">';
      html += '<label>Down payment <output id="emiDpOut">20%</output>';
      html += '<input type="range" id="emiDp" min="10" max="60" step="5" value="20"></label>';
      html += '<label>Interest <output id="emiRoOut">8.5%</output>';
      html += '<input type="range" id="emiRo" min="7" max="14" step="0.1" value="8.5"></label>';
      html += '<label>Tenure <output id="emiYrOut">20 yrs</output>';
      html += '<input type="range" id="emiYr" min="5" max="30" step="1" value="20"></label>';
      html += '<div class="emi-out">Approx. EMI <b id="emiVal">—</b><span>Indicative only — not an offer of finance.</span></div>';
      html += '</div>';
    }

    html += '<div class="sec-title">Approval</div><div class="grid1">';
    html += row('DTCP application', meta.approvalNo);
    html += row('Authority', meta.authority);
    html += row('Survey nos.', meta.surveyNos);
    html += row('Village / Taluk', (meta.village || '') + ' / ' + (meta.taluk || ''));
    html += '</div>';

    if (meta.landmarks && meta.landmarks.length) {
      html += '<div class="sec-title">Nearby</div><div class="tags">';
      meta.landmarks.forEach(function (l) {
        html += '<span class="tag">' + (l.name || l) + (l.distance ? ' · ' + l.distance : '') + '</span>';
      });
      html += '</div>';
    }

    html += '<div class="verified"><span class="tick">✓</span> Verified Jamin Partner listing</div>';

    // Actions — only shown when there is somewhere to go.
    html += '<div class="actions">';
    if (p.status === 'available') {
      html += '<button class="btn primary" id="bookBtn">Book now</button>';
    } else {
      html += '<button class="btn primary" disabled>' + statusLabel + '</button>';
    }
    html += '<button class="btn" id="shareBtn">Share</button>';
    html += '<button class="btn" id="qrBtn">QR</button>';
    html += '</div>';

    html += '<div class="actions wrap">';
    if (meta.brochureUrl) html += '<a class="btn ghost" href="' + meta.brochureUrl + '" target="_blank" rel="noopener">Brochure</a>';
    if (meta.mapsUrl) html += '<a class="btn ghost" href="' + meta.mapsUrl + '" target="_blank" rel="noopener">Google Maps</a>';
    if (meta.streetViewUrl) html += '<a class="btn ghost" href="' + meta.streetViewUrl + '" target="_blank" rel="noopener">Street view</a>';
    if (window.JAMIN_CONTACT && window.JAMIN_CONTACT.phone) {
      html += '<a class="btn ghost" href="tel:' + window.JAMIN_CONTACT.phone + '">Call</a>';
      html += '<a class="btn ghost" href="https://wa.me/' + window.JAMIN_CONTACT.whatsapp + '?text=' +
        encodeURIComponent('I am interested in Plot ' + p.number + ' at ' + (meta.name || 'the Edappadi layout')) +
        '" target="_blank" rel="noopener">WhatsApp</a>';
    }
    html += '</div>';

    var docs = (p.documents || []).concat(meta.documents || []);
    if (docs.length) {
      html += '<div class="sec-title">Documents</div><div class="tags">';
      docs.forEach(function (d) {
        html += '<a class="tag link" href="' + (d.url || '#') + '" target="_blank" rel="noopener">' + (d.name || 'Document') + '</a>';
      });
      html += '</div>';
    }

    var gal = p.media || [];
    if (gal.length) {
      html += '<div class="sec-title">Gallery</div><div class="gallery">';
      gal.forEach(function (m) {
        var u = typeof m === 'string' ? m : m.url;
        html += '<img loading="lazy" src="' + u + '" alt="Plot ' + p.number + '">';
      });
      html += '</div>';
    }

    html += '<div class="foot-note">Sizes and areas are quoted from the sanctioned plot schedule ' +
      '(application ' + (meta.approvalNo || '—') + '). Facing and corner status are read from the plan ' +
      'and are not part of the approval.</div>';

    el('sheetBody').innerHTML = html;
    wireDetail(p);
  }

  function wireDetail(p) {
    var book = el('bookBtn');
    if (book) book.addEventListener('click', function () { openBooking(p); });
    var share = el('shareBtn');
    if (share) share.addEventListener('click', function () { sharePlot(p); });
    var qr = el('qrBtn');
    if (qr) qr.addEventListener('click', function () { showQR(p); });

    if (p.totalCost > 0) {
      ['emiDp', 'emiRo', 'emiYr'].forEach(function (id) {
        var n = el(id);
        if (n) n.addEventListener('input', function () { calcEmi(p); });
      });
      calcEmi(p);
    }
  }

  function calcEmi(p) {
    var dp = Number(el('emiDp').value), ro = Number(el('emiRo').value), yr = Number(el('emiYr').value);
    el('emiDpOut').textContent = dp + '%';
    el('emiRoOut').textContent = ro.toFixed(1) + '%';
    el('emiYrOut').textContent = yr + ' yrs';
    var principal = Number(p.totalCost) * (1 - dp / 100);
    var r = ro / 12 / 100, n = yr * 12;
    var emi = r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    el('emiVal').textContent = inr(Math.round(emi)) + ' / mo';
  }

  function plotUrl(p) {
    return location.origin + location.pathname + '?plot=' + p.number;
  }
  function sharePlot(p) {
    var data = { title: 'Plot ' + p.number + ' — ' + ((layout || G).name || 'Edappadi Layout'), url: plotUrl(p) };
    if (navigator.share) navigator.share(data).catch(function () {});
    else {
      navigator.clipboard.writeText(data.url);
      toast('Link copied');
    }
  }
  function showQR(p) {
    var box = el('qrModal');
    el('qrTarget').innerHTML = '';
    el('qrCaption').textContent = 'Plot ' + p.number + ' · ' + ((layout || G).name || '');
    box.classList.add('open');
    // qrcodejs renders into the element it is given; if the CDN is blocked we
    // still show the link so the action is never a dead end.
    if (window.QRCode) {
      try {
        new window.QRCode(el('qrTarget'), {
          text: plotUrl(p), width: 220, height: 220,
          correctLevel: window.QRCode.CorrectLevel.M,
        });
      } catch (e) {
        el('qrTarget').textContent = plotUrl(p);
      }
    } else {
      el('qrTarget').textContent = plotUrl(p);
    }
  }

  // ── booking ───────────────────────────────────────────────────────────────
  function openBooking(p) {
    var amt = inr(p.bookingAmount) || 'as advised';
    el('bookBody').innerHTML =
      '<div class="book-plot">Plot ' + p.number + ' · Block ' + p.block + '</div>' +
      '<p class="book-q">Reserve this plot?</p>' +
      '<div class="book-amt"><span>Booking amount</span><b>' + amt + '</b></div>' +
      '<div class="sec-title">Payment method</div>' +
      '<div class="pay">' +
      '<label><input type="radio" name="pay" value="upi" checked> <span>UPI</span></label>' +
      '<label><input type="radio" name="pay" value="bank_transfer"> <span>Bank transfer</span></label>' +
      '<label><input type="radio" name="pay" value="net_banking"> <span>Net banking</span></label>' +
      '</div>' +
      '<p class="book-note">Jamin does not take card or gateway payments. Reserving holds the plot ' +
      'for you; you then transfer the booking amount and upload the receipt, and our team confirms it.</p>';
    el('bookConfirm').textContent = live ? 'Reserve plot' : 'Reserve in the app';
    el('bookModal').classList.add('open');
    el('bookModal').dataset.plot = p.number;
  }

  function confirmBooking() {
    var number = Number(el('bookModal').dataset.plot);
    var p = plots.filter(function (x) { return x.number === number; })[0];
    if (!p) return;
    var method = (document.querySelector('input[name=pay]:checked') || {}).value || 'bank_transfer';

    if (!live || !sb) {
      toast('Open the Jamin app to complete this reservation');
      el('bookModal').classList.remove('open');
      return;
    }
    el('bookConfirm').disabled = true;
    sb.rpc('reserve_layout_plot', { p_plot: p.id, p_method: method, p_note: null })
      .then(function (res) {
        el('bookConfirm').disabled = false;
        if (res.error) { toast(res.error.message); return; }
        el('bookModal').classList.remove('open');
        celebrate();
        toast('Held — reference ' + (res.data && res.data.bookingRef));
        refresh();
      })
      .catch(function () { el('bookConfirm').disabled = false; toast('Could not reserve — please try again'); });
  }

  function celebrate() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var wrap = el('confetti');
    wrap.innerHTML = '';
    var colors = ['#FD0001', '#FBBC15', '#1E9E5A', '#2F6BFF'];
    for (var i = 0; i < 60; i++) {
      var s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%';
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = (Math.random() * 0.35) + 's';
      s.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      wrap.appendChild(s);
    }
    wrap.classList.add('go');
    setTimeout(function () { wrap.classList.remove('go'); wrap.innerHTML = ''; }, 2600);
  }

  var toastTimer = null;
  function toast(msg) {
    var t = el('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }

  // ── filters, search, summary ──────────────────────────────────────────────
  function applyFilters() {
    var q = el('search').value.trim().toLowerCase();
    var facing = el('fFacing').value;
    var avail = el('fStatus').value;
    var corner = el('fCorner').checked;
    var maxBudget = Number(el('fBudget').value) || 0;
    var minArea = Number(el('fArea').value) || 0;
    var road = el('fRoad').value;

    var shown = 0;
    plots.forEach(function (p) {
      var node = document.querySelector('.plot[data-number="' + p.number + '"]');
      if (!node) return;
      var ok = true;
      if (q) {
        var hay = ('plot ' + p.number + ' block ' + p.block + ' ' + (p.price || '')).toLowerCase();
        ok = hay.indexOf(q) !== -1;
      }
      if (ok && facing) ok = p.facing === facing;
      if (ok && avail) ok = p.status === avail;
      if (ok && corner) ok = !!p.isCorner;
      if (ok && maxBudget) ok = Number(p.offerPrice || p.price || 0) > 0 && Number(p.offerPrice || p.price) <= maxBudget;
      if (ok && minArea) ok = Number(p.areaSqm) >= minArea;
      if (ok && road) ok = String(p.roadWidthM) === road;
      node.classList.toggle('dimmed', !ok);
      if (ok) shown++;
    });
    el('filterCount').textContent = shown + ' of ' + plots.length + ' plots';
  }

  function renderSummary() {
    var c = { total: plots.length, available: 0, reserved: 0, booked: 0, sold: 0, blocked: 0 };
    plots.forEach(function (p) { if (c[p.status] !== undefined) c[p.status]++; });
    var defs = [
      ['available', 'Available'], ['reserved', 'On hold'],
      ['booked', 'Booked'], ['sold', 'Sold'], ['blocked', 'Held back'],
    ];
    var html = '<div class="stat total"><b>' + c.total + '</b><span>Total plots</span></div>';
    defs.forEach(function (d) {
      html += '<div class="stat ' + STATE_CLASS[d[0]] + '"><b>' + c[d[0]] + '</b><span>' + d[1] + '</span></div>';
    });
    el('summary').innerHTML = html;
  }

  // ── data ──────────────────────────────────────────────────────────────────
  function fallbackPlots() {
    return G.plots.map(function (p) {
      return {
        id: null, number: p.number, block: p.block, rect: p.rect,
        widthM: p.widthM, depthM: p.depthM, areaSqm: p.areaSqm,
        facing: p.facing, isCorner: false,
        roadWidthM: ['A', 'B', 'C', 'D'].indexOf(p.block) >= 0 ? 9 : 12,
        status: 'available', price: null, offerPrice: null, bookingAmount: null,
        registrationCharges: 0, developmentCharges: 0, totalCost: 0,
        media: [], documents: [],
      };
    });
  }

  function refresh() {
    if (!sb) return Promise.resolve();
    return sb.rpc('layout_overview', { p_slug: G.slug }).then(function (res) {
      if (res.error || !res.data) return;
      live = true;
      layout = res.data.layout;
      plots = res.data.plots;
      el('liveDot').classList.add('on');
      el('liveLabel').textContent = 'Live availability';
      drawPlan();
      renderSummary();
      applyFilters();
      if (selected) {
        var p = plots.filter(function (x) { return x.number === selected; })[0];
        if (p) renderDetail(p);
      }
    }).catch(function () { /* stay on the embedded plan */ });
  }

  function subscribeLive() {
    if (!sb || !layout) return;
    sb.channel('layout-' + layout.id)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'layout_plots', filter: 'layout_id=eq.' + layout.id },
        function () { refresh(); })
      .subscribe();
  }

  // ── theme ─────────────────────────────────────────────────────────────────
  function initTheme() {
    var saved = localStorage.getItem('jamin-layout-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    el('themeBtn').addEventListener('click', function () {
      var order = ['light', 'dark', 'contrast'];
      var cur = document.documentElement.getAttribute('data-theme') || 'light';
      var next = order[(order.indexOf(cur) + 1) % order.length];
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('jamin-layout-theme', next);
      toast(next === 'contrast' ? 'High contrast' : next === 'dark' ? 'Dark mode' : 'Light mode');
    });
  }

  // ── boot ──────────────────────────────────────────────────────────────────
  function boot() {
    plots = fallbackPlots();
    el('layoutName').textContent = G.name || 'Edappadi — Poolavari Layout';
    el('layoutPlace').textContent = G.place || '';
    el('approvalNo').textContent = G.approvalNo || '';

    drawPlan();
    renderSummary();
    bindPanZoom();
    initTheme();

    el('zoomIn').addEventListener('click', function () { zoomBy(1.25); });
    el('zoomOut').addEventListener('click', function () { zoomBy(1 / 1.25); });
    el('zoomReset').addEventListener('click', resetView);
    el('fullBtn').addEventListener('click', function () {
      var s = el('stage');
      if (document.fullscreenElement) document.exitFullscreen();
      else if (s.requestFullscreen) s.requestFullscreen();
    });
    el('surveyToggle').addEventListener('change', function () {
      document.body.classList.toggle('survey', this.checked);
    });

    el('sheetClose').addEventListener('click', closeSheet);
    el('scrim').addEventListener('click', closeSheet);
    el('prevPlot').addEventListener('click', function () { step(-1); });
    el('nextPlot').addEventListener('click', function () { step(1); });
    el('bookCancel').addEventListener('click', function () { el('bookModal').classList.remove('open'); });
    el('bookConfirm').addEventListener('click', confirmBooking);
    el('qrClose').addEventListener('click', function () { el('qrModal').classList.remove('open'); });

    ['search', 'fFacing', 'fStatus', 'fBudget', 'fArea', 'fRoad'].forEach(function (id) {
      el(id).addEventListener('input', applyFilters);
      el(id).addEventListener('change', applyFilters);
    });
    el('fCorner').addEventListener('change', applyFilters);
    el('filterReset').addEventListener('click', function () {
      ['search', 'fBudget', 'fArea'].forEach(function (id) { el(id).value = ''; });
      ['fFacing', 'fStatus', 'fRoad'].forEach(function (id) { el(id).value = ''; });
      el('fCorner').checked = false;
      applyFilters();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (el('qrModal').classList.contains('open')) el('qrModal').classList.remove('open');
        else if (el('bookModal').classList.contains('open')) el('bookModal').classList.remove('open');
        else closeSheet();
      }
    });

    applyFilters();

    // upgrade to live data when the layout is published
    if (window.supabase && window.SUPABASE_URL) {
      sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
      refresh().then(subscribeLive);
    }

    var want = new URLSearchParams(location.search).get('plot');
    if (want) select(Number(want));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
