import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { color } from '@/theme/tokens';

/**
 * Branded real-estate hero backdrop (warm sky + sun glow + skyline silhouette)
 * anchored to the top of content screens and faded into the paper background.
 * Brand-tinted, non-interactive — decorative only, so it never blocks content
 * or input. SVG only (no binary assets, no extra deps). Visible-but-soft so
 * text stays readable on top.
 */
export function SkylineBackdrop({
  opacity = 0.22,
  height = 300,
}: {
  opacity?: number;
  height?: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, height, opacity }}>
      <Svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMin slice">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.gold} stopOpacity="0.5" />
            <Stop offset="1" stopColor={color.gold} stopOpacity="0" />
          </LinearGradient>
          <RadialGradient id="sun" cx="0.82" cy="0.26" r="0.55">
            <Stop offset="0" stopColor={color.gold} stopOpacity="0.95" />
            <Stop offset="1" stopColor={color.gold} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.paper} stopOpacity="0" />
            <Stop offset="1" stopColor={color.paper} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* warm sky wash + low sun */}
        <Rect x="0" y="0" width="400" height="300" fill="url(#sky)" />
        <Circle cx="328" cy="78" r="130" fill="url(#sun)" />
        <Circle cx="328" cy="78" r="36" fill={color.gold} />

        {/* cohesive skyline silhouette — charcoal with subtle goldDeep depth */}
        <Rect x="6" y="158" width="48" height="104" rx="3" fill={color.charcoal} />
        <Rect x="60" y="120" width="40" height="142" rx="3" fill={color.charcoal} />
        <Rect x="106" y="176" width="42" height="86" rx="3" fill={color.goldDeep} />
        <Rect x="154" y="132" width="34" height="130" rx="3" fill={color.charcoal} />
        <Rect x="194" y="186" width="50" height="76" rx="3" fill={color.charcoal} />
        <Rect x="250" y="150" width="36" height="112" rx="3" fill={color.goldDeep} />
        <Rect x="292" y="190" width="46" height="72" rx="3" fill={color.charcoal} />
        <Rect x="344" y="162" width="40" height="100" rx="3" fill={color.charcoal} />

        {/* fade the whole scene into the page so content above stays readable */}
        <Rect x="0" y="150" width="400" height="150" fill="url(#fade)" />
        <Path d="M0 258 H400 V300 H0 Z" fill={color.paper} />
      </Svg>
    </View>
  );
}
