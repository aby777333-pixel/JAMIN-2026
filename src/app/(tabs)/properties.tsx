import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

export default function Properties() {
  const { t } = useTranslation();
  return (
    <Screen scroll={false} contentClassName="pt-4">
      <Text variant="h1">{t('tabs.properties')}</Text>
      <View className="mt-3">
        <Input placeholder="Search projects, plots, locations…" autoCapitalize="none" />
      </View>
      <EmptyState
        icon="business"
        title="Inventory is on the way"
        body="Dynamic projects, plans, property types and live plot codes — with map search, tours, EMI/ROI calculators and booking."
        phase="Phase 3 · Buyer App"
      />
    </Screen>
  );
}
