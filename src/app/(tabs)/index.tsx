import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/stores/auth';

function roleLabel(slug?: string | null) {
  if (!slug) return 'Member';
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Home() {
  const { t } = useTranslation();
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);

  const referral = profile?.referral_code ?? '—';

  async function copyReferral() {
    if (!profile?.referral_code) return;
    await Clipboard.setStringAsync(profile.referral_code);
    Alert.alert('Copied', `Referral code ${profile.referral_code} copied.`);
  }

  return (
    <Screen contentClassName="pt-4 gap-4">
      <View className="flex-row items-start justify-between">
        <View>
          <Text variant="label">{t('home.greeting')}</Text>
          <Text variant="h1">{profile?.full_name ?? 'Member'}</Text>
        </View>
        <View className="rounded-full bg-red/10 px-3 py-1.5">
          <Text className="font-semibold text-[12px] text-red">{roleLabel(profile?.role_slug)}</Text>
        </View>
      </View>

      <Card className="bg-charcoal">
        <Text className="font-medium text-[12px] uppercase tracking-[2px] text-gold">
          Your referral code
        </Text>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="font-mono-bold text-[28px] text-white tracking-[2px]">{referral}</Text>
          <Pressable onPress={copyReferral} className="rounded-xl bg-white/10 px-4 py-2">
            <Text className="font-semibold text-white">Copy</Text>
          </Pressable>
        </View>
        <Text className="mt-2 text-[12px] text-white/60">
          Share your card to grow your network — every signup binds to you.
        </Text>
      </Card>

      <View className="flex-row gap-3">
        <Card className="flex-1">
          <Text variant="label">Earnings</Text>
          <MoneyText value={0} className="mt-1 text-[20px]" />
        </Card>
        <Card className="flex-1">
          <Text variant="label">Wallet</Text>
          <MoneyText value={0} className="mt-1 text-[20px]" />
        </Card>
      </View>

      <Card>
        <Text variant="title">Getting started</Text>
        <Text variant="body" className="mt-1 text-muted">
          Your Digital Business Card is ready in the Card tab. Browse inventory in Properties and
          track your team in Network as your platform fills in.
        </Text>
      </Card>

      <Pressable onPress={() => signOut()} className="self-center py-3">
        <Text className="font-semibold text-muted">{t('auth.signOut')}</Text>
      </Pressable>
    </Screen>
  );
}
