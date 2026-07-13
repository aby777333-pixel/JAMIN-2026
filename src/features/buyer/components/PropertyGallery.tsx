import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Dimensions, Linking, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';
import { plotFallbackSetFor } from './plotFallbacks';

const GAP = 12;
const HEIGHT = 200;
const VIDEO_RE = /\.(mp4|mov|m4v|webm|3gp|mkv)(\?|#|$)/i;

type Slide =
  | { kind: 'image'; uri: string }
  | { kind: 'video'; uri: string }
  | { kind: 'fallback'; src: number };

function toUrls(media: unknown): string[] {
  if (!Array.isArray(media)) return [];
  return media
    .map((m) => (typeof m === 'string' ? m : m && typeof m === 'object' && 'url' in m ? String((m as { url: unknown }).url) : null))
    .filter((x): x is string => !!x);
}

/**
 * Swipeable media gallery with left/right arrows and dots. Pages snap to
 * exactly one slide with a gap between slides, so the next photo never bleeds
 * into the current one. Plots without uploaded media show a labelled set of
 * bundled land photos; video entries render as a tappable play tile.
 */
export function PropertyGallery({ media, code }: { media: unknown; code: string }) {
  const w = Dimensions.get('window').width - 40;
  const urls = toUrls(media);
  const slides: Slide[] = urls.length
    ? urls.map((u) => (VIDEO_RE.test(u) ? { kind: 'video' as const, uri: u } : { kind: 'image' as const, uri: u }))
    : plotFallbackSetFor(code).map((src) => ({ kind: 'fallback' as const, src }));

  const ref = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  function goTo(i: number) {
    const next = Math.max(0, Math.min(slides.length - 1, i));
    ref.current?.scrollTo({ x: next * (w + GAP), animated: true });
    setIndex(next);
  }

  const arrow = (dir: 'back' | 'forward') => (
    <Pressable
      onPress={() => goTo(dir === 'back' ? index - 1 : index + 1)}
      hitSlop={8}
      style={{
        position: 'absolute',
        top: HEIGHT / 2 - 16,
        [dir === 'back' ? 'left' : 'right']: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(26,26,26,.55)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Ionicons name={dir === 'back' ? 'chevron-back' : 'chevron-forward'} size={19} color="#FFFFFF" />
    </Pressable>
  );

  return (
    <View style={{ width: w, alignSelf: 'center' }}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={w + GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={(e) =>
          setIndex(Math.max(0, Math.min(slides.length - 1, Math.round(e.nativeEvent.contentOffset.x / (w + GAP)))))
        }
        style={{ width: w }}>
        {slides.map((s, i) => (
          <View
            key={i}
            style={{ width: w, height: HEIGHT, marginRight: i < slides.length - 1 ? GAP : 0, borderRadius: 16, overflow: 'hidden' }}>
            {s.kind === 'video' ? (
              <Pressable
                onPress={() => void Linking.openURL(s.uri).catch(() => {})}
                className="flex-1 items-center justify-center bg-charcoal">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-white/15">
                  <Ionicons name="play" size={26} color="#FFFFFF" />
                </View>
                <Text className="mt-2 text-[12px] font-semibold text-white">Play video</Text>
              </Pressable>
            ) : (
              <Image
                source={s.kind === 'image' ? { uri: s.uri } : s.src}
                style={{ width: w, height: HEIGHT }}
                contentFit="cover"
              />
            )}
            {s.kind === 'fallback' ? (
              <View className="absolute left-2 top-2 rounded-full bg-[#1A1A1A]/70 px-2.5 py-1">
                <Text className="text-[10px] font-semibold text-white">
                  Representative image · actual photos coming soon
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      {slides.length > 1 && index > 0 ? arrow('back') : null}
      {slides.length > 1 && index < slides.length - 1 ? arrow('forward') : null}

      {slides.length > 1 ? (
        <View
          style={{ position: 'absolute', bottom: 8, left: 0, right: 0 }}
          className="flex-row items-center justify-center gap-1.5">
          {slides.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === index ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === index ? color.gold : 'rgba(255,255,255,.6)',
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
