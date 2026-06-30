import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';

import { BG } from '@/components/brand/backgrounds';
import { ImageBackdrop } from '@/components/brand/ImageBackdrop';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Text } from '@/components/ui/Text';
import { completeProfile } from '@/features/auth/api';
import { useSelectableRoles } from '@/features/roles/hooks';
import { switchRole } from '@/features/roles/api';
import { useAuth } from '@/stores/auth';
import { errMessage } from '@/lib/errors';

const ROLE_HINT: Record<string, string> = {
  buyer: 'Browse & buy properties',
  agent: 'Sales partner — earn commissions',
  seller: 'List & sell your own plots',
  builder: 'List your builds',
  developer: 'List your projects',
  surveyor: 'Offer survey services',
  legal_consultant: 'Offer legal services',
  broker: 'Broker listings & deals',
};

export default function Onboarding() {
  const { t } = useTranslation();
  const refreshProfile = useAuth((s) => s.refreshProfile);
  const { data: roles = [] } = useSelectableRoles();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<string>('buyer');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});

  const roleOptions: SelectOption[] = roles.map((r) => ({
    value: r.slug,
    label: r.name,
    hint: ROLE_HINT[r.slug],
  }));

  async function onFinish() {
    const next: typeof errors = {};
    if (fullName.trim().length < 2) next.fullName = 'Enter your full name';
    if (!/^[+\d][\d\s-]{7,}$/.test(phone.trim())) next.phone = 'Enter a valid phone number';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await completeProfile({ fullName, phone, referralCode });
      // Apply the chosen role (only ever a self-selectable, non-admin role).
      if (role && role !== 'buyer') {
        await switchRole(role);
      }
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Setup failed', errMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen contentClassName="py-4" keyboardAvoiding backdrop={<ImageBackdrop source={BG.onboarding} height={300} />}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="items-center py-2">
          <Logo width={180} />
        </View>

        <View className="mt-4 gap-1">
          <Text variant="h1">{t('onboarding.title')}</Text>
          <Text variant="body" className="text-muted">
            {t('onboarding.subtitle')}
          </Text>
        </View>

        <View className="mt-6 gap-4">
          <Input
            label={t('onboarding.fullName')}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            error={errors.fullName}
          />
          <Input
            label={t('onboarding.phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            inputMode="tel"
            error={errors.phone}
          />
          <View className="gap-1">
            <Select
              label="I'm registering as"
              value={role}
              options={roleOptions}
              onChange={setRole}
              placeholder="Choose your role"
            />
            <Text variant="caption">
              You can switch roles anytime later. Senior management roles are assigned by an admin.
            </Text>
          </View>
          <Input
            label={t('onboarding.referralCode')}
            value={referralCode}
            onChangeText={(v) => setReferralCode(v.toUpperCase())}
            autoCapitalize="characters"
          />
          <Button title={t('onboarding.finish')} loading={loading} onPress={onFinish} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
