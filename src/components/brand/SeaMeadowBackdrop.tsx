import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { color } from '@/theme/tokens';

/**
 * Sea horizon + green meadow + white cottage + pines (SVG recreation of the
 * requested coastal landscape). Anchored top, faded into the page. No binary
 * asset, no extra deps. Decorative + non-interactive.
 */
export function SeaMeadowBackdrop({
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
          <LinearGradient id="sm-sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#86C9F2" />
            <Stop offset="1" stopColor="#DCF0FB" />
          </LinearGradient>
          <LinearGradient id="sm-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.paper} stopOpacity="0" />
            <Stop offset="0.72" stopColor={color.paper} stopOpacity="0" />
            <Stop offset="1" stopColor={color.paper} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width="400" height="250" fill="url(#sm-sky)" />
        <Circle cx="208" cy="54" r="22" fill="#FBF6D8" />
        {/* clouds */}
        <Ellipse cx="80" cy="62" rx="40" ry="15" fill="#FFFFFF" opacity="0.9" />
        <Ellipse cx="320" cy="58" rx="44" ry="16" fill="#FFFFFF" opacity="0.88" />

        {/* sea band */}
        <Rect x="0" y="120" width="400" height="40" fill="#9FC6D8" />
        <Rect x="120" y="134" width="170" height="5" rx="2" fill="#FFFFFF" opacity="0.55" />

        {/* meadow */}
        <Path d="M0 150 Q110 138 230 156 T400 150 V250 H0 Z" fill="#86C84F" />
        <Path d="M0 184 Q130 172 260 188 T400 182 V250 H0 Z" fill="#69AE38" />

        {/* white cottage right */}
        <Rect x="300" y="138" width="40" height="26" fill="#F4F1EA" />
        <Path d="M296 138 L320 124 L344 138 Z" fill="#C0463A" />
        <Rect x="312" y="148" width="10" height="16" fill="#9A6A4A" />

        {/* pines left + right */}
        <Path d="M30 150 L44 116 L58 150 Z" fill="#2F7D3C" />
        <Path d="M52 152 L66 122 L80 152 Z" fill="#3C8F46" />
        <Path d="M360 150 L374 120 L388 150 Z" fill="#2F7D3C" />
        {/* round tree */}
        <Ellipse cx="96" cy="132" rx="20" ry="22" fill="#3F9444" />
        <Rect x="93" y="150" width="6" height="10" fill="#7A5A3A" />

        <Rect x="0" y="0" width="400" height="250" fill="url(#sm-fade)" />
      </Svg>
    </View>
  );
}
