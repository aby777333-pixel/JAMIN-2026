import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { VISIT_QR_PREFIX } from '@/features/visits/VisitPassSheet';
import { useCheckinVisit } from '@/features/visits/hooks';
import { errMessage } from '@/lib/errors';
import { color } from '@/theme/tokens';

type ScanState =
  | { kind: 'scanning' }
  | { kind: 'working' }
  | { kind: 'done'; ok: boolean; message: string };

/**
 * Scan a buyer's site-visit pass (agent side). Reads the visit id from the QR,
 * grabs the agent's GPS, and calls the existing geofenced check-in RPC — the
 * server authorizes (buyer/agent/admin only) and enforces the radius, so the
 * QR itself grants nothing.
 */
export default function ScanVisitPass() {
  const insets = useSafeAreaInsets();
  const [perm, requestPerm] = useCameraPermissions();
  const checkin = useCheckinVisit();
  const [state, setState] = useState<ScanState>({ kind: 'scanning' });
  const busyRef = useRef(false); // barcode events fire rapidly — process one at a time

  async function onScanned(data: string) {
    if (busyRef.current || !data.startsWith(VISIT_QR_PREFIX)) return;
    busyRef.current = true;
    setState({ kind: 'working' });
    try {
      const visitId = data.slice(VISIT_QR_PREFIX.length).trim();
      let lat: number | null = null;
      let lng: number | null = null;
      const locPerm = await Location.requestForegroundPermissionsAsync();
      if (locPerm.status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }
      const res = await checkin.mutateAsync({ id: visitId, lat: lat as number, lng: lng as number });
      setState({
        kind: 'done',
        ok: !!res.ok,
        message: res.ok
          ? `Visitor checked in ✓${res.distance_m != null ? ` · ${res.distance_m} m from the plot` : ''}`
          : `Too far to check in — ${res.distance_m} m away (limit ${res.radius_m} m).`,
      });
    } catch (e) {
      setState({ kind: 'done', ok: false, message: errMessage(e) });
    }
  }

  if (!perm) return <View style={styles.fill} />;
  if (!perm.granted) {
    return (
      <View style={[styles.fill, styles.center]}>
        <Text variant="title" className="mb-2 text-center text-white">
          Camera access needed
        </Text>
        <Text variant="caption" className="mb-4 text-center text-white/70">
          Allow camera access to scan a visitor's site-visit pass.
        </Text>
        <Button title="Allow camera" onPress={requestPerm} />
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      {state.kind === 'scanning' ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => void onScanned(String(data ?? ''))}
        />
      ) : (
        <View style={[styles.fill, styles.center]}>
          {state.kind === 'working' ? (
            <ActivityIndicator color={color.gold} size="large" />
          ) : (
            <View className="items-center gap-3 px-8">
              <Ionicons
                name={state.ok ? 'checkmark-circle' : 'alert-circle'}
                size={64}
                color={state.ok ? color.success : color.warn}
              />
              <Text variant="title" className="text-center text-white">
                {state.message}
              </Text>
              <Button
                title="Scan another pass"
                variant="secondary"
                onPress={() => {
                  busyRef.current = false;
                  setState({ kind: 'scanning' });
                }}
              />
            </View>
          )}
        </View>
      )}

      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={{ position: 'absolute', top: insets.top + 10, left: 16 }}
        className="h-10 w-10 items-center justify-center rounded-full bg-black/50">
        <Ionicons name="close" size={22} color="#fff" />
      </Pressable>
      {state.kind === 'scanning' ? (
        <View style={[styles.hud, { bottom: insets.bottom + 24 }]} pointerEvents="none">
          <Text variant="caption" className="text-center text-white">
            Point the camera at the visitor's Jamin Bazaar pass QR
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  hud: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
