import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ShareChannels } from '@/components/share/ShareChannels';
import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { logArtifactShare, referralUrl } from '@/features/marketing/share';
import { useCampaigns, useCreateCampaign, useReferralFunnel, type Campaign } from '@/features/referral/api';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

const STAGES: { key: 'shared' | 'clicked' | 'registered' | 'verified' | 'assigned'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'shared', label: 'Shared', icon: 'share-social' },
  { key: 'clicked', label: 'Clicked', icon: 'finger-print' },
  { key: 'registered', label: 'Registered', icon: 'person-add' },
  { key: 'verified', label: 'Verified', icon: 'shield-checkmark' },
  { key: 'assigned', label: 'Joined your team', icon: 'people' },
];

/**
 * Referral Engine (§8, MOD08) — the share → click → register → verify → assign funnel,
 * campaign creation and campaign-tagged sharing. Every share carries a device
 * fingerprint; the DB flags suspicious conversions.
 */
export default function ReferralsScreen() {
  const profile = useAuth((s) => s.profile);
  const code = profile?.referral_code ?? 'JAMIN';
  const { data: funnel, isLoading } = useReferralFunnel(30);
  const { data: campaigns = [] } = useCampaigns();
  const create = useCreateCampaign();
  const [name, setName] = useState('');

  const max = Math.max(funnel?.shared ?? 0, 1);

  async function onCreate() {
    const n = name.trim();
    if (!n) return;
    await create.mutateAsync({ name: n });
    setName('');
  }

  return (
    <Screen contentClassName="pb-12 gap-5" keyboardAvoiding>
      <BackHeader title="Referral Engine" />

      {/* ── Funnel (last 30 days) ── */}
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text variant="label">Your funnel · 30 days</Text>
          {funnel && funnel.flagged > 0 ? (
            <Badge label={`${funnel.flagged} flagged`} tone="sold" />
          ) : null}
        </View>

        {isLoading ? (
          <View className="items-center py-10">
            <ActivityIndicator color={color.red} />
          </View>
        ) : (
          <Card className="gap-3">
            {STAGES.map((s) => {
              const n = funnel?.[s.key] ?? 0;
              const pct = Math.round((n / max) * 100);
              return (
                <View key={s.key} className="gap-1">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name={s.icon} size={15} color={color.muted} />
                      <Text variant="body">{s.label}</Text>
                    </View>
                    <Text className="font-mono-bold text-[15px] text-ink">{n}</Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-line">
                    <View
                      className="h-2 rounded-full"
                      style={{ width: `${Math.max(pct, n > 0 ? 6 : 0)}%`, backgroundColor: color.red }}
                    />
                  </View>
                </View>
              );
            })}
          </Card>
        )}
        <Text variant="caption">
          Every share embeds your QR + code. Scans on the web invite page and signups in the app
          flow back here automatically.
        </Text>
      </View>

      {/* ── Campaigns ── */}
      <View className="gap-2">
        <Text variant="label">Campaigns</Text>
        <Card className="gap-3">
          <Input
            label="New campaign"
            placeholder="e.g. Diwali Plots Drive"
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={onCreate}
          />
          <Button title="Create campaign" loading={create.isPending} onPress={onCreate} />
        </Card>

        {campaigns.length === 0 ? (
          <Text variant="caption">
            No campaigns yet. Create one to track a specific push (a launch, an offer, a channel) —
            its shares are attributed separately.
          </Text>
        ) : (
          campaigns.map((c) => <CampaignRow key={c.id} campaign={c} code={code} />)
        )}
      </View>
    </Screen>
  );
}

function CampaignRow({ campaign, code }: { campaign: Campaign; code: string }) {
  const url = referralUrl(code, undefined, campaign.slug);
  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text variant="title" numberOfLines={1} className="flex-1">
          {campaign.name}
        </Text>
        <Badge label={campaign.active ? 'Active' : 'Off'} tone={campaign.active ? 'available' : 'neutral'} />
      </View>
      <Text variant="caption" className="font-mono">{url}</Text>
      <ShareChannels
        text={`Join me on JAMIN Properties — ${campaign.name}`}
        url={url}
        onShare={(ch) =>
          logArtifactShare({
            artifact: 'link',
            referralCode: code,
            channel: ch,
            campaignId: campaign.id,
          })
        }
      />
    </Card>
  );
}
