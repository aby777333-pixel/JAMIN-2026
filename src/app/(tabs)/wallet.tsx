import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

export default function Wallet() {
  const { t } = useTranslation();
  return (
    <Screen contentClassName="pt-4 gap-4">
      <Text variant="h1">{t('tabs.wallet')}</Text>

      <Card className="bg-charcoal">
        <Text className="font-medium text-[12px] uppercase tracking-[2px] text-gold">
          {t('wallet.balance')}
        </Text>
        <MoneyText value={0} className="mt-1 text-[32px] text-white" />
        <View className="mt-4">
          <Button title={t('wallet.withdraw')} variant="secondary" disabled />
        </View>
      </Card>

      <EmptyState
        icon="wallet"
        title="Ledger-first wallet"
        body="Every commission is computed with exact decimal math and appended to an immutable ledger. Withdrawals settle through a pluggable UPI/PSP rail."
        phase="Phase 5 · Commission Engine"
      />
    </Screen>
  );
}
