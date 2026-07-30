import { useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import type { LayoutGeometry, LayoutPlot, PlotStatus } from './api';
import { color } from '@/theme/tokens';

/**
 * The sanctioned plan, drawn to scale and individually selectable.
 *
 * Zoom is applied to the SVG `viewBox` rather than to a View transform: the
 * vector is re-rasterised at every zoom level, so the plan stays sharp however
 * far in the buyer goes, instead of blurring like a scaled bitmap layer.
 *
 * Geometry is traced from the approval drawing and is display-only. Quoted
 * sizes and areas come from the sanctioned plot schedule.
 */

const FILL: Record<PlotStatus, string> = {
  available: color.surface,
  reserved: color.warn,
  booked: color.red,
  sold: '#4A4A4A',
  blocked: color.line,
};
const STROKE: Record<PlotStatus, string> = {
  available: color.success,
  reserved: '#B4790A',
  booked: color.redDeep,
  sold: '#2E2E2E',
  blocked: color.muted,
};
const LABEL: Record<PlotStatus, string> = {
  available: color.success,
  reserved: '#FFFFFF',
  booked: '#FFFFFF',
  sold: '#FFFFFF',
  blocked: color.muted,
};
const BADGE: Partial<Record<PlotStatus, string>> = {
  reserved: 'HELD',
  booked: 'BOOKED',
  sold: 'SOLD',
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

export interface PlotMapProps {
  geometry: LayoutGeometry;
  plots: LayoutPlot[];
  selected?: string | null;
  /** Plot ids to keep prominent; everything else dims. Undefined = show all. */
  visible?: Set<string>;
  onSelect?: (plot: LayoutPlot) => void;
  height?: number;
}

export function PlotMap({ geometry, plots, selected, visible, onSelect, height = 460 }: PlotMapProps) {
  const [vb, setVb] = useState(() => ({
    x: geometry.viewBox[0],
    y: geometry.viewBox[1],
    w: geometry.viewBox[2],
    h: geometry.viewBox[3],
  }));
  const start = useRef(vb);
  const pinchStart = useRef<{ dist: number; w: number; h: number; x: number; y: number } | null>(null);
  const size = useRef({ w: 1, h: 1 });

  const base = geometry.viewBox;

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Let taps reach the plots; only take over once it is clearly a drag.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) + Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
          start.current = vb;
          pinchStart.current = null;
        },
        onPanResponderMove: (e, g) => {
          const touches = e.nativeEvent.touches;
          if (touches.length >= 2) {
            const [a, b] = touches;
            const dist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
            if (!pinchStart.current) {
              pinchStart.current = { dist, w: vb.w, h: vb.h, x: vb.x, y: vb.y };
              return;
            }
            const p = pinchStart.current;
            const ratio = Math.max(0.05, p.dist / Math.max(dist, 1));
            const w = clamp(p.w * ratio, base[2] / MAX_ZOOM, base[2] / MIN_ZOOM);
            const h = w * (base[3] / base[2]);
            // zoom about the centre of the current view
            setVb({ x: p.x + (p.w - w) / 2, y: p.y + (p.h - h) / 2, w, h });
            return;
          }
          pinchStart.current = null;
          const s = start.current;
          // convert finger travel (px) into drawing units
          const ux = (g.dx / Math.max(size.current.w, 1)) * s.w;
          const uy = (g.dy / Math.max(size.current.h, 1)) * s.h;
          setVb({ ...s, x: s.x - ux, y: s.y - uy });
        },
        onPanResponderRelease: () => {
          pinchStart.current = null;
        },
      }),
    [vb, base],
  );

  const boundary = pointsOf(geometry.boundary);
  const osr = pointsOf(geometry.osr.polygon);
  const existing = pointsOf(geometry.existingRoad.quad);

  return (
    <View
      style={{ height }}
      onLayout={(e) => {
        size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
      }}
      {...pan.panHandlers}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`${round(vb.x)} ${round(vb.y)} ${round(vb.w)} ${round(vb.h)}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Everything inside the boundary that is not a plot or the OSR is road,
            exactly as the sheet colours it. */}
        <Polygon points={boundary} fill="#ECECE8" />
        <Polygon points={osr} fill="#EEF5EA" stroke="#5B8C3A" strokeWidth={0.5} strokeDasharray="2.5 1.8" />
        <Polygon points={existing} fill="#F4EFDC" stroke="#7A6B32" strokeWidth={0.6} />
        <Polygon points={boundary} fill="none" stroke="#D0402F" strokeWidth={1.9} strokeLinejoin="round" />

        {geometry.roads.map((r, i) => {
          const cx = (r.band[0] + r.band[2]) / 2;
          const cy = (r.band[1] + r.band[3]) / 2;
          return (
            <SvgText
              key={`road-${i}`}
              x={cx}
              y={cy + 1.2}
              fontSize={4}
              fontWeight="500"
              fill={color.muted}
              textAnchor="middle"
              transform={r.rotate ? `rotate(${r.rotate} ${cx} ${cy})` : undefined}
            >
              {r.label}
            </SvgText>
          );
        })}

        <SvgText x={osrLabelX(geometry)} y={327} fontSize={6} fontWeight="600" fill="#5B8C3A" textAnchor="middle">
          {geometry.osr.label}
        </SvgText>
        <SvgText x={osrLabelX(geometry)} y={336} fontSize={4} fill="#5B8C3A" textAnchor="middle">
          {`${geometry.osr.areaSqm.toLocaleString('en-IN')} Sq.m`}
        </SvgText>

        {geometry.dimensions.map((d, i) => {
          const mx = (d.from[0] + d.to[0]) / 2;
          const my = (d.from[1] + d.to[1]) / 2;
          const rad = Math.atan2(d.to[1] - d.from[1], d.to[0] - d.from[0]);
          // short ticks square to the run, so each callout reads as a measurement
          const tx = Math.cos(rad + Math.PI / 2) * 2.4;
          const ty = Math.sin(rad + Math.PI / 2) * 2.4;
          let ang = (rad * 180) / Math.PI;
          if (ang > 90 || ang < -90) ang += 180; // keep the text upright
          return (
            <G key={`dim-${i}`}>
              <Line x1={d.from[0]} y1={d.from[1]} x2={d.to[0]} y2={d.to[1]} stroke={color.muted} strokeWidth={0.5} opacity={0.6} />
              {[d.from, d.to].map((e, k) => (
                <Line key={k} x1={e[0] - tx} y1={e[1] - ty} x2={e[0] + tx} y2={e[1] + ty} stroke={color.muted} strokeWidth={0.5} opacity={0.6} />
              ))}
              <SvgText x={mx} y={my - 2.6} fontSize={4.2} fontWeight="600" fill={color.muted} textAnchor="middle" transform={`rotate(${ang.toFixed(2)} ${mx} ${my})`}>
                {d.label}
              </SvgText>
            </G>
          );
        })}

        {/* Scale bar, sized from the sheet's own overall dimension so it always
            agrees with the printed callouts. Drawn in plan coordinates, so it
            zooms with the drawing and keeps representing the same distance. */}
        {geometry.metresPerUnit ? (
          <G>
            <Rect x={46} y={628} width={10 / geometry.metresPerUnit} height={2.6} fill={color.ink} />
            <Rect
              x={46 + 10 / geometry.metresPerUnit}
              y={628}
              width={10 / geometry.metresPerUnit}
              height={2.6}
              fill="none"
              stroke={color.ink}
              strokeWidth={0.4}
            />
            {[0, 1, 2].map((k) => (
              <SvgText key={k} x={46 + (10 / geometry.metresPerUnit!) * k} y={626.4} fontSize={3.4} fontWeight="600" fill={color.muted} textAnchor="middle">
                {String(k * 10)}
              </SvgText>
            ))}
            <SvgText x={46 + 10 / geometry.metresPerUnit} y={634.4} fontSize={3.4} fontWeight="600" fill={color.muted} textAnchor="middle">
              metres
            </SvgText>
          </G>
        ) : null}

        {plots.map((p) => {
          const [x0, y0, x1, y1] = p.rect;
          const w = x1 - x0;
          const h = y1 - y0;
          // The approval sheet clips its plot rectangles to the site boundary —
          // eight plots run past the edge and take the boundary as their edge.
          const shape = geometry.plotShapes?.[String(p.number)];
          const cx = shape ? shape.at[0] : x0 + w / 2;
          const cy = shape ? shape.at[1] : y0 + h / 2;
          const isSel = selected === p.id;
          const dim = visible ? !visible.has(p.id) : false;
          const badge = BADGE[p.status];
          return (
            <G
              key={p.id}
              opacity={dim ? 0.2 : 1}
              onPress={dim ? undefined : () => onSelect?.(p)}
              accessibilityRole="button"
              accessibilityLabel={`Plot ${p.number}, block ${p.block}, ${p.areaSqm ?? '—'} square metres, ${p.status}`}
            >
              {shape?.clipped ? (
                <Polygon
                  points={pointsOf(shape.poly)}
                  fill={isSel ? color.gold : FILL[p.status]}
                  stroke={isSel ? color.goldDeep : STROKE[p.status]}
                  strokeWidth={isSel ? 2.2 : 0.9}
                />
              ) : (
                <Rect
                  x={x0}
                  y={y0}
                  width={w}
                  height={h}
                  rx={1.8}
                  fill={isSel ? color.gold : FILL[p.status]}
                  stroke={isSel ? color.goldDeep : STROKE[p.status]}
                  strokeWidth={isSel ? 2.2 : 0.9}
                />
              )}
              <SvgText
                x={cx}
                y={cy - 0.8}
                fontSize={6.6}
                fontWeight="700"
                fill={isSel ? color.ink : LABEL[p.status]}
                textAnchor="middle"
              >
                {String(p.number)}
              </SvgText>
              {p.areaSqm ? (
                // rounded so the annotation always fits inside the plot box;
                // the exact schedule figure is on the detail sheet
                <SvgText
                  x={cx}
                  y={cy + 6}
                  fontSize={3.1}
                  fill={isSel ? color.ink : p.status === 'available' ? color.muted : 'rgba(255,255,255,0.82)'}
                  opacity={0.9}
                  textAnchor="middle"
                >
                  {`${Math.round(p.areaSqm)} m²`}
                </SvgText>
              ) : null}
              {badge ? (
                // off the label anchor, so it stays inside a clipped plot
                <SvgText x={cx} y={cy + 11} fontSize={2.7} fontWeight="700" fill="#FFFFFF" textAnchor="middle">
                  {badge}
                </SvgText>
              ) : null}
            </G>
          );
        })}

        {(geometry as unknown as { amenities?: Array<{ at?: [number, number]; kind: string }> }).amenities?.map(
          (a, i) =>
            a.at ? (
              <G key={`am-${i}`}>
                <Circle cx={a.at[0]} cy={a.at[1]} r={4.4} fill={color.surface} stroke={color.goldDeep} strokeWidth={0.7} />
                <SvgText x={a.at[0]} y={a.at[1] + 1.9} fontSize={4.4} fill={color.goldDeep} textAnchor="middle">
                  {a.kind === 'entrance' ? '⌂' : '❋'}
                </SvgText>
              </G>
            ) : null,
        )}
      </Svg>
    </View>
  );
}

/** Reset helper so screens can offer a "fit plan" control. */
export function fitViewBox(geometry: LayoutGeometry) {
  return { x: geometry.viewBox[0], y: geometry.viewBox[1], w: geometry.viewBox[2], h: geometry.viewBox[3] };
}

function pointsOf(ring: Array<[number, number]>) {
  return ring.map((p) => p.join(',')).join(' ');
}
function round(v: number) {
  return Math.round(v * 100) / 100;
}
function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
/** Centre of the part of the OSR that actually falls inside the site. */
function osrLabelX(g: LayoutGeometry) {
  const xs = g.osr.polygon.map((p) => p[0]);
  return (Math.min(...xs) + Math.max(...xs)) / 2;
}
