import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { BackHeader } from '@/components/ui/BackHeader';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useProperties } from '@/features/buyer/hooks';
import { formatINR } from '@/lib/money';

/** §4 Map Search — plots on an OpenStreetMap/Leaflet map (no API key). Tap a pin → detail. */
export default function MapScreen() {
  const { data: properties = [] } = useProperties({ status: 'available' });

  const markers = useMemo(
    () =>
      properties
        .filter((p) => p.coordinates && typeof p.coordinates.lat === 'number' && typeof p.coordinates.lng === 'number')
        .map((p) => ({
          id: p.id,
          lat: p.coordinates!.lat as number,
          lng: p.coordinates!.lng as number,
          code: p.plot_code,
          price: formatINR(p.price),
        })),
    [properties],
  );

  const html = useMemo(
    () => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;margin:0}.lp b{font-family:monospace}</style></head>
<body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var data = ${JSON.stringify(markers)};
  var map = L.map('map');
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  var pts = [];
  data.forEach(function (m) {
    var mk = L.marker([m.lat, m.lng]).addTo(map);
    mk.bindPopup('<div class="lp"><b>' + m.code + '</b><br>' + m.price + '<br><a href="#" onclick="sel(\\'' + m.id + '\\');return false;">View details →</a></div>');
    pts.push([m.lat, m.lng]);
  });
  if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
  else map.setView([20.5937, 78.9629], 5);
  function sel(id) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(id); }
</script></body></html>`,
    [markers],
  );

  return (
    <Screen scroll={false} contentClassName="gap-0">
      <BackHeader title="Map search" />
      {markers.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text variant="body" className="text-center text-muted">
            No mapped plots yet. Properties appear here once their location coordinates are set in the admin console.
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
