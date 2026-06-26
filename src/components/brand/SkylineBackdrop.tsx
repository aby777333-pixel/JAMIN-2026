import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { color } from '@/theme/tokens';

/**
 * Subtle real-estate skyline motif (buildings + a low sun) for the top of
 * content screens. Brand-tinted, very low opacity, anchored top and
 * non-interactive — purely decorative so it never interferes with content
 * or input. Mirrors the FieldsBackdrop pattern (no binary assets, SVG only).
 */
export function SkylineBackdrop({
  opacity = 0.07,
  height = 220,
}: {
  opacity?: number;
  height?: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, height, opacity }}>
      <Svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="xMidYMin slice">
        {/* low sun */}
        <Circle cx="330" cy="58" r="40" fill={color.gold} />
        {/* skyline silhouette */}
        <Rect x="18" y="120" width="44" height="92" rx="3" fill={color.charcoal} />
        <Rect x="70" y="92" width="36" height="120" rx="3" fill={color.goldDeep} />
        <Rect x="114" y="138" width="40" height="74" rx="3" fill={color.charcoal} />
        <Rect x="162" y="104" width="32" height="108" rx="3" fill={color.red} />
        <Rect x="202" y="148" width="46" height="64" rx="3" fill={color.charcoal} />
        <Rect x="256" y="118" width="34" height="94" rx="3" fill={color.goldDeep} />
        <Rect x="298" y="150" width="42" height="62" rx="3" fill={color.charcoal} />
        <Rect x="348" y="128" width="36" height="84" rx="3" fill={color.red} />
        {/* ground line */}
        <Path d="M0 210 H400 V220 H0 Z" fill={color.charcoal} />
      </Svg>
    </View>
  );
}
