// Flutter CustomPainter for a sanctioned DTCP layout.
//
// Reference implementation — see docs/plot-layout/README.md. JAMIN is an Expo /
// React Native app, so nothing here is wired into this repo; this exists so the
// same plan can be dropped into a Flutter target without re-deriving the
// geometry from the approval drawing.
//
// Feed it the object produced by scripts/extract-dtcp-layout.py. Coordinates are
// the drawing's own user space (points, y-down). They position things on screen
// and nothing else: areas and sizes always come from the sanctioned plot
// schedule carried on each plot, never from these coordinates.
//
//   PlotLayoutView(
//     geometry: LayoutGeometry.fromJson(json),
//     plots: plots,
//     selectedId: selectedId,
//     onSelect: (p) => showPlotSheet(p),
//   )

import 'dart:math' as math;
import 'package:flutter/material.dart';

enum PlotStatus { available, reserved, booked, sold, blocked }

PlotStatus plotStatusFrom(String? s) {
  switch (s) {
    case 'reserved':
      return PlotStatus.reserved;
    case 'booked':
      return PlotStatus.booked;
    case 'sold':
      return PlotStatus.sold;
    case 'blocked':
      return PlotStatus.blocked;
    default:
      return PlotStatus.available;
  }
}

class _Style {
  const _Style(this.fill, this.stroke, this.text, {this.badge, this.dashed = false});
  final Color fill;
  final Color stroke;
  final Color text;
  final String? badge;
  final bool dashed;
}

const _styles = <PlotStatus, _Style>{
  PlotStatus.available: _Style(Color(0xFFFFFFFF), Color(0xFF1E9E5A), Color(0xFF1E9E5A)),
  PlotStatus.reserved: _Style(Color(0xFFE6A10D), Color(0xFFB4790A), Colors.white, badge: 'HELD'),
  PlotStatus.booked: _Style(Color(0xFFFD0001), Color(0xFFC70000), Colors.white, badge: 'BOOKED'),
  PlotStatus.sold: _Style(Color(0xFF4A4A4A), Color(0xFF2E2E2E), Colors.white, badge: 'SOLD'),
  PlotStatus.blocked: _Style(Color(0xFFE6E7E2), Color(0xFF74746E), Color(0xFF74746E), dashed: true),
};
const _selected = _Style(Color(0xFF2F6BFF), Color(0xFF1B4FD8), Colors.white);

const _ground = Color(0xFFECECE8);
const _osrFill = Color(0xFFEEF5EA);
const _osrLine = Color(0xFF5B8C3A);
const _siteLine = Color(0xFFD0402F);
const _existingFill = Color(0xFFF4EFDC);
const _existingLine = Color(0xFF7A6B32);
const _muted = Color(0xFF74746E);

class LayoutPlot {
  LayoutPlot({
    required this.id,
    required this.number,
    required this.block,
    required this.rect,
    required this.status,
    this.areaSqm,
    this.widthM,
    this.depthM,
    this.facing,
  });

  final String id;
  final int number;
  final String block;

  /// [x0, y0, x1, y1] in drawing user space. Display only.
  final List<double> rect;
  final PlotStatus status;

  /// Quoted from the sanctioned plot schedule — never derived from [rect].
  final double? areaSqm;
  final double? widthM;
  final double? depthM;

  /// Read off the plan; NOT stated on the DTCP sheet.
  final String? facing;

  factory LayoutPlot.fromJson(Map<String, dynamic> j) => LayoutPlot(
        id: j['id'] as String,
        number: j['number'] as int,
        block: j['block'] as String,
        rect: (j['rect'] as List).map((v) => (v as num).toDouble()).toList(),
        status: plotStatusFrom(j['status'] as String?),
        areaSqm: (j['areaSqm'] as num?)?.toDouble(),
        widthM: (j['widthM'] as num?)?.toDouble(),
        depthM: (j['depthM'] as num?)?.toDouble(),
        facing: j['facing'] as String?,
      );
}

class RoadBand {
  RoadBand(this.label, this.band, this.rotate);
  final String label;
  final List<double> band; // [x0, y0, x1, y1]
  final double rotate; // degrees

  factory RoadBand.fromJson(Map<String, dynamic> j) => RoadBand(
        j['label'] as String,
        (j['band'] as List).map((v) => (v as num).toDouble()).toList(),
        ((j['rotate'] as num?) ?? 0).toDouble(),
      );
}

class DimensionLine {
  DimensionLine(this.label, this.from, this.to);
  final String label;
  final Offset from;
  final Offset to;

  factory DimensionLine.fromJson(Map<String, dynamic> j) {
    Offset pt(dynamic v) =>
        Offset((v[0] as num).toDouble(), (v[1] as num).toDouble());
    return DimensionLine(j['label'] as String, pt(j['from']), pt(j['to']));
  }
}

