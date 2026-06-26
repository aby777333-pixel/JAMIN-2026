import { View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { color } from '@/theme/tokens';

/**
 * Cartoon countryside hero (blue sky, clouds, rolling green farmland, cottages,
 * a cypress and a dirt road) — on brand for JAMIN ("land"). Anchored to the top
 * of a screen and faded into the paper background so content stays readable.
 * Pure SVG (no binary asset, no extra deps). Decorative + non-interactive.
 */
export function CountrysideBackdrop({
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
          <LinearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#BFE8FF" />
            <Stop offset="1" stopColor="#E8F6FF" />
          </LinearGradient>
          <LinearGradient id="cs-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.paper} stopOpacity="0" />
            <Stop offset="0.75" stopColor={color.paper} stopOpacity="0" />
            <Stop offset="1" stopColor={color.paper} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* sky */}
        <Rect x="0" y="0" width="400" height="250" fill="url(#cs-sky)" />

        {/* clouds */}
        <Ellipse cx="90" cy="48" rx="34" ry="14" fill="#FFFFFF" opacity="0.9" />
        <Ellipse cx="120" cy="42" rx="26" ry="13" fill="#FFFFFF" opacity="0.9" />
        <Ellipse cx="300" cy="34" rx="38" ry="15" fill="#FFFFFF" opacity="0.85" />
        <Ellipse cx="335" cy="40" rx="24" ry="11" fill="#FFFFFF" opacity="0.85" />

        {/* far rolling hills */}
        <Path d="M0 150 Q90 120 190 142 T400 132 V250 H0 Z" fill="#A8D672" />
        {/* mid hills */}
        <Path d="M0 178 Q110 150 230 174 T400 166 V250 H0 Z" fill="#8CC850" />
        {/* near hills */}
        <Path d="M0 206 Q120 184 250 204 T400 196 V250 H0 Z" fill="#6FB23E" />

        {/* dirt road sweeping up from bottom */}
        <Path d="M150 250 Q205 210 240 196 Q262 188 300 196 L330 250 Z" fill="#D8C49A" />
        <Path d="M170 250 Q210 216 242 202 L256 206 Q220 220 196 250 Z" fill="#C9B07E" opacity="0.7" />

        {/* left cottage */}
        <Rect x="78" y="150" width="44" height="34" rx="2" fill="#EADBB8" />
        <Path d="M72 150 L100 132 L128 150 Z" fill="#B5654A" />
        <Rect x="92" y="162" width="12" height="22" fill="#9C5B43" />
        {/* right cottage */}
        <Rect x="300" y="156" width="34" height="26" rx="2" fill="#EADBB8" />
        <Path d="M296 156 L317 142 L338 156 Z" fill="#B5654A" />

        {/* trees */}
        <Ellipse cx="150" cy="170" rx="16" ry="18" fill="#4E9A45" />
        <Ellipse cx="262" cy="176" rx="14" ry="16" fill="#57A84B" />
        {/* tall cypress on the right */}
        <Path d="M372 130 Q384 158 380 196 L364 196 Q360 158 372 130 Z" fill="#3E7D3A" />
        <Rect x="370" y="194" width="4" height="10" fill="#7A5A3A" />

        {/* fence near the road */}
        <Rect x="40" y="196" width="2" height="14" fill="#8B6F47" />
        <Rect x="60" y="198" width="2" height="14" fill="#8B6F47" />
        <Rect x="80" y="200" width="2" height="14" fill="#8B6F47" />
        <Rect x="40" y="200" width="42" height="2" fill="#8B6F47" />

        {/* fade into the page so text above the fold stays readable */}
        <Rect x="0" y="0" width="400" height="250" fill="url(#cs-fade)" />
      </Svg>
    </View>
  );
}
