import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { shareReferral } from '@/features/share/referral';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'cash', text: 'Earn commission on every sale you close' },
  { icon: 'people', text: 'Build a team and earn on their sales too' },
  { icon: 'camera', text: 'Create branded ads, brochures & AI marketing' },
  { icon: 'qr-code', text: 'Your own digital business card & referral link' },
  { icon: 'wallet', text: 'Track earnings and withdraw to your account' },
];

/** Open recruiting (§ become a partner) — anyone can self-join as Agent or apply for a senior role. */
export default function BecomePartner() {
  const profile = useAuth((s) => s.profile);
  const refreshProfile = useAuth((s) => s.refreshProfile);
  const [busy, setBusy] = useState(false);
  const isPartner = !!profile?.role_slug && profile.role_slug !== 'buyer';

  async function joinNow() {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('become_partner');
      if (error) throw error;
      await refreshProfile();
      Alert.alert('Welcome aboard! 🎉', "You're now a JAMIN partner — your tools are ready.", [
        { text: 'Get started', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e) {
      Alert.alert('Could not join', errMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function invite() {
    if (profile?.referral_code) {
      shareReferral({ referralCode: profile.referral_code, channel: 'partner_invite' });
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title="Become a Partner" />

      {isPartner ? (
        <Card className="gap-2 bg-charcoal">
          <Text variant="title" className="text-white">
            You're already a partner ✓
          </Text>
          <Text variant="caption" className="text-white/70">
            Head to your dashboard to sell, market and build your team.
          </Text>
          <View className="mt-2">
            <Button title="Go to dashboard" onPress={() => router.replace('/(tabs)')} />
          </View>
        </Card>
      ) : (
        <>
          <Card className="gap-2 bg-charcoal">
            <Text variant="h2" className="text-white">
              Earn with JAMIN
            </Text>
            <Text variant="body" className="text-white/75">
              Join free as an Agent and start earning commission today — sell properties, market like
              a pro, and grow your own team.
            </Text>
          </Card>

          <Card className="gap-3.5">
            {BENEFITS.map((b) => (
              <View key={b.text} className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-red/10">
                  <Ionicons name={b.icon} size={18} color={color.red} />
                </View>
                <Text variant="body" className="flex-1">
                  {b.text}
                </Text>
              </View>
            ))}
          </Card>

          <Button title="Join now — it's free" loading={busy} onPress={joinNow} />
          <Button
            title="Apply for a senior role (Promoter)"
            variant="outline"
            onPress={() => router.push('/forms/promoter')}
          />
        </>
      )}

      <Card className="gap-2 border-gold/40 bg-gold/5">
        <Text variant="label">Invite others</Text>
        <Text variant="caption">
          Know someone who'd make a great partner? Send your invite — they join under you and grow
          your team.
        </Text>
        <View className="mt-1">
          <Button title="Invite a partner" variant="secondary" onPress={invite} />
        </View>
      </Card>
    </Screen>
  );
}
