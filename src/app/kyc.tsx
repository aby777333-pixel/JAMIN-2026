import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { useContent } from '@/features/content/hooks';
import { DynamicForm } from '@/features/forms/DynamicForm';
import { useFormDef } from '@/features/forms/api';
import type { FormValues } from '@/features/forms/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

export default function Kyc() {
  const profile = useAuth((s) => s.profile);
  const refreshProfile = useAuth((s) => s.refreshProfile);
  const { data: form, isLoading } = useFormDef('kyc');
  const { get } = useContent();
  const [busy, setBusy] = useState(false);

  const verified = profile?.kyc_status === 'verified';
  const pending = profile?.kyc_status === 'pending';

  async function onSubmit(values: FormValues) {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('submit_kyc', { p_data: values });
      if (error) throw error;
      await refreshProfile();
      Alert.alert('Submitted', 'Your KYC is under review.');
      router.back();
    } catch (e) {
      Alert.alert('Could not submit', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title="KYC Verification" />

      <Card className="flex-row items-center justify-between">
        <View>
          <Text variant="label">Status</Text>
          <Text variant="title" className="mt-0.5">
            Identity verification
          </Text>
        </View>
        <StatusPill status={profile?.kyc_status ?? 'unverified'} />
      </Card>

      {verified ? (
        <Card>
          <Text variant="body" className="text-muted">
            {get('kyc.verified_msg')}
          </Text>
        </Card>
      ) : pending ? (
        <Card>
          <Text variant="body" className="text-muted">
            {get('kyc.pending_msg')}
          </Text>
        </Card>
      ) : isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={color.red} />
        </View>
      ) : form ? (
        <DynamicForm fields={form.fields} submitLabel="Submit for verification" loading={busy} onSubmit={onSubmit} />
      ) : (
        <Text variant="body" className="text-muted">
          KYC form is not configured yet.
        </Text>
      )}
    </Screen>
  );
}
