import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { color } from '@/theme/tokens';

/**
 * Subtle farmland/countryside motif (rolling fields + a low sun) for sparse
 * backgrounds (auth screens). Brand-tinted, very low opacity, non-interactive —
 * purely decorative so it never interferes with content or input.
 */
export function FieldsBackdrop({ opacity = 0.1, height = '52%' as const }: { opacity?: number; height?: number | string }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: -24, right: -24, bottom: 0, height: height as number, opacity }}>
      <Svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice">
        {/* low sun */}
        <Circle cx="318" cy="78" r="32" fill={color.gold} />
        {/* layered fields */}
        <Path d="M0 196 Q100 158 200 192 T400 182 V300 H0 Z" fill={color.goldDeep} />
        <Path d="M0 232 Q120 202 240 230 T400 222 V300 H0 Z" fill={color.red} />
        <Path d="M0 268 Q140 248 280 266 T400 260 V300 H0 Z" fill={color.charcoal} />
      </Svg>
    </View>
  );
}
