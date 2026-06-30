import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { useApplyLoan, useLenders, useMyApplications } from '@/features/loans/hooks';
import { formatINR, money } from '@/lib/money';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

/** Home-loan / pre-approval marketplace — browse lenders, request a pre-approval. */
export default function Loans() {
  const { data: lenders = [], isLoading } = useLenders();
  const { data: apps = [] } = useMyApplications();
  const apply = useApplyLoan();

  const [lenderId, setLenderId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [tenure, setTenure] = useState('20');
  const [income, setIncome] = useState('');

  async function submit() {
    if (!amount.trim()) {
      Alert.alert('Enter a loan amount');
      return;
    }
    try {
      await apply.mutateAsync({
        lenderId,
        amount: money(amount).toNumber(),
        tenureYears: parseInt(tenure, 10) || null,
        monthlyIncome: income ? money(income).toNumber() : null,
      });
      setAmount('');
      setIncome('');
      setLenderId(null);
      Alert.alert('Request sent', 'Our team will help you with pre-approval. Check status below.');
    } catch (e) {
      Alert.alert('Could not submit', errMessage(e));
    }
  }

  return (
    <Screen contentClassName="pb-12 gap-4" keyboardAvoiding>
      <BackHeader title="Home loans" />
      <Text variant="caption">Compare lenders and request a pre-approval — contact stays via JAMIN.</Text>

      <Text variant="label">Lenders</Text>
      {isLoading ? (
        <ActivityIndicator color={color.red} />
      ) : lenders.length === 0 ? (
        <Text variant="caption">No lenders listed yet — you can still request pre-approval below.</Text>
      ) : (
        lenders.map((l) => (
          <Card key={l.id} className="gap-1">
            <View className="flex-row items-center justify-between">
              <Text variant="title" className="text-[15px]">{l.name}</Text>
              {l.interest_from != null ? (
                <Text className="font-mono-bold text-[14px] text-gold-deep">{l.interest_from}%+</Text>
              ) : null}
            </View>
            {l.blurb ? <Text variant="caption">{l.blurb}</Text> : null}
            {l.max_tenure_years ? <Text variant="caption">Up to {l.max_tenure_years} years</Text> : null}
            <Chip
              label={lenderId === l.id ? '✓ Selected' : 'Choose this lender'}
              active={lenderId === l.id}
              onPress={() => setLenderId(lenderId === l.id ? null : l.id)}
            />
          </Card>
        ))
      )}

      <Card className="gap-3">
        <Text variant="title" className="text-[14px]">Request pre-approval</Text>
        <Input label="Loan amount (₹)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <View className="flex-row gap-3">
          <View className="flex-1"><Input label="Tenure (years)" value={tenure} onChangeText={setTenure} keyboardType="numeric" /></View>
          <View className="flex-1"><Input label="Monthly income (₹)" value={income} onChangeText={setIncome} keyboardType="numeric" /></View>
        </View>
        {amount.trim() ? <Text variant="caption">Requested: {formatINR(money(amount))}</Text> : null}
        <Button title="Request pre-approval" loading={apply.isPending} onPress={submit} />
      </Card>

      {apps.length > 0 ? (
        <View className="gap-2">
          <Text variant="label">My applications</Text>
          {apps.map((a) => (
            <Card key={a.id} className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text variant="title" className="text-[14px]">
                  {a.amount != null ? formatINR(a.amount) : 'Pre-approval'}
                </Text>
                <Text variant="caption">
                  {a.lender?.name ?? 'Any lender'}
                  {a.tenure_years ? ` · ${a.tenure_years}y` : ''} · {new Date(a.created_at).toLocaleDateString('en-IN')}
                </Text>
              </View>
              <StatusPill status={a.status} />
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
