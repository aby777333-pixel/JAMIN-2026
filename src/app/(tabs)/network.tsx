import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

export default function Network() {
  return (
    <Screen scroll={false} contentClassName="pt-4">
      <Text variant="h1">Network</Text>
      <EmptyState
        icon="people"
        title="Your team, mapped"
        body="The full referral hierarchy from you down — recruitment, team performance, territory and commission tracking across unlimited levels."
        phase="Phase 2 · Hierarchy & RLS"
      />
    </Screen>
  );
}
