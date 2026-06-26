import { Image } from 'expo-image';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { color } from '@/theme/tokens';

/**
 * Photo/illustration hero backdrop anchored to the top of a screen and faded
 * into the paper background so content stays readable. Pass a `require(...)`'d
 * image (a bundled asset) or a `{ uri }`. Decorative + non-interactive.
 * Uses expo-image + react-native-svg (both already deps) — no new packages.
 */
export function ImageBackdrop({
  source,
  height = 260,
  opacity = 0.9,
}: {
  source: number | { uri: string };
  height?: number;
  opacity?: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, height, opacity }}>
      <Image source={source} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      {/* fade the bottom of the image into the page */}
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id="ib-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.paper} stopOpacity="0" />
            <Stop offset="0.68" stopColor={color.paper} stopOpacity="0" />
            <Stop offset="1" stopColor={color.paper} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#ib-fade)" />
      </Svg>
    </View>
  );
}
