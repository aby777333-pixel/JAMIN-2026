import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useForms } from '@/features/admin/hooks';
import { color } from '@/theme/tokens';

export default function FormsList() {
  const { data: forms = [], isLoading } = useForms();
  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title="Form Builder" />
      <Text variant="caption">
        Every form is dynamic. Add, edit and reorder fields — changes apply across the app instantly.
      </Text>
      {isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={color.red} />
        </View>
      ) : (
        forms.map((f) => (
          <Pressable key={f.id} onPress={() => router.push(`/admin/forms/${f.id}`)}>
            <Card className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-red/10">
                <Ionicons name="construct" size={20} color={color.red} />
              </View>
              <View className="flex-1">
                <Text variant="title">{f.name}</Text>
                <Text variant="caption">
                  {f.key} · {f.fields?.length ?? 0} fields
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.muted} />
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
