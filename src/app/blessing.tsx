import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Share, View } from 'react-native';

import { AuspiciousDatesCard } from '@/features/astro/AuspiciousDatesCard';
import { BLESSING_CHECKLISTS } from '@/features/faith/checklists';
import { blessedDates, TRADITIONS, type Tradition } from '@/features/faith/engine';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

/**
 * Blessing Scheduler — house-blessing dates & ceremony checklists for EVERY
 * tradition (we sell to all communities). Hindu shows the richer Muhurat
 * engine; Muslim/Christian/Sikh/Jain/other get the faith engine's blessed
 * dates + their own checklist. The chosen tradition is remembered on the
 * profile so the whole app can personalise.
 */
export default function BlessingScheduler() {
  const profile = useAuth((s) => s.profile);
  const refreshProfile = useAuth((s) => s.refreshProfile);
  const saved = (profile?.tradition ?? null) as Tradition | null;
  const [tradition, setTradition] = useState<Tradition>(saved ?? 'hindu');

  const dates = useMemo(() => blessedDates(tradition, new Date(), 6), [tradition]);
  const checklist = BLESSING_CHECKLISTS[tradition];

  async function choose(t: Tradition) {
    setTradition(t);
    // Remember on the profile (best-effort; the screen works regardless).
    if (profile?.id && t !== saved) {
      const { error } = await supabase.from('profiles').update({ tradition: t }).eq('id', profile.id);
      if (!error) void refreshProfile();
    }
  }

  async function shareDates() {
    const lines = dates
      .map((d) => `• ${d.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} — ${d.reason}`)
      .join('\n');
    try {
      await Share.share({
        message: `Blessing-day suggestions for our new home 🏡\n${lines}\n\nvia JAMIN Properties · Signature for Fortune`,
      });
    } catch {
      /* dismissed */
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title="Blessing Scheduler" />
      <Text variant="caption">
        Every family celebrates a new home in its own beautiful way. Choose your tradition — we’ll suggest
        dates and a ceremony checklist. Your choice also personalises festivals across the app.
      </Text>

      <View className="gap-1.5">
        <Text variant="label">My tradition</Text>
        <View className="flex-row flex-wrap gap-2">
          {TRADITIONS.map((t) => (
            <Chip key={t.key} label={t.label} active={tradition === t.key} onPress={() => choose(t.key)} />
          ))}
        </View>
      </View>

      {tradition === 'hindu' ? (
        <>
          <AuspiciousDatesCard title="Upcoming auspicious dates" subtitle="Good muhurat days for your house-warming" />
          <Pressable onPress={() => router.push('/griha-pravesh')}>
            <Card className="flex-row items-center gap-3 border-gold/40 bg-gold/5">
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-gold/20">
                <Ionicons name="home" size={22} color={color.goldDeep} />
              </View>
              <View className="flex-1">
                <Text variant="title" className="text-[14px]">Griha Pravesh checklist</Text>
                <Text variant="caption">The full house-warming guide with muhurat</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.muted} />
            </Card>
          </Pressable>
        </>
      ) : (
        <>
          <Card className="gap-2">
            <Text variant="label">Suggested blessing days</Text>
            {dates.length ? (
              dates.map((d) => (
                <View key={d.date.toISOString()} className="flex-row items-start gap-2">
                  <Ionicons name="calendar" size={15} color={color.goldDeep} style={{ marginTop: 2 }} />
                  <View className="flex-1">
                    <Text variant="title" className="text-[13px]">
                      {d.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                    <Text variant="caption">{d.reason}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text variant="caption">Pick a tradition above to see suggestions.</Text>
            )}
            <Button
              title="Share these dates"
              variant="outline"
              left={<Ionicons name="share-social" size={16} color={color.ink} />}
              onPress={shareDates}
            />
          </Card>

          {checklist ? (
            <Card className="gap-2.5">
              <Text variant="label">{checklist.heading} — checklist</Text>
              {checklist.items.map((it, i) => (
                <View key={it.title} className="flex-row items-start gap-2">
                  <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-gold/20">
                    <Text className="text-[11px] font-bold text-ink">{i + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <Text variant="title" className="text-[13px]">{it.title}</Text>
                    {it.note ? <Text variant="caption">{it.note}</Text> : null}
                  </View>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      )}

      <Text variant="caption" className="text-center text-muted">
        Suggestions follow widely-observed customs — your family’s guru, imam, priest or elder always knows best. 🙏
      </Text>
    </Screen>
  );
}
