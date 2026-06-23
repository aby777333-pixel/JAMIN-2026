import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { useBrochureTemplates, type BrochureTemplate } from '@/features/marketing/brochures';
import { color } from '@/theme/tokens';

export default function BrochureLibrary() {
  const insets = useSafeAreaInsets();
  const { data: templates = [], isLoading } = useBrochureTemplates();

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
          <Text variant="caption" className="pb-1">
            Brand-controlled designs that auto-fill with your name, photo, referral QR and branding.
          </Text>
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
