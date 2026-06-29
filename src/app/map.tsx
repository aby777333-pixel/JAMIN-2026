import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { BackHeader } from '@/components/ui/BackHeader';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useProperties } from '@/features/buyer/hooks';
import { formatINR } from '@/lib/money';

/** Great-circle distance in km between two lat/lng points. */
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

const RADII: { label: string; km: number | null }[] = [
  { label: 'All', km: null },
  { label: '1 km', km: 1 },
  { label: '5 km', km: 5 },
  { label: '10 km', km: 10 },
  { label: '25 km', km: 25 },
  { label: '50 km', km: 50 },
];

/** §4 Map Search + live Property Radar — GPS-centred radius filtering on a Leaflet map. */
export default function MapScreen() {
  const { data: properties = [] } = useProperties({ status: 'available' });
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [locDenied, setLocDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setLocDenied(true);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        if (!cancelled) setLocDenied(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allMarkers = useMemo(
    () =>
      properties
        .filter(
          (p) => p.coordinates && typeof p.coordinates.lat === 'number' && typeof p.coordinates.lng === 'number',
        )
        .map((p) => ({
          id: p.id,
          lat: p.coordinates!.lat as number,
          lng: p.coordinates!.lng as number,
          code: p.plot_code,
          price: formatINR(p.price),
        })),
    [properties],
  );

  // Apply the radius radar when we have a fix and a radius is chosen.
  const markers = useMemo(() => {
    if (!userLoc || radiusKm == null) return allMarkers;
    return allMarkers
      .map((m) => ({ ...m, dist: haversineKm(userLoc.lat, userLoc.lng, m.lat, m.lng) }))
      .filter((m) => m.dist <= radiusKm)
      .sort((a, b) => a.dist - b.dist);
  }, [allMarkers, userLoc, radiusKm]);

  const html = useMemo(
    () => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;margin:0}.lp b{font-family:monospace}</style></head>
<body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var data = ${JSON.stringify(markers)};
  var user = ${JSON.stringify(userLoc)};
  var radiusKm = ${radiusKm == null ? 'null' : radiusKm};
  var map = L.map('map');
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  var pts = [];
  data.forEach(function (m) {
    var mk = L.marker([m.lat, m.lng]).addTo(map);
    var d = (typeof m.dist === 'number') ? ('<br>' + m.dist.toFixed(1) + ' km away') : '';
    mk.bindPopup('<div class="lp"><b>' + m.code + '</b><br>' + m.price + d + '<br><a href="#" onclick="sel(\\'' + m.id + '\\');return false;">View details →</a></div>');
    pts.push([m.lat, m.lng]);
  });
  var circle = null;
  if (user) {
    L.circleMarker([user.lat, user.lng], { radius: 7, color: '#fd0001', fillColor: '#fd0001', fillOpacity: 1 }).addTo(map).bindPopup('You are here');
    pts.push([user.lat, user.lng]);
    if (radiusKm) {
      circle = L.circle([user.lat, user.lng], { radius: radiusKm * 1000, color: '#fd0001', weight: 1, fillColor: '#fd0001', fillOpacity: 0.06 }).addTo(map);
    }
  }
  if (circle) map.fitBounds(circle.getBounds(), { padding: [24, 24] });
  else if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
  else map.setView([20.5937, 78.9629], 5);
  function sel(id) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(id); }
</script></body></html>`,
    [markers, userLoc, radiusKm],
  );

  return (
    <Screen scroll={false} contentClassName="gap-2">
      <BackHeader title="Map & radar" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerClassName="gap-2 pr-4 items-center">
        {RADII.map((r) => (
          <Chip
            key={r.label}
            label={r.label}
            active={radiusKm === r.km}
            onPress={() => setRadiusKm(r.km)}
          />
        ))}
      </ScrollView>

      <Text variant="caption">
        {locDenied
          ? 'Enable location to filter by radius around you. Showing all mapped plots.'
          : !userLoc
            ? 'Finding your location…'
            : radiusKm == null
              ? `${markers.length} mapped ${markers.length === 1 ? 'plot' : 'plots'} — pick a radius to filter around you.`
              : `${markers.length} ${markers.length === 1 ? 'plot' : 'plots'} within ${radiusKm} km of you.`}
      </Text>

      {allMarkers.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text variant="body" className="text-center text-muted">
            No mapped plots yet. Properties appear here once their location coordinates are set.
          </Text>
        </View>
      ) : (
        <View className="flex-1 overflow-hidden rounded-2xl border border-line">
          <WebView
            originWhitelist={['*']}
            source={{ html }}
            onMessage={(e) => {
              const id = e.nativeEvent.data;
              if (id) router.push(`/property/${id}`);
            }}
          />
        </View>
      )}
    </Screen>
  );
}
