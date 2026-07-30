/**
 * HTML5 Canvas renderer for a sanctioned DTCP layout.
 *
 * Reference implementation — see docs/plot-layout/README.md. The shipped web
 * viewer uses SVG instead, because SVG stays crisp at any zoom while a canvas
 * bitmap has to be redrawn per scale (this renderer does exactly that, which is
 * why `draw()` is cheap enough to call on every zoom/pan frame).
 *
 * Usage:
 *   const r = new PlotLayoutCanvas(canvas, window.JAMIN_LAYOUT);
 *   r.setPlots(plots);              // [{ number, rect, status, id }]
 *   r.on('select', (plot) => ...);
 *   r.draw();
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlotLayoutCanvas = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STATE = {
    available: { fill: '#ffffff', stroke: '#1e9e5a', text: '#1e9e5a' },
    reserved: { fill: '#e6a10d', stroke: '#b4790a', text: '#ffffff', badge: 'HELD' },
    booked: { fill: '#fd0001', stroke: '#c70000', text: '#ffffff', badge: 'BOOKED' },
    sold: { fill: '#4a4a4a', stroke: '#2e2e2e', text: '#ffffff', badge: 'SOLD' },
    blocked: { fill: '#e6e7e2', stroke: '#74746e', text: '#74746e', dashed: true },
    selected: { fill: '#2f6bff', stroke: '#1b4fd8', text: '#ffffff' },
  };
  var GROUND = '#ececE8';
  var OSR = { fill: '#eef5ea', stroke: '#5b8c3a' };
  var SITE = '#d0402f';
  var EXISTING = { fill: '#f4efdc', stroke: '#7a6b32' };
  var MUTED = '#74746e';

  function PlotLayoutCanvas(canvas, geometry) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.geo = geometry;
    this.plots = [];
    this.selectedId = null;
    this.visible = null; // Set of ids, or null for "all"
    this.view = { k: 1, x: 0, y: 0 };
    this._handlers = {};
    this._bind();
  }

  PlotLayoutCanvas.prototype.on = function (evt, fn) {
    (this._handlers[evt] = this._handlers[evt] || []).push(fn);
    return this;
  };
  PlotLayoutCanvas.prototype._emit = function (evt, arg) {
    (this._handlers[evt] || []).forEach(function (f) { f(arg); });
  };

  PlotLayoutCanvas.prototype.setPlots = function (plots) { this.plots = plots || []; return this; };
  PlotLayoutCanvas.prototype.select = function (id) { this.selectedId = id; this.draw(); };
  PlotLayoutCanvas.prototype.setVisible = function (set) { this.visible = set; this.draw(); };

  /** Drawing user space -> device pixels. Honours devicePixelRatio for retina. */
  PlotLayoutCanvas.prototype._transform = function () {
    var vb = this.geo.viewBox;
    var dpr = window.devicePixelRatio || 1;
    var w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (this.canvas.width !== w * dpr || this.canvas.height !== h * dpr) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
    }
    // uniform scale, content centred — matches SVG preserveAspectRatio=xMidYMid meet
    var s = Math.min(w / vb[2], h / vb[3]) * this.view.k;
    return {
      s: s * dpr,
      ox: ((w - vb[2] * s / this.view.k * this.view.k) / 2 + this.view.x) * dpr,
      oy: ((h - vb[3] * s / this.view.k * this.view.k) / 2 + this.view.y) * dpr,
      vb: vb,
      dpr: dpr,
    };
  };

  PlotLayoutCanvas.prototype._toDevice = function (t, x, y) {
    return [t.ox + (x - t.vb[0]) * t.s, t.oy + (y - t.vb[1]) * t.s];
  };
  PlotLayoutCanvas.prototype._toUser = function (t, px, py) {
    return [(px - t.ox) / t.s + t.vb[0], (py - t.oy) / t.s + t.vb[1]];
  };

  PlotLayoutCanvas.prototype._poly = function (t, ring) {
    var c = this.ctx;
    c.beginPath();
    ring.forEach(function (p, i) {
      var d = this._toDevice(t, p[0], p[1]);
      if (i === 0) c.moveTo(d[0], d[1]); else c.lineTo(d[0], d[1]);
    }, this);
    c.closePath();
  };

  PlotLayoutCanvas.prototype.draw = function () {
    var c = this.ctx, g = this.geo, t = this._transform();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // ground: the sanctioned site coloured as road; plots and OSR sit on top,
    // so what shows through is exactly the road area.
    this._poly(t, g.boundary);
    c.fillStyle = GROUND;
    c.fill();

    this._poly(t, g.osr.polygon);
    c.fillStyle = OSR.fill;
    c.fill();
    c.strokeStyle = OSR.stroke;
    c.lineWidth = 0.5 * t.s;
    c.setLineDash([2.5 * t.s, 1.8 * t.s]);
    c.stroke();
    c.setLineDash([]);

    this._poly(t, g.existingRoad.quad);
    c.fillStyle = EXISTING.fill;
    c.fill();
    c.strokeStyle = EXISTING.stroke;
    c.lineWidth = 0.6 * t.s;
    c.stroke();

    this._poly(t, g.boundary);
    c.strokeStyle = SITE;
    c.lineWidth = 1.9 * t.s;
    c.lineJoin = 'round';
    c.stroke();

    // road + dimension labels, straight off the sheet
    c.textAlign = 'center';
    c.fillStyle = MUTED;
    g.roads.forEach(function (r) {
      var cx = (r.band[0] + r.band[2]) / 2, cy = (r.band[1] + r.band[3]) / 2;
      var d = this._toDevice(t, cx, cy);
      c.save();
      c.translate(d[0], d[1]);
      if (r.rotate) c.rotate((r.rotate * Math.PI) / 180);
      c.font = '500 ' + 4 * t.s + 'px Inter, sans-serif';
      c.fillText(r.label, 0, 1.2 * t.s);
      c.restore();
    }, this);

    g.dimensions.forEach(function (dim) {
      var a = this._toDevice(t, dim.from[0], dim.from[1]);
      var b = this._toDevice(t, dim.to[0], dim.to[1]);
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
      c.strokeStyle = MUTED;
      c.globalAlpha = 0.55;
      c.lineWidth = 0.45 * t.s;
      c.stroke();
      c.globalAlpha = 1;
      var ang = Math.atan2(dim.to[1] - dim.from[1], dim.to[0] - dim.from[0]);
      if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI; // keep text upright
      c.save();
      c.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      c.rotate(ang);
      c.font = '600 ' + 4.2 * t.s + 'px Inter, sans-serif';
      c.fillStyle = MUTED;
      c.fillText(dim.label, 0, -2.5 * t.s);
      c.restore();
    }, this);

    // plots
    this.plots.forEach(function (p) {
      var st = STATE[p.id === this.selectedId ? 'selected' : p.status] || STATE.available;
      var dim = this.visible && !this.visible.has(p.id);
      var a = this._toDevice(t, p.rect[0], p.rect[1]);
      var b = this._toDevice(t, p.rect[2], p.rect[3]);
      c.globalAlpha = dim ? 0.2 : 1;

      roundRect(c, a[0], a[1], b[0] - a[0], b[1] - a[1], 1.8 * t.s);
      c.fillStyle = st.fill;
      c.fill();
      c.strokeStyle = st.stroke;
      c.lineWidth = (p.id === this.selectedId ? 2.2 : 0.9) * t.s;
      if (st.dashed) c.setLineDash([2 * t.s, 1.5 * t.s]);
      c.stroke();
      c.setLineDash([]);

      c.fillStyle = st.text;
      c.font = '600 ' + 5.2 * t.s + 'px Inter, sans-serif';
      c.fillText(String(p.number), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1.6 * t.s);

      if (st.badge) {
        c.font = '700 ' + 2.7 * t.s + 'px Inter, sans-serif';
        c.fillText(st.badge, (a[0] + b[0]) / 2, b[1] - 3.2 * t.s);
      }
      c.globalAlpha = 1;
    }, this);
  };

  PlotLayoutCanvas.prototype.hitTest = function (px, py) {
    var t = this._transform();
    var u = this._toUser(t, px * (window.devicePixelRatio || 1), py * (window.devicePixelRatio || 1));
    for (var i = this.plots.length - 1; i >= 0; i--) {
      var r = this.plots[i].rect;
      if (u[0] >= r[0] && u[0] <= r[2] && u[1] >= r[1] && u[1] <= r[3]) {
        if (this.visible && !this.visible.has(this.plots[i].id)) return null;
        return this.plots[i];
      }
    }
    return null;
  };

  PlotLayoutCanvas.prototype._bind = function () {
    var self = this, drag = null;
    this.canvas.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY, vx: self.view.x, vy: self.view.y, moved: false };
    });
    this.canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      self.view.x = drag.vx + dx;
      self.view.y = drag.vy + dy;
      self.draw();
    });
    this.canvas.addEventListener('pointerup', function (e) {
      var wasDrag = drag && drag.moved;
      drag = null;
      if (wasDrag) return; // a pan is not a tap
      var box = self.canvas.getBoundingClientRect();
      var hit = self.hitTest(e.clientX - box.left, e.clientY - box.top);
      if (hit) { self.selectedId = hit.id; self.draw(); self._emit('select', hit); }
    });
    this.canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.view.k = Math.min(8, Math.max(0.6, self.view.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      self.draw();
    }, { passive: false });
    window.addEventListener('resize', function () { self.draw(); });
  };

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  return PlotLayoutCanvas;
});
