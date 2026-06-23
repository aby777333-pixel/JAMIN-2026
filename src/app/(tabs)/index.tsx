import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { useLeads } from '@/features/leads/hooks';
import { shareReferral } from '@/features/share/referral';
import { useDownline } from '@/features/team/hooks';
import { useWalletSummary } from '@/features/wallet/hooks';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

function roleLabel(slug?: string | null) {
  if (!slug) return 'Member';
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Home() {
  const { t } = useTranslation();
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);
  const isPartner = !!profile?.role_slug && profile.role_slug !== 'buyer';

  const { data: summary } = useWalletSummary();
  const { data: team = [] } = useDownline();
  const { data: openLeads = [] } = useLeads();
  const activeLeads = openLeads.filter((l) => l.status !== 'won' && l.status !== 'lost').length;

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
          <Text className="font-mono-bold text-[28px] text-white tracking-[2px]">
            {profile?.referral_code ?? '—'}
          </Text>
          <View className="flex-row gap-2">
            <Pressable onPress={copyReferral} className="rounded-xl bg-white/10 px-3 py-2">
              <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => profile?.referral_code && shareReferral({ referralCode: profile.referral_code })}
              className="rounded-xl bg-white/10 px-3 py-2">
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </Card>

      {profile && profile.kyc_status !== 'verified' ? (
        <Pressable onPress={() => router.push('/kyc')}>
          <Card className="flex-row items-center gap-3 border-gold/40 bg-gold/10">
            <Ionicons name="id-card" size={22} color={color.goldDeep} />
            <View className="flex-1">
              <Text variant="title" className="text-[14px]">
                Complete your KYC
              </Text>
              <Text variant="caption">Verify your identity to unlock payouts</Text>
            </View>
            <StatusPill status={profile.kyc_status} />
          </Card>
        </Pressable>
      ) : null}

      {isPartner ? (
        <>
          <View className="flex-row gap-3">
            <StatCard label="Wallet" icon="wallet">
              <MoneyText value={summary?.balance ?? '0'} className="text-[18px]" />
            </StatCard>
            <StatCard label="Earnings" icon="trending-up">
              <MoneyText value={summary?.earnings ?? '0'} className="text-[18px]" />
            </StatCard>
          </View>
          <View className="flex-row gap-3">
            <StatCard label="Team" icon="people">
              <Text className="font-mono-bold text-[18px] text-ink">{team.length}</Text>
            </StatCard>
            <StatCard label="Active leads" icon="flame">
              <Text className="font-mono-bold text-[18px] text-ink">{activeLeads}</Text>
            </StatCard>
          </View>

          <View className="flex-row flex-wrap gap-3">
            <QuickLink icon="people" label="Leads" onPress={() => router.push('/leads')} />
            <QuickLink icon="camera" label="Create Ad" onPress={() => router.push('/tools/ad-creator')} />
            <QuickLink icon="document-text" label="Brochures" onPress={() => router.push('/brochures')} />
            <QuickLink icon="sparkles" label="AI Studio" onPress={() => router.push('/tools/ai-studio')} />
            <QuickLink icon="git-network" label="Network" onPress={() => router.push('/(tabs)/network')} />
            <QuickLink icon="wallet" label="Wallet" onPress={() => router.push('/(tabs)/wallet')} />
            <QuickLink icon="qr-code" label="My Card" onPress={() => router.push('/(tabs)/card')} />
            {profile?.role_is_admin ? (
              <QuickLink icon="shield-checkmark" label="Admin" onPress={() => router.push('/admin')} />
            ) : null}
          </View>
        </>
      ) : (
        <Card>
          <Text variant="title">Find your next property</Text>
          <Text variant="body" className="mt-1 text-muted">
            Browse dynamic inventory, calculate EMI & ROI, and enquire or book a visit.
          </Text>
          <View className="mt-3">
            <Button title="Browse properties" onPress={() => router.push('/(tabs)/properties')} />
          </View>
        </Card>
      )}

      <Pressable onPress={() => signOut()} className="self-center py-3">
        <Text className="font-semibold text-muted">{t('auth.signOut')}</Text>
      </Pressable>
    </Screen>
  );
}

function QuickLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="w-[47%] flex-grow flex-row items-center gap-3 rounded-2xl border border-line bg-surface p-4">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
        <Ionicons name={icon} size={20} color={color.red} />
      </View>
      <Text variant="title" className="text-[15px]">
        {label}
      </Text>
    </Pressable>
  );
}
