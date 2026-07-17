import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { TileGrid, ToolTile } from '@/components/ui/ToolTile';
import { shareReferral } from '@/features/share/referral';
import { can } from '@/lib/access';
import { useAuth } from '@/stores/auth';
import { category, color } from '@/theme/tokens';

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
  const { t } = useTranslation();
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
          accent={category.docs}
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
        accent={category.marketing}
        onPress={() => router.push('/(tabs)/card')}
      />

      {/* Tools — the same colorized square-tile language as the calculators
          hub; every tile keeps its old route, only the presentation changed. */}
      {isPartner ? (
        <View className="gap-3 pt-1">
          <Text variant="label">Tools</Text>
          <TileGrid>
            {canTeam ? (
              <ToolTile
                icon="people"
                label={t('account.tiles.team', { defaultValue: 'My team' })}
                accent={category.team}
                onPress={() => router.push('/(tabs)/network')}
              />
            ) : null}
            {canRecruit ? (
              <ToolTile
                icon="person-add"
                label={t('account.tiles.recruit', { defaultValue: 'Recruit' })}
                accent={category.team}
                onPress={() => router.push('/recruit')}
              />
            ) : null}
            {canAnalytics ? (
              <ToolTile
                icon="bar-chart"
                label={t('account.tiles.performance', { defaultValue: 'Performance' })}
                accent={category.team}
                onPress={() => router.push('/performance')}
              />
            ) : null}
            {canSell ? (
              <>
                <ToolTile
                  icon="camera"
                  label={t('account.tiles.createAd', { defaultValue: 'Create ad' })}
                  accent={category.sell}
                  onPress={() => router.push('/tools/ad-creator')}
                />
                <ToolTile
                  icon="albums"
                  label={t('account.tiles.myPosts', { defaultValue: 'Posts & videos' })}
                  accent={category.sell}
                  onPress={() => router.push('/my-posts')}
                />
                <ToolTile
                  icon="image"
                  label={t('account.tiles.poster', { defaultValue: 'Posters & banners' })}
                  accent={category.marketing}
                  onPress={() => router.push('/tools/poster')}
                />
                <ToolTile
                  icon="document-text"
                  label={t('account.tiles.brochures', { defaultValue: 'Brochures' })}
                  accent={category.docs}
                  onPress={() => router.push('/brochures')}
                />
                <ToolTile
                  icon="sparkles"
                  label={t('account.tiles.aiStudio', { defaultValue: 'AI Studio' })}
                  accent={category.ai}
                  onPress={() => router.push('/tools/ai-studio')}
                />
                <ToolTile
                  icon="chatbubbles"
                  label={t('account.tiles.adChats', { defaultValue: 'Ad chats' })}
                  accent={category.comms}
                  onPress={() => router.push('/ad-chats')}
                />
                <ToolTile
                  icon="trophy"
                  label={t('account.tiles.rewards', { defaultValue: 'Rewards' })}
                  accent={category.marketing}
                  onPress={() => router.push('/rewards')}
                />
                <ToolTile
                  icon="clipboard"
                  label={t('account.tiles.forms', { defaultValue: 'Applications' })}
                  accent={category.docs}
                  onPress={() => router.push('/forms')}
                />
              </>
            ) : null}
          </TileGrid>
        </View>
      ) : (
        <View className="gap-3 pt-1">
          <Text variant="label">Tools</Text>
          <TileGrid>
            <ToolTile
              icon="grid-outline"
              label={t('account.buyerHub', { defaultValue: 'My dashboard' })}
              accent={category.buy}
              onPress={() => router.push('/buyer-hub')}
            />
            <ToolTile
              icon="options-outline"
              label={t('account.preferences', { defaultValue: 'Preferences' })}
              accent={category.buy}
              onPress={() => router.push('/preferences')}
            />
            <ToolTile
              icon="bookmark-outline"
              label={t('account.savedSearches', { defaultValue: 'Saved searches' })}
              accent={category.buy}
              onPress={() => router.push('/saved-searches')}
            />
            <ToolTile
              icon="notifications-outline"
              label={t('account.tiles.alerts', { defaultValue: 'Property alerts' })}
              accent={category.comms}
              onPress={() => router.push('/requirements')}
            />
            <ToolTile
              icon="git-compare"
              label={t('account.tiles.compare', { defaultValue: 'Compare' })}
              accent={category.buy}
              onPress={() => router.push('/compare')}
            />
            <ToolTile
              icon="time"
              label={t('account.tiles.recent', { defaultValue: 'Recently viewed' })}
              accent={category.buy}
              onPress={() => router.push('/recent')}
            />
            <ToolTile
              icon="calculator"
              label={t('account.tiles.valuation', { defaultValue: 'Valuation' })}
              accent={category.ai}
              onPress={() => router.push('/tools/valuation')}
            />
            <ToolTile
              icon="briefcase"
              label={t('account.tiles.becomePartner', { defaultValue: 'Become partner' })}
              accent={category.team}
              onPress={() => router.push('/become-partner')}
            />
          </TileGrid>
        </View>
      )}

      <View className="gap-3 pt-1">
        <Text variant="label">More</Text>
        <TileGrid>
          <ToolTile
            icon="calculator-outline"
            label={t('account.tiles.calculators', { defaultValue: 'Calculators' })}
            accent={category.finance}
            onPress={() => router.push('/calculators')}
          />
          <ToolTile
            icon="chatbubbles-outline"
            label={t('account.tiles.community', { defaultValue: 'Community' })}
            accent={category.comms}
            onPress={() => router.push('/community')}
          />
          <ToolTile
            icon="help-buoy"
            label={t('account.tiles.help', { defaultValue: 'Help & support' })}
            accent={category.comms}
            onPress={() => router.push('/support')}
          />
          <ToolTile
            icon="settings-outline"
            label={t('account.tiles.settings', { defaultValue: 'Settings' })}
            accent={category.team}
            onPress={() => router.push('/settings')}
          />
          {profile?.role_is_admin ? (
            <ToolTile
              icon="shield-checkmark"
              label={t('account.tiles.admin', { defaultValue: 'Admin portal' })}
              accent={category.team}
              onPress={() => router.push('/admin')}
            />
          ) : null}
          {isRealAdmin ? (
            <ToolTile
              icon="eye"
              label={t('account.tiles.rolePreview', { defaultValue: 'Preview role' })}
              accent={category.team}
              onPress={() => router.push('/role-preview')}
            />
          ) : null}
        </TileGrid>
      </View>

      <Pressable
        onPress={async () => {
          // Clearing the session doesn't unmount the tabs — leave explicitly.
          await signOut();
          router.replace('/(auth)/login');
        }}
        className="self-center py-4">
        <Text className="font-semibold text-muted">Sign out</Text>
      </Pressable>
    </Screen>
  );
}
