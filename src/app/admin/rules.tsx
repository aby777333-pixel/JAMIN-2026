import { ActivityIndicator, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useRules, useToggleRule } from '@/features/admin/hooks';
import { color } from '@/theme/tokens';

function formulaLabel(f: { type?: string; value?: number }) {
  if (f.type === 'percent') return `${f.value ?? 0}%`;
  if (f.type === 'flat') return `₹${f.value ?? 0}`;
  if (f.type === 'slab') return 'Slab';
  return f.type ?? '—';
}

export default function AdminRules() {
  const { data: rules = [], isLoading } = useRules();
  const toggle = useToggleRule();

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title="Commission rules" />
      <Text variant="caption">
        Dynamic, priority-ordered rules. The engine credits the selling agent and team overrides up
        the hierarchy on every closed sale.
      </Text>
      {isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={color.red} />
        </View>
      ) : (
        rules.map((r) => (
          <Card key={r.id} className="flex-row items-center gap-3">
            <View className="flex-1">
              <Text variant="title" numberOfLines={1}>
                {r.name}
              </Text>
              <Text variant="caption">
                {r.scope} · {formulaLabel(r.formula)} · priority {r.priority}
              </Text>
            </View>
            <Pressable onPress={() => toggle.mutate({ id: r.id, active: !r.active })} hitSlop={8}>
              <Ionicons
                name={r.active ? 'toggle' : 'toggle-outline'}
                size={34}
                color={r.active ? color.success : color.muted}
              />
            </Pressable>
          </Card>
        ))
      )}
    </Screen>
  );
}
