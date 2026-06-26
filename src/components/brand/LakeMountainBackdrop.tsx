import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { color } from '@/theme/tokens';

/**
 * Snow-capped mountains + lake + red barn (SVG recreation of the requested
 * landscape). Anchored top, faded into the paper background. No binary asset,
 * no extra deps. Decorative + non-interactive.
 */
export function LakeMountainBackdrop({
  opacity = 0.6,
  height = 250,
}: {
  opacity?: number;
  height?: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0, height, opacity }}>
      <Svg width="100%" height="100%" viewBox="0 0 400 250" preserveAspectRatio="xMidYMin slice">
        <Defs>
          <LinearGradient id="lm-sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7FC4F5" />
            <Stop offset="1" stopColor="#D6EEFB" />
          </LinearGradient>
          <LinearGradient id="lm-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.paper} stopOpacity="0" />
            <Stop offset="0.72" stopColor={color.paper} stopOpacity="0" />
            <Stop offset="1" stopColor={color.paper} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width="400" height="250" fill="url(#lm-sky)" />
        <Circle cx="300" cy="58" r="26" fill="#FFFFFF" />

        {/* back mountains */}
        <Path d="M-10 150 L60 78 L130 150 Z" fill="#9FB4C9" />
        <Path d="M90 150 L175 70 L260 150 Z" fill="#8AA2BC" />
        <Path d="M210 150 L300 84 L400 150 L400 150 Z" fill="#A6BACE" />
        {/* snow caps */}
        <Path d="M60 78 L44 96 L60 92 L74 100 L90 86 Z" fill="#FFFFFF" />
        <Path d="M175 70 L158 92 L175 86 L192 96 L208 80 Z" fill="#FFFFFF" />
        <Path d="M300 84 L286 100 L300 96 L314 104 L328 92 Z" fill="#FFFFFF" />

        {/* lake */}
        <Rect x="0" y="150" width="400" height="34" fill="#BFE3F2" />
        <Rect x="60" y="160" width="220" height="4" rx="2" fill="#FFFFFF" opacity="0.5" />

        {/* foreground meadow */}
        <Path d="M0 178 Q120 168 240 182 T400 176 V250 H0 Z" fill="#7CC24A" />
        <Path d="M0 206 Q140 196 280 208 T400 202 V250 H0 Z" fill="#5FA836" />

        {/* red barn */}
        <Rect x="296" y="150" width="40" height="28" fill="#D23B2E" />
        <Path d="M292 150 L316 134 L340 150 Z" fill="#A82B22" />
        <Rect x="310" y="160" width="12" height="18" fill="#7E1E18" />
        {/* trees */}
        <Path d="M70 178 L82 150 L94 178 Z" fill="#3E8F3A" />
        <Path d="M250 184 L262 158 L274 184 Z" fill="#3E8F3A" />

        <Rect x="0" y="0" width="400" height="250" fill="url(#lm-fade)" />
      </Svg>
    </View>
  );
}
