import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Linking, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { useBrochureTemplates, type BrochureTemplate } from '@/features/marketing/brochures';
import { useMarketingAssets, type MarketingAsset } from '@/features/marketing/assets';
import { color } from '@/theme/tokens';

const KIND_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  brochure: 'document-text',
  flyer: 'newspaper',
  poster: 'image',
};

export default function BrochureLibrary() {
  const insets = useSafeAreaInsets();
  const { data: templates = [], isLoading } = useBrochureTemplates();
  const { data: assets = [] } = useMarketingAssets();

  return (
    <View className="flex-1 bg-paper" style={{ paddingTop: insets.top }}>
      <View className="px-5">
        <BackHeader title="Smart Brochures" />
      </View>
      <FlatList
        data={templates}
        keyExtractor={(t) => t.id}
        contentContainerClassName="px-5 pb-8 gap-3 pt-1"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="gap-2 pb-1">
            {assets.length > 0 ? (
              <View className="gap-2">
                <Text variant="label">Brochures, flyers & posters</Text>
                {assets.map((a) => (
                  <AssetRow key={a.id} a={a} />
                ))}
                <Text variant="label" className="mt-3">Smart designs</Text>
              </View>
            ) : null}
            <Text variant="caption" className="pb-1">
              Brand-controlled designs that auto-fill with your name, photo, referral QR and branding.
            </Text>
          </View>
        }
        renderItem={({ item }) => <BrochureRow t={item} />}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator color={color.red} />
            </View>
          ) : (
            <EmptyState icon="document-text" title="No brochures yet" body="Your admin publishes designs here." />
          )
        }
      />
    </View>
  );
}

function AssetRow({ a }: { a: MarketingAsset }) {
  return (
    <Pressable onPress={() => Linking.openURL(a.file_url).catch(() => {})}>
      <Card className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-gold/15">
          <Ionicons name={KIND_ICON[a.kind] ?? 'document'} size={22} color={color.goldDeep} />
        </View>
        <View className="flex-1">
          <Text variant="title" numberOfLines={1}>{a.title}</Text>
          <Text variant="caption" className="capitalize">{a.kind} · tap to open</Text>
        </View>
        <Ionicons name="download-outline" size={20} color={color.muted} />
      </Card>
    </Pressable>
  );
}

function BrochureRow({ t }: { t: BrochureTemplate }) {
  const accent = t.config.accent ?? color.red;
  return (
    <Pressable onPress={() => router.push(`/brochures/${t.id}`)}>
      <Card className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}22` }}>
          <Ionicons name="document-text" size={22} color={accent} />
        </View>
        <View className="flex-1">
          <Text variant="title" numberOfLines={1}>
            {t.name}
          </Text>
          {t.config.headline ? (
            <Text variant="caption" numberOfLines={1}>
              {t.config.headline}
            </Text>
          ) : null}
        </View>
        <Badge label={t.kind} />
      </Card>
    </Pressable>
  );
}
