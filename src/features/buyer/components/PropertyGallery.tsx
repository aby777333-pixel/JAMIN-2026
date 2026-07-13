import { Image } from 'expo-image';
import { Dimensions, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { plotFallbackSetFor } from './plotFallbacks';

function toUrls(media: unknown): string[] {
  if (!Array.isArray(media)) return [];
  return media
    .map((m) => (typeof m === 'string' ? m : m && typeof m === 'object' && 'url' in m ? String((m as { url: unknown }).url) : null))
    .filter((x): x is string => !!x);
}

export function PropertyGallery({ media, code }: { media: unknown; code: string }) {
  const urls = toUrls(media);
  const w = Dimensions.get('window').width - 40;

  // No uploaded photos yet → a scrollable set of bundled land photos (stable
  // per plot code) instead of a dark empty block. Labelled so buyers know
  // these are representative, not the actual plot.
  if (urls.length === 0) {
    const fallbacks = plotFallbackSetFor(code);
    return (
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} className="rounded-2xl">
        {fallbacks.map((src, i) => (
          <View key={i} style={{ width: w, height: 200 }}>
            <Image source={src} style={{ width: w, height: 200, borderRadius: 16 }} contentFit="cover" />
            <View className="absolute bottom-2 left-2 rounded-full bg-[#1A1A1A]/70 px-2.5 py-1">
              <Text className="text-[10px] font-semibold text-white">
                Representative image · actual photos coming soon
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} className="rounded-2xl">
      {urls.map((u, i) => (
        <Image
          key={i}
          source={{ uri: u }}
          style={{ width: w, height: 200, borderRadius: 16 }}
          contentFit="cover"
        />
      ))}
    </ScrollView>
  );
}
