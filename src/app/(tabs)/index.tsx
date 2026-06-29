import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Image, Linking, Pressable, View } from 'react-native';

import { BG } from '@/components/brand/backgrounds';
import { ImageBackdrop } from '@/components/brand/ImageBackdrop';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { PropertyCard } from '@/features/buyer/components/PropertyCard';
import { useFeaturedProperties, useToggleWishlist, useWishlistIds } from '@/features/buyer/hooks';
import { useAnnouncements, useContent } from '@/features/content/hooks';
import { useLeads } from '@/features/leads/hooks';
import { useUnreadCount } from '@/features/notifications/api';
import { shareReferral } from '@/features/share/referral';
import { useDownline } from '@/features/team/hooks';
import { useWalletSummary } from '@/features/wallet/hooks';
import { can } from '@/lib/access';
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
  const canTeam = can(profile, 'team');
  const canAnalytics = can(profile, 'teamAnalytics');

  const { data: summary } = useWalletSummary();
  const { data: team = [] } = useDownline();
  const { data: openLeads = [] } = useLeads();
  const activeLeads = openLeads.filter((l) => l.status !== 'won' && l.status !== 'lost').length;
  const { data: unread = 0 } = useUnreadCount();
  const { data: featured = [] } = useFeaturedProperties(8);
  const { data: savedIds } = useWishlistIds();
  const toggleSave = useToggleWishlist();
  const { get } = useContent();
  const { data: announcements = [] } = useAnnouncements();
  const visibleAnn = announcements.filter(
    (a) => a.audience === 'all' || a.audience === (isPartner ? 'partner' : 'buyer'),
  );

  function openCta(url: string | null) {
    if (!url) return;
    if (/^(https?:|mailto:|tel:|whatsapp:)/.test(url)) Linking.openURL(url);
    else router.push(url as never);
  }

  async function copyReferral() {
    if (!profile?.referral_code) return;
    await Clipboard.setStringAsync(profile.referral_code);
    Alert.alert('Copied', `Referral code ${profile.referral_code} copied.`);
  }

  return (
    <Screen contentClassName="pt-4 gap-4" backdrop={<ImageBackdrop source={BG.home} opacity={0.7} />}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text variant="label">{t('home.greeting')}</Text>
          <Text variant="h1" numberOfLines={1}>
            {profile?.full_name ?? 'Member'}
          </Text>
          <View className="mt-1.5 self-start rounded-full bg-red/10 px-3 py-1">
            <Text className="font-semibold text-[12px] text-red">{roleLabel(profile?.role_slug)}</Text>
          </View>
        </View>
        <View className="shrink-0 flex-row items-center gap-3 pt-1">
          <Pressable onPress={() => router.push('/chat')} hitSlop={8}>
            <Ionicons name="chatbubbles-outline" size={23} color={color.ink} />
          </Pressable>
          <Pressable onPress={() => router.push('/notifications')} hitSlop={8}>
            <Ionicons name="notifications-outline" size={24} color={color.ink} />
            {unread > 0 ? (
              <View className="absolute -right-1.5 -top-1.5 h-4 min-w-[16px] items-center justify-center rounded-full bg-red px-1">
                <Text className="font-mono-bold text-[10px] text-white">{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
            <Ionicons name="settings-outline" size={22} color={color.muted} />
          </Pressable>
        </View>
      </View>

      {/* Minimal referral code strip */}
      <Card className="flex-row items-center justify-between gap-3 bg-charcoal">
        <View className="flex-1">
          <Text className="font-medium text-[10px] uppercase tracking-[2px] text-gold">
            Referral code
          </Text>
          <Text
            className="font-mono-bold text-[19px] text-white tracking-[1px]"
            numberOfLines={1}>
            {profile?.referral_code ?? '—'}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable onPress={copyReferral} className="rounded-xl bg-white/10 p-2.5">
            <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={() => profile?.referral_code && shareReferral({ referralCode: profile.referral_code })}
            className="rounded-xl bg-white/10 p-2.5">
            <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
          </Pressable>
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
              <Text variant="caption">{get('kyc.intro')}</Text>
            </View>
            <StatusPill status={profile.kyc_status} />
          </Card>
        </Pressable>
      ) : null}

      {visibleAnn.length > 0 ? (
        <View className="gap-2">
          {visibleAnn.map((a) => (
            <Pressable key={a.id} disabled={!a.cta_url} onPress={() => openCta(a.cta_url)}>
              <Card className="gap-1 border-gold/30 bg-gold/5">
                {a.image_url ? (
                  <Image
                    source={{ uri: a.image_url }}
                    style={{ width: '100%', height: 130, borderRadius: 10, marginBottom: 4 }}
                    resizeMode="cover"
                  />
                ) : null}
                <Text variant="title" className="text-[15px]">
                  {a.title}
                </Text>
                {a.body ? <Text variant="caption">{a.body}</Text> : null}
                {a.cta_label && a.cta_url ? (
                  <Text className="mt-1 font-semibold text-[13px] text-red">{a.cta_label} →</Text>
                ) : null}
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}

      {featured.length > 0 ? (
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text variant="label">Featured properties</Text>
            <Pressable onPress={() => router.push('/(tabs)/properties')} hitSlop={8}>
              <Text className="font-semibold text-[13px] text-red">See all</Text>
            </Pressable>
          </View>
          <FlatList
            horizontal
            data={featured}
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 4 }}
            renderItem={({ item }) => (
              <View style={{ width: 250 }}>
                <PropertyCard
                  item={item}
                  saved={savedIds?.has(item.id) ?? false}
                  onToggleSave={() =>
                    toggleSave.mutate({ propertyId: item.id, saved: savedIds?.has(item.id) ?? false })
                  }
                />
              </View>
            )}
          />
        </View>
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
            {canTeam ? (
              <StatCard label="Team" icon="people">
                <Text className="font-mono-bold text-[18px] text-ink">{team.length}</Text>
              </StatCard>
            ) : null}
            <StatCard label="Active leads" icon="flame">
              <Text className="font-mono-bold text-[18px] text-ink">{activeLeads}</Text>
            </StatCard>
          </View>

          <View className="flex-row flex-wrap gap-3">
            <QuickLink icon="people" label="Leads" tint="#2563EB" onPress={() => router.push('/leads')} />
            <QuickLink icon="camera" label="Create Ad" tint="#E11D48" onPress={() => router.push('/tools/ad-creator')} />
            <QuickLink icon="document-text" label="Brochures" tint="#7C3AED" onPress={() => router.push('/brochures')} />
            <QuickLink icon="sparkles" label="AI Studio" tint="#9333EA" onPress={() => router.push('/tools/ai-studio')} />
            <QuickLink icon="trophy" label="Rewards" tint="#D97706" onPress={() => router.push('/rewards')} />
            {canTeam ? (
              <QuickLink icon="git-network" label="Network" tint="#0D9488" onPress={() => router.push('/(tabs)/network')} />
            ) : null}
            {canAnalytics ? (
              <QuickLink icon="bar-chart" label="Performance" tint="#4F46E5" onPress={() => router.push('/performance')} />
            ) : null}
            <QuickLink icon="wallet" label="Wallet" tint="#16A34A" onPress={() => router.push('/(tabs)/wallet')} />
            <QuickLink icon="receipt" label="Bookings" tint="#EA580C" onPress={() => router.push('/payments')} />
            <QuickLink icon="qr-code" label="My Card" tint="#0891B2" onPress={() => router.push('/(tabs)/card')} />
            <QuickLink icon="clipboard" label="Forms" tint="#475569" onPress={() => router.push('/forms')} />
            <QuickLink icon="help-circle" label="Help & FAQ" tint="#64748B" onPress={() => router.push('/help')} />
            {profile?.role_is_admin ? (
              <QuickLink icon="shield-checkmark" label="Admin" tint="#DC2626" onPress={() => router.push('/admin')} />
            ) : null}
          </View>
        </>
      ) : (
        <>
          <Card>
            <Text variant="title">{get('home.buyer_card_title')}</Text>
            <Text variant="body" className="mt-1 text-muted">
              {get('home.buyer_card_body')}
            </Text>
            <View className="mt-3">
              <Button title="Browse properties" onPress={() => router.push('/(tabs)/properties')} />
            </View>
          </Card>
          <View className="flex-row flex-wrap gap-3">
            <QuickLink icon="map" label="Map & Radar" tint="#0D9488" onPress={() => router.push('/map')} />
            <QuickLink icon="radio" label="Requirements" tint="#2563EB" onPress={() => router.push('/requirements')} />
            <QuickLink icon="heart" label="Saved" tint="#E11D48" onPress={() => router.push('/(tabs)/properties')} />
            <QuickLink icon="time" label="Recently viewed" tint="#7C3AED" onPress={() => router.push('/recent')} />
            <QuickLink icon="pricetag" label="My offers" tint="#D97706" onPress={() => router.push('/offers')} />
            <QuickLink icon="git-compare" label="Compare" tint="#4F46E5" onPress={() => router.push('/compare')} />
            <QuickLink icon="calculator" label="Valuation" tint="#16A34A" onPress={() => router.push('/tools/valuation')} />
            <QuickLink icon="receipt" label="My bookings" tint="#EA580C" onPress={() => router.push('/payments')} />
            <QuickLink icon="help-circle" label="Help & FAQ" tint="#475569" onPress={() => router.push('/help')} />
            <QuickLink icon="rocket" label="Become partner" tint="#DC2626" onPress={() => router.push('/become-partner')} />
          </View>
        </>
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
  tint = color.red,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  /** Accent color — tints the whole tile (background + border + icon). */
  tint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="w-[47%] flex-grow flex-row items-center gap-3 rounded-2xl border p-4"
      style={{ backgroundColor: `${tint}14`, borderColor: `${tint}40` }}>
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${tint}2E` }}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <Text variant="title" numberOfLines={2} className="flex-1 text-[15px]">
        {label}
      </Text>
    </Pressable>
  );
}
