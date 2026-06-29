import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { bearingDeg, haversineM, relAngle, squareBoundary, type LatLng } from './geo';

const FOV = 60; // approximate horizontal camera field-of-view (degrees)

/** AR plot-boundary overlay — projects the plot's corner points onto the live
 *  camera using GPS + compass. Best-effort (no pitch/roll correction); beta. */
export function ArBoundary({ center, areaSqm }: { center: LatLng; areaSqm: number }) {
  const [perm, requestPerm] = useCameraPermissions();
  const { width, height } = useWindowDimensions();
  const [user, setUser] = useState<LatLng | null>(null);
  const [heading, setHeading] = useState(0);
  const [locReady, setLocReady] = useState(false);

  const corners = useMemo(() => squareBoundary(center, areaSqm), [center, areaSqm]);

  useEffect(() => {
    let cancelled = false;
    let posSub: Location.LocationSubscription | undefined;
    let headSub: Location.LocationSubscription | undefined;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      setLocReady(true);
      posSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 1 },
        (p) => {
          if (!cancelled) setUser({ lat: p.coords.latitude, lng: p.coords.longitude });
        },
      );
      headSub = await Location.watchHeadingAsync((h) => {
        if (!cancelled) setHeading(h.trueHeading >= 0 ? h.trueHeading : h.magHeading);
      });
    })();
    return () => {
      cancelled = true;
      posSub?.remove();
      headSub?.remove();
    };
  }, []);

  const proj = useMemo(() => {
    if (!user) return [];
    const pts = corners.map((c, i) => {
      const dist = haversineM(user, c);
      const rel = relAngle(bearingDeg(user, c), heading);
      return { i, dist, rel, onScreen: Math.abs(rel) <= FOV / 2 };
    });
    const maxD = Math.max(1, ...pts.map((p) => p.dist));
    return pts.map((p) => {
      const x = width / 2 + (p.rel / (FOV / 2)) * (width / 2);
      const y = height * 0.62 - Math.min(height * 0.3, (p.dist / maxD) * height * 0.3);
      return { ...p, x: Math.max(10, Math.min(width - 10, x)), y };
    });
  }, [user, heading, corners, width, height]);

  if (!perm) return <View style={styles.fill} />;
  if (!perm.granted) {
    return (
      <View style={[styles.fill, styles.center]}>
        <Text variant="title" className="mb-2 text-center text-white">Camera access needed</Text>
        <Text variant="caption" className="mb-4 text-center text-white/70">
          Allow camera access to see the plot boundary in AR.
        </Text>
        <Button title="Allow camera" onPress={requestPerm} />
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />
      <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
        {proj.map((p, idx) => {
          const n = proj[(idx + 1) % proj.length];
          return (
            <Line key={`l${idx}`} x1={p.x} y1={p.y} x2={n.x} y2={n.y} stroke="#fbbc15" strokeWidth={3} strokeOpacity={0.9} />
          );
        })}
        {proj.map((p) => (
          <Circle key={`c${p.i}`} cx={p.x} cy={p.y} r={10} fill={p.onScreen ? '#fd0001' : '#9a9a9a'} stroke="#ffffff" strokeWidth={2} />
        ))}
        {proj.map((p) => (
          <SvgText key={`t${p.i}`} x={p.x} y={p.y - 16} fill="#ffffff" stroke="#000000" strokeWidth={0.4} fontSize="12" fontWeight="bold" textAnchor="middle">
            {`C${p.i + 1} · ${Math.round(p.dist)}m`}
          </SvgText>
        ))}
      </Svg>

      <View style={styles.hud} pointerEvents="none">
        <Text variant="caption" className="text-center text-white">
          {!locReady
            ? 'Allow location to anchor the boundary…'
            : !user
              ? 'Locating you…'
              : 'Pan slowly to find the corners (C1–C4). Red = in view.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  hud: { position: 'absolute', bottom: 28, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
});
