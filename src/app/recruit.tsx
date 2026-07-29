import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { ShareChannels } from '@/components/share/ShareChannels';
import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Disclosure } from '@/components/ui/Disclosure';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { logArtifactShare, referralUrl } from '@/features/marketing/share';
import { useDownline } from '@/features/team/hooks';
import type { TeamMember } from '@/features/team/api';
import {
  useCancelTeamInvite,
  useCreateTeamInvite,
  useTeamInvites,
} from '@/features/team/promoter';
import { errMessage } from '@/lib/errors';
import { useAuth } from '@/stores/auth';
import { category, BRAND, color } from '@/theme/tokens';

/**
 * Recruitment workspace (§6 — Recruit Agents / Promoters). Your referral code binds
 * every signup under you automatically; this screen is the share surface + a live
 * roster of who you've personally recruited. Roles are assigned by an admin after join.
 */
export default function RecruitScreen() {
  const profile = useAuth((s) => s.profile);
  const code = profile?.referral_code ?? 'Jamin Bazaar';
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
          text="Join my team on Jamin Bazaar —"
          url={url}
          onShare={(ch) => logArtifactShare({ artifact: 'link', referralCode: code, channel: ch })}
        />
      </View>

      <Invitations referralLink={url} />

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

const INVITE_ROLES = [
  { slug: 'agent', label: 'Agent' },
  { slug: 'sub_promoter', label: 'Sub Promoter' },
  { slug: 'broker', label: 'Broker' },
] as const;

/**
 * Invitations (0102) — track who you invited and how it went. Manual invites
 * are recorded in team_invites and auto-flip to accepted server-side when the
 * invited phone signs up with your referral code.
 */
function Invitations({ referralLink }: { referralLink: string }) {
  const { t } = useTranslation();
  const { data: invites = [] } = useTeamInvites();
  const create = useCreateTeamInvite();
  const cancel = useCancelTeamInvite();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [role, setRole] = useState<string>('agent');

  const accepted = invites.filter((i) => i.status === 'accepted').length;
  const pending = invites.filter((i) => i.status === 'sent').length;

  async function inviteViaWhatsApp() {
    const c = contact.trim();
    if (!c) {
      Alert.alert(t('recruit.invites.needContact', { defaultValue: 'Enter a phone or email first' }));
      return;
    }
    try {
      await create.mutateAsync({
        name: name.trim(),
        contact: c,
        channel: 'whatsapp',
        invited_role: role,
      });
      const text = t('recruit.invites.waMessage', {
        defaultValue:
          'Hi{{name}}! Join my team on Jamin Bazaar — sign up with my link and you are auto-linked to me: {{link}}',
        name: name.trim() ? ` ${name.trim()}` : '',
        link: referralLink,
      });
      const digits = c.replace(/[^\d]/g, '');
      const wa = digits.length >= 10
        ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
      await Linking.openURL(wa);
      setName('');
      setContact('');
    } catch (e) {
      Alert.alert(t('recruit.invites.title', { defaultValue: 'Invitations' }), errMessage(e));
    }
  }

  async function recordInvite() {
    const c = contact.trim();
    if (!c) {
      Alert.alert(t('recruit.invites.needContact', { defaultValue: 'Enter a phone or email first' }));
      return;
    }
    try {
      await create.mutateAsync({ name: name.trim(), contact: c, channel: 'other', invited_role: role });
      setName('');
      setContact('');
    } catch (e) {
      Alert.alert(t('recruit.invites.title', { defaultValue: 'Invitations' }), errMessage(e));
    }
  }

  return (
    // Collapsed by default — recruiting stays a one-screen share flow; the
    // invitation ledger opens on demand with its counts on the header.
    <Disclosure
      icon="mail-open"
      accent={category.team}
      title={t('recruit.invites.title', { defaultValue: 'Invitations' })}
      subtitle={t('recruit.invites.summary', {
        defaultValue: '{{sent}} sent · {{accepted}} accepted · {{pending}} pending',
        sent: invites.length,
        accepted,
        pending,
      })}>
      <View className="flex-row gap-3">
        <Card className="flex-1 items-center py-3">
          <Text className="font-mono-bold text-[20px] text-ink">{invites.length}</Text>
          <Text variant="caption">{t('recruit.invites.sent', { defaultValue: 'Sent' })}</Text>
        </Card>
        <Card className="flex-1 items-center py-3">
          <Text className="font-mono-bold text-[20px] text-success">{accepted}</Text>
          <Text variant="caption">{t('recruit.invites.accepted', { defaultValue: 'Accepted' })}</Text>
        </Card>
        <Card className="flex-1 items-center py-3">
          <Text className="font-mono-bold text-[20px] text-ink">{pending}</Text>
          <Text variant="caption">{t('recruit.invites.pending', { defaultValue: 'Pending' })}</Text>
        </Card>
      </View>

      <Card className="gap-3">
        <Text variant="title" className="text-[14px]">
          {t('recruit.invites.formTitle', { defaultValue: 'Invite someone directly' })}
        </Text>
        <Input
          placeholder={t('recruit.invites.namePlaceholder', { defaultValue: 'Name' })}
          value={name}
          onChangeText={setName}
        />
        <Input
          placeholder={t('recruit.invites.contactPlaceholder', { defaultValue: 'Phone or email' })}
          value={contact}
          onChangeText={setContact}
          autoCapitalize="none"
        />
        <View className="flex-row flex-wrap gap-2">
          {INVITE_ROLES.map((r) => (
            <Chip key={r.slug} label={r.label} active={role === r.slug} onPress={() => setRole(r.slug)} />
          ))}
        </View>
        <Button
          title={t('recruit.invites.viaWhatsApp', { defaultValue: 'Invite via WhatsApp' })}
          variant="secondary"
          loading={create.isPending}
          onPress={inviteViaWhatsApp}
        />
        <Button
          title={t('recruit.invites.record', { defaultValue: 'Record invite' })}
          variant="outline"
          loading={create.isPending}
          onPress={recordInvite}
        />
        <Text variant="caption">
          {t('recruit.invites.autoLink', {
            defaultValue: "They'll be auto-linked when they sign up with your code.",
          })}
        </Text>
      </Card>

      {invites.slice(0, 10).map((i) => (
        <Card key={i.id} className="flex-row items-center gap-3 py-3">
          <View className="min-w-0 flex-1">
            <Text variant="title" className="text-[14px]" numberOfLines={1}>
              {i.name || i.contact}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {i.contact} · {i.invited_role.replace(/_/g, ' ')} ·{' '}
              {new Date(i.created_at).toLocaleDateString('en-IN')}
            </Text>
          </View>
          <StatusPill status={i.status} />
          {i.status === 'sent' ? (
            <Pressable
              onPress={() => cancel.mutate(i.id)}
              hitSlop={8}
              accessibilityLabel={t('recruit.invites.cancel', { defaultValue: 'Cancel invite' })}>
              <Text className="text-[13px] font-semibold text-danger">
                {t('recruit.invites.cancel', { defaultValue: 'Cancel' })}
              </Text>
            </Pressable>
          ) : null}
        </Card>
      ))}
    </Disclosure>
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
