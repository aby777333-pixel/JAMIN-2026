import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Rect, Stop } from 'react-native-svg';

import { color } from '@/theme/tokens';

/**
 * Green farm fields + barn + windmill (SVG recreation of the requested farm
 * landscape). Anchored top, faded into the page. No binary asset, no extra
 * deps. Decorative + non-interactive.
 */
export function FarmBackdrop({
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
          <LinearGradient id="fm-sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7FD0D6" />
            <Stop offset="1" stopColor="#E6F7E9" />
          </LinearGradient>
          <LinearGradient id="fm-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.paper} stopOpacity="0" />
            <Stop offset="0.72" stopColor={color.paper} stopOpacity="0" />
            <Stop offset="1" stopColor={color.paper} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width="400" height="250" fill="url(#fm-sky)" />

        {/* distant hills */}
        <Path d="M0 138 Q90 104 200 132 T400 122 V160 H0 Z" fill="#7FB8C6" opacity="0.7" />
        <Path d="M120 140 L170 96 L220 140 Z" fill="#6FA9B8" opacity="0.7" />

        {/* fields */}
        <Path d="M0 150 Q120 134 250 152 T400 144 V250 H0 Z" fill="#84C64C" />
        <Path d="M0 184 Q140 168 280 188 T400 180 V250 H0 Z" fill="#67AE37" />
        <Path d="M0 214 Q150 202 300 216 T400 210 V250 H0 Z" fill="#549A2C" />

        {/* barn */}
        <Rect x="232" y="150" width="44" height="28" fill="#EFE3C6" />
        <Path d="M228 150 Q254 132 280 150 Z" fill="#C24A33" />
        <Rect x="248" y="160" width="12" height="18" fill="#C24A33" />
        <Rect x="214" y="160" width="22" height="18" fill="#E4D6B6" />

        {/* windmill */}
        <Path d="M312 178 L318 132 L324 178 Z" fill="#5A4632" />
        <Circle cx="321" cy="130" r="3" fill="#3E3122" />
        <Line x1="321" y1="130" x2="321" y2="112" stroke="#3E3122" strokeWidth="3" />
        <Line x1="321" y1="130" x2="338" y2="138" stroke="#3E3122" strokeWidth="3" />
        <Line x1="321" y1="130" x2="306" y2="140" stroke="#3E3122" strokeWidth="3" />

        {/* tree + fence */}
        <Circle cx="60" cy="138" r="20" fill="#3F9444" />
        <Rect x="57" y="150" width="6" height="14" fill="#7A5A3A" />
        <Rect x="344" y="160" width="3" height="18" fill="#8B6F47" />
        <Rect x="362" y="160" width="3" height="18" fill="#8B6F47" />
        <Rect x="380" y="160" width="3" height="18" fill="#8B6F47" />
        <Rect x="344" y="164" width="42" height="3" fill="#8B6F47" />

        <Rect x="0" y="0" width="400" height="250" fill="url(#fm-fade)" />
      </Svg>
    </View>
  );
}
