import { ActivityIndicator, Image, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useMySubmissions } from '@/features/submissions/hooks';
import { color } from '@/theme/tokens';

/** Partner's own photo submissions and their admin review status. */
export default function MySubmissions() {
  const { data: items = [], isLoading } = useMySubmissions();

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title="My photo submissions" />
      {isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={color.red} />
        </View>
      ) : items.length === 0 ? (
        <Text variant="body" className="text-muted">
          No submissions yet. Open a property and tap “Suggest a photo”.
        </Text>
      ) : (
        items.map((s) => (
          <Card key={s.id} className="flex-row items-center gap-3">
            <Image source={{ uri: s.url }} style={{ width: 56, height: 56, borderRadius: 8 }} resizeMode="cover" />
            <View className="flex-1">
              <Text variant="title" className="text-[14px]">
                {s.property?.plot_code ?? 'Property'}
              </Text>
              <Text variant="caption">{new Date(s.created_at).toLocaleDateString()}</Text>
            </View>
            <Badge
              label={s.status}
              tone={s.status === 'approved' ? 'available' : s.status === 'rejected' ? 'sold' : 'reserved'}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
