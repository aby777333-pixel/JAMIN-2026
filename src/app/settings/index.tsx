import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, Share, View } from 'react-native';

import { BG } from '@/components/brand/backgrounds';
import { ImageBackdrop } from '@/components/brand/ImageBackdrop';
import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SITE_URL } from '@/lib/site';
import { can } from '@/lib/access';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

const ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; href: string }[] = [
  { icon: 'person-circle', label: 'Edit profile', sub: 'Name, phone, designation, photo', href: '/profile' },
  { icon: 'calendar', label: 'My site visits', sub: 'Bookings & check-in', href: '/visits' },
  { icon: 'calendar-number', label: 'My agenda', sub: 'Visits & follow-ups in one view', href: '/agenda' },
  { icon: 'people', label: 'Shared shortlists', sub: 'Decide together with family', href: '/shortlists' },
  { icon: 'play-circle', label: 'Reels', sub: 'Short property videos', href: '/reels' },
  { icon: 'lock-closed', label: 'Escrow & milestones', sub: 'Staged booking payments', href: '/escrow' },
  { icon: 'trending-up', label: 'Market insights', sub: 'Trends, hotspots, leaderboard', href: '/tools/insights' },
  { icon: 'school', label: 'Training Academy', sub: 'Courses, quizzes & certificates', href: '/academy' },
  { icon: 'compass', label: 'Vastu & Muhurat', sub: 'Facing, numerology & auspicious dates', href: '/vastu' },
  { icon: 'home', label: 'Griha Pravesh', sub: 'House-warming checklist & muhurat', href: '/griha-pravesh' },
  { icon: 'cash', label: 'Home loans', sub: 'Compare lenders, get pre-approved', href: '/loans' },
  { icon: 'folder', label: 'Document vault', sub: 'Agreements, IDs & KYC in one place', href: '/documents' },
  { icon: 'apps', label: "What's included", sub: 'Explore all platform features', href: '/features' },
  { icon: 'notifications', label: 'Notifications', sub: 'Choose your alerts', href: '/settings/notifications' },
  { icon: 'lock-closed', label: 'Security & language', sub: 'App lock, language', href: '/settings/security' },
  { icon: 'help-circle', label: 'Help & FAQ', sub: 'Answers to common questions', href: '/help' },
  { icon: 'help-buoy', label: 'Help & Support', sub: 'Contact, social links, about', href: '/support' },
];

export default function Settings() {
  const version = (Constants.expoConfig?.version as string) ?? '1.0.0';
  const profile = useAuth((s) => s.profile);
  const isRealAdmin = useAuth((s) => s.isRealAdmin);

  async function shareMyPage() {
    if (!profile?.referral_code) return;
    const url = `${SITE_URL}/a/${profile.referral_code}`;
    try {
      await Share.share({ message: `View my verified property listings on JAMIN Properties:\n${url}`, url });
    } catch {
      /* dismissed */
    }
  }

  async function shareApp() {
    try {
      await Share.share({
        message: `Discover verified land & plots on JAMIN Properties. ${SITE_URL}`,
        url: SITE_URL,
      });
    } catch {
      /* user dismissed */
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-3" backdrop={<ImageBackdrop source={BG.waterfall} height={240} />}>
      <BackHeader title="Settings" />

      {isRealAdmin ? (
        <Pressable onPress={() => router.push('/role-preview')}>
          <Card className="flex-row items-center gap-3 border-gold/60 bg-[#FDF3D8]">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-gold/20">
              <Ionicons name="eye" size={18} color={color.goldDeep} />
            </View>
            <View className="flex-1">
              <Text variant="title">Preview as role</Text>
              <Text variant="caption">See the app as any role — test buyer, agent, admin…</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={color.muted} />
          </Card>
        </Pressable>
      ) : null}

      {ITEMS.map((it) => (
        <Pressable key={it.href} onPress={() => router.push(it.href as never)}>
          <Card className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
              <Ionicons name={it.icon} size={18} color={color.red} />
            </View>
            <View className="flex-1">
              <Text variant="title">{it.label}</Text>
              <Text variant="caption">{it.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={color.muted} />
          </Card>
        </Pressable>
      ))}

      {can(profile, 'sell') && profile?.referral_code ? (
        <Pressable onPress={shareMyPage}>
          <Card className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
              <Ionicons name="globe" size={18} color={color.red} />
            </View>
            <View className="flex-1">
              <Text variant="title">My public page</Text>
              <Text variant="caption">Share your listings at /a/{profile.referral_code}</Text>
            </View>
            <Ionicons name="share-social" size={18} color={color.muted} />
          </Card>
        </Pressable>
      ) : null}

      <Pressable onPress={shareApp}>
        <Card className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
            <Ionicons name="gift" size={18} color={color.red} />
          </View>
          <View className="flex-1">
            <Text variant="title">Tell a friend</Text>
            <Text variant="caption">Share JAMIN Properties with others</Text>
          </View>
          <Ionicons name="share-social" size={18} color={color.muted} />
        </Card>
      </Pressable>

      <Text variant="caption" className="mt-2 text-center">
        JAMIN Properties · v{version}
      </Text>
    </Screen>
  );
}
