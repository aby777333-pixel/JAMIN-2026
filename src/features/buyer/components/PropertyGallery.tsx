import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Dimensions, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';

function toUrls(media: unknown): string[] {
  if (!Array.isArray(media)) return [];
  return media
    .map((m) => (typeof m === 'string' ? m : m && typeof m === 'object' && 'url' in m ? String((m as { url: unknown }).url) : null))
    .filter((x): x is string => !!x);
}

export function PropertyGallery({ media, code }: { media: unknown; code: string }) {
  const urls = toUrls(media);
  const w = Dimensions.get('window').width - 40;

  if (urls.length === 0) {
    return (
      <View
        className="items-center justify-center rounded-2xl bg-charcoal"
        style={{ height: 200 }}>
        <Ionicons name="business" size={40} color={color.gold} />
        <Text className="mt-2 font-mono-bold text-[13px] text-gold">{code}</Text>
        <Text className="text-[11px] text-white/50">Photos coming soon</Text>
      </View>
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
