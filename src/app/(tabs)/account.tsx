import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { shareReferral } from '@/features/share/referral';
import { can } from '@/lib/access';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

function roleLabel(slug?: string | null) {
  if (!slug) return 'Member';
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Account — who you are plus every role-specific tool, as a quiet directory
 * (simplification brief §6: "all secondary functions sit inside the sections").
 * Absorbs the old Home quick-link grid, the referral strip, the KYC banner and
 * the Card/Network tabs' entry points. Role gating mirrors the old tabs/links.
 */
export default function Account() {
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);
  const isRealAdmin = useAuth((s) => s.isRealAdmin);
  const isPartner = !!profile?.role_slug && profile.role_slug !== 'buyer';
  const canSell = can(profile, 'sell');
  const canTeam = can(profile, 'team');
  const canRecruit = can(profile, 'recruit');
  const canAnalytics = can(profile, 'teamAnalytics');

  const initials = (profile?.full_name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function copyReferral() {
    if (!profile?.referral_code) return;
    await Clipboard.setStringAsync(profile.referral_code);
    Alert.alert('Copied', `Referral code ${profile.referral_code} copied.`);
  }

  return (
    <Screen contentClassName="pt-4 gap-3">
      <Text variant="h1">Account</Text>

      {/* Who am I — one card, one tap to edit. */}
      <Pressable onPress={() => router.push('/profile')}>
        <Card className="flex-row items-center gap-3">
          {profile?.photo_url ? (
            <Image
              source={{ uri: profile.photo_url }}
              style={{ width: 48, height: 48, borderRadius: 24 }}
              contentFit="cover"
            />
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-full bg-charcoal">
              <Text className="font-bold text-[16px] text-white">{initials}</Text>
            </View>
          )}
          <View className="min-w-0 flex-1">
            <Text variant="title" numberOfLines={1}>
              {profile?.full_name ?? 'Member'}
            </Text>
            <Text variant="caption">{roleLabel(profile?.role_slug)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={color.muted} />
        </Card>
      </Pressable>

      {profile && profile.kyc_status !== 'verified' ? (
        <ListRow
          icon="id-card"
          label="Complete your KYC"
          sub="Required before bookings are confirmed"
          onPress={() => router.push('/kyc')}
          right={<StatusPill status={profile.kyc_status} />}
        />
      ) : null}

      {/* Referral code — the growth engine, kept front and centre but quiet. */}
      <Card className="flex-row items-center justify-between gap-3 bg-charcoal !py-3">
        <View className="min-w-0 flex-1">
          <Text className="font-medium text-[10px] uppercase tracking-[2px] text-gold">
            Referral code
          </Text>
          <Text
            className="font-mono-bold text-[18px] leading-[24px] tracking-[1px] text-white"
            numberOfLines={1}>
            {profile?.referral_code ?? '—'}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable onPress={copyReferral} className="rounded-xl bg-white/10 p-2.5" hitSlop={4}>
            <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={() =>
              profile?.referral_code && shareReferral({ referralCode: profile.referral_code })
            }
            className="rounded-xl bg-white/10 p-2.5"
            hitSlop={4}>
            <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </Card>

      <ListRow
        icon="qr-code"
        label="My business card"
        sub="Share your card, QR and invite link"
        onPress={() => router.push('/(tabs)/card')}
      />

      {isPartner ? (
        <View className="gap-3 pt-1">
          <Text variant="label">Tools</Text>
          {canTeam ? (
            <ListRow
              icon="people"
              label="My team"
              sub="Downline, performance and referrals"
              onPress={() => router.push('/(tabs)/network')}
            />
          ) : null}
          {canRecruit ? (
            <ListRow
              icon="person-add"
              label="Recruit partners"
              sub="Invite and grow your network"
              onPress={() => router.push('/recruit')}
            />
          ) : null}
          {canAnalytics ? (
            <ListRow
              icon="bar-chart"
              label="Team performance"
              sub="Sales and revenue rollups"
              onPress={() => router.push('/performance')}
            />
          ) : null}
          {canSell ? (
            <>
              <ListRow
                icon="camera"
                label="Create ad (photo & video)"
                sub="Live geo-verified ads with your card"
                onPress={() => router.push('/tools/ad-creator')}
              />
              <ListRow
                icon="image"
                label="Poster & banner maker"
                sub="Turn any photo or video into a branded banner"
                onPress={() => router.push('/tools/poster')}
              />
              <ListRow
                icon="document-text"
                label="Brochures & flyers"
                sub="Personalised marketing material"
                onPress={() => router.push('/brochures')}
              />
              <ListRow
                icon="sparkles"
                label="AI Studio"
                sub="Listing copy, images and staging"
                onPress={() => router.push('/tools/ai-studio')}
              />
              <ListRow
                icon="chatbubbles"
                label="Ad chats"
                sub="Conversations from your shared ads"
                onPress={() => router.push('/ad-chats')}
              />
              <ListRow
                icon="trophy"
                label="Rewards"
                sub="Badges, bonuses and the leaderboard"
                onPress={() => router.push('/rewards')}
              />
              <ListRow
                icon="clipboard"
                label="Applications & forms"
                sub="Submit and track applications"
                onPress={() => router.push('/forms')}
              />
            </>
          ) : null}
        </View>
      ) : (
        <View className="gap-3 pt-1">
          <Text variant="label">Tools</Text>
          <ListRow
            icon="notifications-outline"
            label="Property alerts"
            sub="Tell us what you're looking for"
            onPress={() => router.push('/requirements')}
          />
          <ListRow
            icon="git-compare"
            label="Compare properties"
            sub="Side-by-side comparison"
            onPress={() => router.push('/compare')}
          />
          <ListRow
            icon="time"
            label="Recently viewed"
            sub="Pick up where you left off"
            onPress={() => router.push('/recent')}
          />
          <ListRow
            icon="calculator"
            label="Land valuation"
            sub="Indicative value from live listings"
            onPress={() => router.push('/tools/valuation')}
          />
          <ListRow
            icon="briefcase"
            label="Become a partner"
            sub="Earn by promoting JAMIN properties"
            onPress={() => router.push('/become-partner')}
          />
        </View>
      )}

      <View className="gap-3 pt-1">
        <Text variant="label">More</Text>
        <ListRow
          icon="chatbubbles-outline"
          label="Community"
          sub="Updates and discussions"
          onPress={() => router.push('/community')}
        />
        <ListRow
          icon="help-buoy"
          label="Help & support"
          sub="Contact JAMIN — we respond fast"
          onPress={() => router.push('/support')}
        />
        <ListRow
          icon="settings-outline"
          label="Settings"
          sub="Profile, language, security and more"
          onPress={() => router.push('/settings')}
        />
        {profile?.role_is_admin ? (
          <ListRow
            icon="shield-checkmark"
            label="Admin portal"
            sub="Approvals, users, forms and analytics"
            onPress={() => router.push('/admin')}
          />
        ) : null}
        {isRealAdmin ? (
          <ListRow
            icon="eye"
            label="Preview as role"
            sub="See the app exactly as each user type"
            onPress={() => router.push('/role-preview')}
          />
        ) : null}
      </View>

      <Pressable onPress={() => signOut()} className="self-center py-4">
        <Text className="font-semibold text-muted">Sign out</Text>
      </Pressable>
    </Screen>
  );
}
