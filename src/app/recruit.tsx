import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ShareChannels } from '@/components/share/ShareChannels';
import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { logArtifactShare, referralUrl } from '@/features/marketing/share';
import { useDownline } from '@/features/team/hooks';
import type { TeamMember } from '@/features/team/api';
import { useAuth } from '@/stores/auth';
import { BRAND, color } from '@/theme/tokens';

/**
 * Recruitment workspace (§6 — Recruit Agents / Promoters). Your referral code binds
 * every signup under you automatically; this screen is the share surface + a live
 * roster of who you've personally recruited. Roles are assigned by an admin after join.
 */
export default function RecruitScreen() {
  const profile = useAuth((s) => s.profile);
  const code = profile?.referral_code ?? 'JAMIN';
  const url = referralUrl(code);
  const { data: team = [] } = useDownline();
  const recruits = team
    .filter((m) => m.parent_id === profile?.id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <Screen contentClassName="pb-12 gap-4">
      <BackHeader title="Recruit your team" />

      <Card className="items-center gap-3 bg-charcoal">
        <Text className="font-medium text-[11px] uppercase tracking-[3px] text-gold">{BRAND}</Text>
        <View className="rounded-2xl bg-white p-3">
          <QRCode value={url} size={150} color={color.charcoal} backgroundColor="#FFFFFF" />
        </View>
        <Text className="font-mono-bold text-[20px] tracking-[2px] text-white">{code}</Text>
        <Text className="text-center text-[13px] text-white/70">
          Anyone who scans this or signs up with your code joins your team automatically.
        </Text>
      </Card>

      <View className="gap-2">
        <Text variant="label">Invite a new partner</Text>
        <ShareChannels
          text="Join my team on JAMIN Properties —"
          url={url}
          onShare={(ch) => logArtifactShare({ artifact: 'link', referralCode: code, channel: ch })}
        />
      </View>

      <View className="gap-2">
        <Text variant="label">Your recruits ({recruits.length})</Text>
        {recruits.length === 0 ? (
          <EmptyState
            icon="person-add"
            title="No recruits yet"
            body="Share your code above. Everyone you bring in shows up here — tap any of them to see their performance."
          />
        ) : (
          recruits.map((m) => <RecruitRow key={m.id} member={m} />)
        )}
      </View>
    </Screen>
  );
}

function RecruitRow({ member }: { member: TeamMember }) {
  const joined = new Date(member.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return (
    <Pressable onPress={() => router.push(`/team/${member.id}`)}>
      <Card className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-gold/15">
          <Text className="font-bold text-[13px] text-gold-deep">
            {(member.full_name ?? '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text variant="title" numberOfLines={1}>
            {member.full_name ?? 'New member'}
          </Text>
          <Text variant="caption">Joined {joined}</Text>
        </View>
        <Badge label={member.role?.name ?? 'Member'} />
      </Card>
    </Pressable>
  );
}
