import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BG } from '@/components/brand/backgrounds';
import { ImageBackdrop } from '@/components/brand/ImageBackdrop';
import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useActiveForms } from '@/features/forms/api';
import { color } from '@/theme/tokens';

/**
 * Forms with a dedicated, context-rich screen elsewhere (property enquiry,
 * KYC, site-visit booking) are not duplicated in this generic hub.
 */
const HANDLED = new Set(['buyer', 'kyc', 'booking']);

export default function FormsHub() {
  const { data: forms = [], isLoading } = useActiveForms();
  const list = forms.filter((f) => !HANDLED.has(f.key));

  return (
    <Screen contentClassName="pb-10 gap-3" backdrop={<ImageBackdrop source={BG.forms} />}>
      <BackHeader title="Applications & Forms" />
      <Text variant="caption">
        Apply, submit and enquire. Every form here is live and reviewed by our team.
      </Text>

      {isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={color.red} />
        </View>
      ) : list.length === 0 ? (
        <Card>
          <Text variant="body" className="text-muted">
            No forms are available right now. Please check back soon.
          </Text>
        </Card>
      ) : (
        list.map((f) => (
          <Pressable key={f.id} onPress={() => router.push(`/forms/${f.key}`)}>
            <Card className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-red/10">
                <Ionicons name="document-text" size={20} color={color.red} />
              </View>
              <View className="flex-1">
                <Text variant="title">{f.name}</Text>
                <Text variant="caption">{f.fields?.length ?? 0} fields · tap to fill</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.muted} />
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
