import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';

import { BG } from '@/components/brand/backgrounds';
import { ImageBackdrop } from '@/components/brand/ImageBackdrop';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/features/buyer/components/EnquirySheet';
import { useRequestWithdrawal, useWalletSummary, useWithdrawals } from '@/features/wallet/hooks';
import type { LedgerEntry, Withdrawal } from '@/features/wallet/api';
import { formatINR, money } from '@/lib/money';

export default function Wallet() {
  const { t } = useTranslation();
  const { data: summary } = useWalletSummary();
  const { data: withdrawals = [] } = useWithdrawals();
  const [sheet, setSheet] = useState(false);

  const balance = summary?.balance ?? '0';

  return (
    <Screen contentClassName="pt-4 gap-4" keyboardAvoiding backdrop={<ImageBackdrop source={BG.wallet} />}>
      <Text variant="h1">{t('tabs.wallet')}</Text>

      <Card className="bg-charcoal">
        <Text className="font-medium text-[12px] uppercase tracking-[2px] text-gold">
          {t('wallet.balance')}
        </Text>
        <MoneyText value={balance} className="mt-1 text-[34px] text-white" />
        <View className="mt-3 flex-row items-center justify-between">
          <View>
            <Text className="text-[11px] uppercase tracking-[1px] text-white/50">Lifetime earnings</Text>
            <MoneyText value={summary?.earnings ?? '0'} className="text-[15px] text-white/90" />
          </View>
          <View className="w-40">
            <Button
              title={t('wallet.withdraw')}
              variant="secondary"
              onPress={() => setSheet(true)}
              disabled={money(balance).lte(0)}
            />
          </View>
        </View>
      </Card>

      <View>
        <Text variant="label" className="mb-2">
          Recent activity
        </Text>
        {summary && summary.ledger.length > 0 ? (
          <View className="gap-2">
            {summary.ledger.slice(0, 12).map((e) => (
              <LedgerRow key={e.id} entry={e} />
            ))}
          </View>
        ) : (
          <Card>
            <Text variant="body" className="text-muted">
              No commission yet. Earnings from your sales and team appear here.
            </Text>
          </Card>
        )}
      </View>

      {withdrawals.length > 0 ? (
        <View>
          <Text variant="label" className="mb-2">
            Withdrawals
          </Text>
          <View className="gap-2">
            {withdrawals.map((w) => (
              <WithdrawalRow key={w.id} w={w} />
            ))}
          </View>
        </View>
      ) : null}

      <WithdrawSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        balance={balance}
      />
    </Screen>
  );
}

function labelFor(ref: string): string {
  if (ref.startsWith('sale:')) return 'Sale commission';
  if (ref.startsWith('withdrawal:')) return 'Withdrawal';
  if (ref.startsWith('bonus:')) return 'Bonus';
  return ref;
}

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const credit = entry.direction === 'credit';
  return (
    <Card className="flex-row items-center justify-between py-3">
      <View className="flex-1 pr-3">
        <Text variant="title" className="text-[14px]">
          {labelFor(entry.source_ref)}
        </Text>
        <Text variant="caption">{new Date(entry.created_at).toLocaleDateString('en-IN')}</Text>
      </View>
      <Text className={`font-mono-bold text-[15px] ${credit ? 'text-success' : 'text-danger'}`}>
        {credit ? '+' : '−'}
        {formatINR(entry.amount)}
      </Text>
    </Card>
  );
}

function WithdrawalRow({ w }: { w: Withdrawal }) {
  return (
    <Card className="flex-row items-center justify-between py-3">
      <View className="flex-1 pr-3">
        <MoneyText value={w.amount} className="text-[15px]" />
        <Text variant="caption">
          {new Date(w.requested_at).toLocaleDateString('en-IN')}
          {w.rail ? ` · ${w.rail.toUpperCase()}` : ''}
        </Text>
      </View>
      <StatusPill status={w.status} />
    </Card>
  );
}

function WithdrawSheet({
  visible,
  onClose,
  balance,
}: {
  visible: boolean;
  onClose: () => void;
  balance: string;
}) {
  const request = useRequestWithdrawal();
  const [amount, setAmount] = useState('');
  const [rail, setRail] = useState('upi');

  async function submit() {
    const amt = money(amount || '0');
    if (amt.lte(0)) {
      Alert.alert('Enter an amount');
      return;
    }
    if (amt.gt(money(balance))) {
      Alert.alert('Amount exceeds balance', `Available: ${formatINR(balance)}`);
      return;
    }
    try {
      await request.mutateAsync({ amount: amt.toNumber(), rail });
      onClose();
      setAmount('');
      Alert.alert('Request submitted', 'Your withdrawal is pending approval.');
    } catch (e) {
      Alert.alert('Could not request', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Withdraw">
      <View className="gap-4">
        <Text variant="caption">Available {formatINR(balance)}</Text>
        <Input
          label="Amount (₹)"
          value={amount}
          onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ''))}
          keyboardType="numeric"
          autoFocus
        />
        <View className="gap-1.5">
          <Text variant="label">Payout rail</Text>
          <View className="flex-row gap-2">
            <Chip label="UPI" active={rail === 'upi'} onPress={() => setRail('upi')} />
            <Chip label="Bank transfer" active={rail === 'bank'} onPress={() => setRail('bank')} />
          </View>
        </View>
        <Button title="Request withdrawal" loading={request.isPending} onPress={submit} />
      </View>
    </Sheet>
  );
}
