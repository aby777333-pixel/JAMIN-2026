import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useConfig } from '@/features/config/hooks';
import { type BuyStep, useJourney, useSetJourneyStep } from './hooks';
import { color } from '@/theme/tokens';

const DEFAULT_STEPS: BuyStep[] = [
  { key: 'enquiry', label: 'Enquiry made' },
  { key: 'visit', label: 'Site visit done' },
  { key: 'offer', label: 'Offer made' },
  { key: 'token', label: 'Token / booking paid' },
  { key: 'loan', label: 'Loan / funds ready' },
  { key: 'agreement', label: 'Agreement signed' },
  { key: 'registration', label: 'Registration done' },
  { key: 'handover', label: 'Possession / handover' },
];

/** Buyer's "steps to buy" checklist for a property. Steps are admin-configurable. */
export function JourneyTracker({ propertyId }: { propertyId: string }) {
  const { data: steps = DEFAULT_STEPS } = useConfig<BuyStep[]>('buy_steps', DEFAULT_STEPS);
  const { data: done = {} } = useJourney(propertyId);
  const setStep = useSetJourneyStep(propertyId);

  const completed = steps.filter((s) => done[s.key]).length;
  const pct = steps.length ? Math.round((completed / steps.length) * 100) : 0;

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="title" className="text-[14px]">Your steps to buy</Text>
        <Text variant="caption">{completed}/{steps.length} · {pct}%</Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-paper">
        <View className="h-2 rounded-full bg-success" style={{ width: `${pct}%` }} />
      </View>
      {steps.map((s) => {
        const isDone = !!done[s.key];
        return (
          <Pressable
            key={s.key}
            onPress={() => setStep.mutate({ stepKey: s.key, done: !isDone })}
            className="flex-row items-center gap-2.5">
            <Ionicons
              name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={isDone ? color.success : color.muted}
            />
            <Text variant="body" className={`text-[14px] ${isDone ? 'text-muted line-through' : 'text-ink'}`}>
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </Card>
  );
}