class LayoutGeometry {
  LayoutGeometry({
    required this.viewBox,
    required this.boundary,
    required this.osrPolygon,
    required this.osrLabel,
    required this.osrAreaSqm,
    required this.existingRoad,
    required this.roads,
    required this.dimensions,
  });

  final Rect viewBox;
  final List<Offset> boundary;

  /// The part of the OSR actually inside the site. The rectangle as drawn on
  /// the sheet overhangs the boundary, so never paint `osr.rect` directly.
  final List<Offset> osrPolygon;
  final String osrLabel;
  final double osrAreaSqm;
  final List<Offset> existingRoad;
  final List<RoadBand> roads;
  final List<DimensionLine> dimensions;

  static List<Offset> _ring(dynamic v) => (v as List)
      .map((p) => Offset((p[0] as num).toDouble(), (p[1] as num).toDouble()))
      .toList();

  factory LayoutGeometry.fromJson(Map<String, dynamic> j) {
    final vb = (j['viewBox'] as List).map((v) => (v as num).toDouble()).toList();
    final osr = j['osr'] as Map<String, dynamic>;
    final er = j['existingRoad'] as Map<String, dynamic>;
    return LayoutGeometry(
      viewBox: Rect.fromLTWH(vb[0], vb[1], vb[2], vb[3]),
      boundary: _ring(j['boundary']),
      osrPolygon: _ring(osr['polygon']),
      osrLabel: osr['label'] as String? ?? 'O.S.R.',
      osrAreaSqm: (osr['areaSqm'] as num?)?.toDouble() ?? 0,
      existingRoad: _ring(er['quad']),
      roads: (j['roads'] as List)
          .map((r) => RoadBand.fromJson(r as Map<String, dynamic>))
          .toList(),
      dimensions: (j['dimensions'] as List)
          .map((d) => DimensionLine.fromJson(d as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Pinch-zoom + pan wrapper with plot hit-testing.
class PlotLayoutView extends StatefulWidget {
  const PlotLayoutView({
    super.key,
    required this.geometry,
    required this.plots,
    this.selectedId,
    this.visibleIds,
    this.onSelect,
  });

  final LayoutGeometry geometry;
  final List<LayoutPlot> plots;
  final String? selectedId;

  /// Plots to keep prominent; everything else dims. Null shows all.
  final Set<String>? visibleIds;
  final ValueChanged<LayoutPlot>? onSelect;

  @override
  State<PlotLayoutView> createState() => _PlotLayoutViewState();
}

class _PlotLayoutViewState extends State<PlotLayoutView> {
  final _controller = TransformationController();
  Size _size = Size.zero;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Screen point -> drawing user space, undoing both the fit and the gesture.
  Offset _toUser(Offset local) {
    final scene = _controller.toScene(local);
    final vb = widget.geometry.viewBox;
    final fit = math.min(_size.width / vb.width, _size.height / vb.height);
    final ox = (_size.width - vb.width * fit) / 2;
    final oy = (_size.height - vb.height * fit) / 2;
    return Offset((scene.dx - ox) / fit + vb.left, (scene.dy - oy) / fit + vb.top);
  }

  void _handleTap(Offset local) {
    final u = _toUser(local);
    for (final p in widget.plots.reversed) {
      final r = p.rect;
      if (u.dx >= r[0] && u.dx <= r[2] && u.dy >= r[1] && u.dy <= r[3]) {
        if (widget.visibleIds != null && !widget.visibleIds!.contains(p.id)) return;
        widget.onSelect?.call(p);
        return;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      _size = Size(constraints.maxWidth, constraints.maxHeight);
      return InteractiveViewer(
        transformationController: _controller,
        minScale: 1,
        maxScale: 8,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapUp: (d) => _handleTap(d.localPosition),
          child: CustomPaint(
            size: _size,
            painter: PlotLayoutPainter(
              geometry: widget.geometry,
              plots: widget.plots,
              selectedId: widget.selectedId,
              visibleIds: widget.visibleIds,
            ),
          ),
        ),
      );
    });
  }
}

class PlotLayoutPainter extends CustomPainter {
  PlotLayoutPainter({
    required this.geometry,
    required this.plots,
    this.selectedId,
    this.visibleIds,
  });

  final LayoutGeometry geometry;
  final List<LayoutPlot> plots;
  final String? selectedId;
  final Set<String>? visibleIds;

  late double _fit;
  late Offset _origin;

  Offset _p(Offset u) => Offset(
        _origin.dx + (u.dx - geometry.viewBox.left) * _fit,
        _origin.dy + (u.dy - geometry.viewBox.top) * _fit,
      );

  Path _path(List<Offset> ring) {
    final path = Path();
    for (var i = 0; i < ring.length; i++) {
      final d = _p(ring[i]);
      if (i == 0) {
        path.moveTo(d.dx, d.dy);
      } else {
        path.lineTo(d.dx, d.dy);
      }
    }
    return path..close();
  }

  void _text(Canvas c, String s, Offset at,
      {required double size, required Color color, FontWeight weight = FontWeight.w500, double rotate = 0}) {
    final tp = TextPainter(
      text: TextSpan(
        text: s,
        style: TextStyle(fontSize: size * _fit, color: color, fontWeight: weight, fontFamily: 'Inter'),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    final d = _p(at);
    c.save();
    c.translate(d.dx, d.dy);
    if (rotate != 0) c.rotate(rotate * math.pi / 180);
    tp.paint(c, Offset(-tp.width / 2, -tp.height / 2));
    c.restore();
  }

  @override
  void paint(Canvas canvas, Size size) {
    final vb = geometry.viewBox;
    // uniform fit, centred — matches SVG preserveAspectRatio="xMidYMid meet"
    _fit = math.min(size.width / vb.width, size.height / vb.height);
    _origin = Offset(
      (size.width - vb.width * _fit) / 2,
      (size.height - vb.height * _fit) / 2,
    );

    // Ground = the sanctioned site coloured as road. Plots and the OSR are
    // painted on top, so what shows through is exactly the road area.
    canvas.drawPath(_path(geometry.boundary), Paint()..color = _ground);

    final osr = _path(geometry.osrPolygon);
    canvas.drawPath(osr, Paint()..color = _osrFill);
    canvas.drawPath(
        osr,
        Paint()
          ..color = _osrLine
          ..style = PaintingStyle.stroke
          ..strokeWidth = 0.5 * _fit);

    final er = _path(geometry.existingRoad);
    canvas.drawPath(er, Paint()..color = _existingFill);
    canvas.drawPath(
        er,
        Paint()
          ..color = _existingLine
          ..style = PaintingStyle.stroke
          ..strokeWidth = 0.6 * _fit);

    canvas.drawPath(
        _path(geometry.boundary),
        Paint()
          ..color = _siteLine
          ..style = PaintingStyle.stroke
          ..strokeJoin = StrokeJoin.round
          ..strokeWidth = 1.9 * _fit);

    for (final r in geometry.roads) {
      _text(
        canvas,
        r.label,
        Offset((r.band[0] + r.band[2]) / 2, (r.band[1] + r.band[3]) / 2),
        size: 4,
        color: _muted,
        rotate: r.rotate,
      );
    }

    for (final d in geometry.dimensions) {
      canvas.drawLine(
          _p(d.from),
          _p(d.to),
          Paint()
            ..color = _muted.withValues(alpha: 0.55)
            ..strokeWidth = 0.45 * _fit);
      var ang = math.atan2(d.to.dy - d.from.dy, d.to.dx - d.from.dx) * 180 / math.pi;
      if (ang > 90 || ang < -90) ang += 180; // keep the label upright
      _text(
        canvas,
        d.label,
        Offset((d.from.dx + d.to.dx) / 2, (d.from.dy + d.to.dy) / 2 - 2.5),
        size: 4.2,
        color: _muted,
        weight: FontWeight.w600,
        rotate: ang,
      );
    }

    for (final p in plots) {
      final style = p.id == selectedId ? _selected : _styles[p.status]!;
      final dimmed = visibleIds != null && !visibleIds!.contains(p.id);
      final a = _p(Offset(p.rect[0], p.rect[1]));
      final b = _p(Offset(p.rect[2], p.rect[3]));
      final rrect = RRect.fromRectAndRadius(
        Rect.fromPoints(a, b),
        Radius.circular(1.8 * _fit),
      );
      final alpha = dimmed ? 0.2 : 1.0;

      canvas.drawRRect(rrect, Paint()..color = style.fill.withValues(alpha: alpha));
      canvas.drawRRect(
          rrect,
          Paint()
            ..color = style.stroke.withValues(alpha: alpha)
            ..style = PaintingStyle.stroke
            ..strokeWidth = (p.id == selectedId ? 2.2 : 0.9) * _fit);

      final cx = (p.rect[0] + p.rect[2]) / 2;
      final cy = (p.rect[1] + p.rect[3]) / 2;
      _text(canvas, '${p.number}', Offset(cx, cy),
          size: 5.2, color: style.text.withValues(alpha: alpha), weight: FontWeight.w600);

      if (style.badge != null) {
        _text(canvas, style.badge!, Offset(cx, p.rect[3] - 4),
            size: 2.7, color: Colors.white.withValues(alpha: alpha), weight: FontWeight.w700);
      }
    }
  }

  @override
  bool shouldRepaint(covariant PlotLayoutPainter old) =>
      old.plots != plots ||
      old.selectedId != selectedId ||
      old.visibleIds != visibleIds ||
      old.geometry != geometry;
}
