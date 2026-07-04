import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { accents, color } from '@/theme/tokens';

/**
 * Decorative plants & leaves (owner request: "more colorful, all pages,
 * plants and leaves over the tabs"). Pure decoration: absolutely positioned,
 * pointerEvents="none", fixed layouts (no randomness → no re-render jumps),
 * and rendered behind/beside content so nothing interactive is affected.
 */

type Sprig = {
  icon: keyof typeof Ionicons.glyphMap;
  size: number;
  c: string;
  op: number;
  rot: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
};

/** Soft botanical corners for every scrollable Screen (drawn under content). */
const PAGE_SPRIGS: Sprig[] = [
  { icon: 'leaf', size: 34, c: accents[3].main, op: 0.2, rot: '-35deg', top: 6, left: -6 },
  { icon: 'leaf-outline', size: 22, c: accents[4].main, op: 0.22, rot: '18deg', top: 40, left: 26 },
  { icon: 'flower-outline', size: 18, c: accents[7].main, op: 0.2, rot: '0deg', top: 14, left: 52 },
  { icon: 'leaf', size: 40, c: accents[3].main, op: 0.16, rot: '40deg', top: 2, right: -8 },
  { icon: 'flower', size: 16, c: color.gold, op: 0.24, rot: '15deg', top: 44, right: 30 },
  { icon: 'leaf-outline', size: 20, c: accents[4].main, op: 0.2, rot: '-20deg', top: 58, right: 8 },
];

export function ScreenPetals() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 90 }}>
      {PAGE_SPRIGS.map((s, i) => (
        <Ionicons
          key={i}
          name={s.icon}
          size={s.size}
          color={s.c}
          style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            right: s.right,
            opacity: s.op,
            transform: [{ rotate: s.rot }],
          }}
        />
      ))}
    </View>
  );
}

/** A vine of leaves & blossoms growing along the top edge of the tab bar. */
const GARDEN_SPRIGS: Sprig[] = [
  { icon: 'leaf', size: 18, c: accents[3].main, op: 0.5, rot: '-30deg', top: -2, left: 10 },
  { icon: 'flower-outline', size: 12, c: accents[0].main, op: 0.45, rot: '0deg', top: 2, left: 34 },
  { icon: 'leaf-outline', size: 14, c: accents[4].main, op: 0.5, rot: '25deg', top: -1, left: 54 },
  { icon: 'leaf', size: 16, c: accents[3].main, op: 0.4, rot: '15deg', top: 1, left: 96 },
  { icon: 'flower', size: 11, c: color.gold, op: 0.5, rot: '10deg', top: -2, left: 132 },
  { icon: 'leaf-outline', size: 15, c: accents[4].main, op: 0.45, rot: '-18deg', top: 2, left: 168 },
  { icon: 'leaf', size: 14, c: accents[3].main, op: 0.42, rot: '30deg', top: -2, left: 214 },
  { icon: 'flower-outline', size: 12, c: accents[7].main, op: 0.42, rot: '0deg', top: 1, left: 252 },
  { icon: 'leaf', size: 17, c: accents[4].main, op: 0.5, rot: '-25deg', top: -1, left: 290 },
  { icon: 'leaf-outline', size: 13, c: accents[3].main, op: 0.45, rot: '20deg', top: 2, left: 330 },
  { icon: 'flower', size: 11, c: accents[0].main, op: 0.4, rot: '12deg', top: -2, left: 366 },
  { icon: 'leaf', size: 15, c: accents[4].main, op: 0.45, rot: '-15deg', top: 0, left: 400 },
];

/**
 * Tab-bar background: white bar with the vine on its top edge and two soft
 * leaves in the corners. Used via the Tabs `tabBarBackground` option, so it
 * sits behind the tab items and never intercepts touches.
 */
export function TabGarden() {
  return (
    <View pointerEvents="none" style={{ flex: 1, backgroundColor: color.surface, overflow: 'hidden' }}>
      {GARDEN_SPRIGS.map((s, i) => (
        <Ionicons
          key={i}
          name={s.icon}
          size={s.size}
          color={s.c}
          style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            opacity: s.op,
            transform: [{ rotate: s.rot }],
          }}
        />
      ))}
      <Ionicons
        name="leaf"
        size={44}
        color={accents[3].main}
        style={{ position: 'absolute', bottom: -12, left: -12, opacity: 0.1, transform: [{ rotate: '35deg' }] }}
      />
      <Ionicons
        name="leaf"
        size={52}
        color={accents[4].main}
        style={{ position: 'absolute', bottom: -16, right: -14, opacity: 0.1, transform: [{ rotate: '-40deg' }] }}
      />
    </View>
  );
}
