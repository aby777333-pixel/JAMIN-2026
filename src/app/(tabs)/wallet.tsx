import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Disclosure } from '@/components/ui/Disclosure';
import { category } from '@/theme/tokens';
import { Input } from '@/components/ui/Input';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/features/buyer/components/EnquirySheet';
import { useMyBookings } from '@/features/payments/hooks';
import { useRequestWithdrawal, useWalletSummary, useWithdrawals } from '@/features/wallet/hooks';
import type { LedgerEntry, Withdrawal } from '@/features/wallet/api';
import { exportCommissionCsv, exportCommissionStatement } from '@/features/wallet/statement';
import { can } from '@/lib/access';
import { useAuth } from '@/stores/auth';
import { formatINR, money } from '@/lib/money';
import { errMessage } from '@/lib/errors';

/**
 * Investments tab (simplification brief §6). One screen, one job per role:
 * partners track commission earnings and withdraw; buyers track what they've
 * put into their bookings. Raw ledger rows sit behind a Details disclosure.
 */
export default function Investments() {
  const profile = useAuth((s) => s.profile);
  return can(profile, 'sell') ? <PartnerWallet /> : <BuyerInvestments />;
}

/** Buyer view — primary value, one line, one action (brief §4). */
function BuyerInvestments() {
  const { data: bookings = [] } = useMyBookings();

  const paidBookings = bookings.filter((b) => b.payments.some((p) => p.status === 'paid'));
  const invested = paidBookings.reduce((sum, b) => sum.plus(money(b.amount ?? 0)), money(0));
  const open = bookings.filter(
    (b) => Number(b.amount) > 0 && !b.payments.some((p) => p.status === 'paid'),
  ).length;

  return (
    <Screen contentClassName="pt-4 gap-4">
      <Text variant="h1">Investments</Text>

      <Card className="bg-charcoal">
        <Text className="font-medium text-[12px] uppercase tracking-[2px] text-gold">
          Total invested
        </Text>
        <MoneyText value={invested.toString()} className="mt-1 text-[34px] text-white" />
        <Text className="mt-1 text-[13px] text-white/70">
          {paidBookings.length > 0
            ? `Across ${paidBookings.length} verified booking payment${paidBookings.length === 1 ? '' : 's'}.`
            : 'Verified booking payments appear here.'}
          {open > 0 ? ` ${open} payment${open === 1 ? '' : 's'} pending.` : ''}
        </Text>
      </Card>

      <Button title="Bookings & payments" onPress={() => router.push('/payments')} />
      <Button title="My offers" variant="outline" onPress={() => router.push('/offers')} />
      <Button
        title="Escrow & milestones"
        variant="outline"
        onPress={() => router.push('/escrow')}
      />
    </Screen>
  );
}

/** Partner view — balance + withdraw up top; ledger & payouts behind Details. */
function PartnerWallet() {
  const { t } = useTranslation();
  const { data: summary } = useWalletSummary();
  const { data: withdrawals = [] } = useWithdrawals();
  const agentName = useAuth((s) => s.profile?.full_name) ?? 'Agent';
  const [sheet, setSheet] = useState(false);

  async function downloadStatement() {
    if (!summary) return;
    try {
      await exportCommissionStatement(summary, agentName);
    } catch (e) {
      Alert.alert('Could not export', errMessage(e));
    }
  }

  async function downloadCsv() {
    if (!summary) return;
    try {
      await exportCommissionCsv(summary);
    } catch (e) {
      Alert.alert('Could not export', errMessage(e));
    }
  }

  const balance = summary?.balance ?? '0';

  return (
    <Screen contentClassName="pt-4 gap-4" keyboardAvoiding>
      <Text variant="h1">Investments</Text>

      <Card className="bg-charcoal">
        <Text className="font-medium text-[12px] uppercase tracking-[2px] text-gold">
          {t('wallet.balance')}
        </Text>
        <MoneyText value={balance} className="mt-1 text-[34px] text-white" />
        <View className="mt-3 flex-row items-center justify-between">
          <View>
            <Text className="text-[11px] uppercase tracking-[1px] text-white/50">
              Lifetime earnings
            </Text>
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

      <Button
        title="My bookings & payments"
        variant="outline"
        onPress={() => router.push('/payments')}
      />

      <Disclosure
        icon="receipt"
        accent={category.finance}
        title="Transactions"
        subtitle="Commission ledger, statement and payout history">
        {summary && summary.ledger.length > 0 ? (
          <Button title="Download statement (PDF)" variant="outline" onPress={downloadStatement} />
        ) : null}
        {summary && summary.ledger.length > 0 ? (
          <Button
            title={t('wallet.exportCsv', { defaultValue: 'Excel (CSV)' })}
            variant="outline"
            onPress={downloadCsv}
          />
        ) : null}

        {summary && summary.ledger.length > 0 ? (
          <View className="gap-2">
            {summary.ledger.slice(0, 12).map((e) => (
              <LedgerRow key={e.id} entry={e} />
            ))}
          </View>
        ) : (
          <Text variant="body" className="text-muted">
            No commission yet. Earnings from your sales and team appear here.
          </Text>
        )}

        {withdrawals.length > 0 ? (
          <View className="gap-2">
            <Text variant="label">Withdrawals</Text>
            {withdrawals.map((w) => (
              <WithdrawalRow key={w.id} w={w} />
            ))}
          </View>
        ) : null}
      </Disclosure>

      <WithdrawSheet visible={sheet} onClose={() => setSheet(false)} balance={balance} />
    </Screen>
  );
}

function labelFor(ref: string): string {
  if (ref.startsWith('sale:')) return 'Sale commission';
  if (ref.startsWith('withdrawal:')) return 'Withdrawal';
  if (ref.startsWith('bonus:')) return 'Bonus';
  // Internal references stay internal (brief §2) — show a plain label instead.
  return 'Adjustment';
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
      Alert.alert('Could not request', errMessage(e));
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
