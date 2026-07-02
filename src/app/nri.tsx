import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useConfig } from '@/features/config/hooks';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

/** Gulf + common NRI countries with their IST offset (hours; IST = UTC+5:30). */
const COUNTRIES = [
  { key: 'UAE', label: '🇦🇪 UAE', currency: 'AED', istAhead: 1.5 },
  { key: 'Saudi Arabia', label: '🇸🇦 Saudi', currency: 'SAR', istAhead: 2.5 },
  { key: 'Qatar', label: '🇶🇦 Qatar', currency: 'QAR', istAhead: 2.5 },
  { key: 'Kuwait', label: '🇰🇼 Kuwait', currency: 'KWD', istAhead: 2.5 },
  { key: 'Oman', label: '🇴🇲 Oman', currency: 'OMR', istAhead: 1.5 },
  { key: 'Bahrain', label: '🇧🇭 Bahrain', currency: 'BHD', istAhead: 2.5 },
  { key: 'USA', label: '🇺🇸 USA', currency: 'USD', istAhead: 10.5 },
  { key: 'UK', label: '🇬🇧 UK', currency: 'GBP', istAhead: 5.5 },
  { key: 'Europe', label: '🇪🇺 Europe', currency: 'EUR', istAhead: 4.5 },
  { key: 'Singapore', label: '🇸🇬 Singapore', currency: 'SGD', istAhead: -2.5 },
] as const;

/** NRI-desk guide keys seeded in app_content (admin-editable, live). */
const GUIDE_KEYS = ['nri_docs', 'nri_poa', 'nri_tax', 'nri_repatriation', 'nri_payment_plans', 'nri_loans'] as const;

function useNriGuides() {
  return useQuery({
    queryKey: ['nri_guides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_content')
        .select('key,label,value')
        .in('key', GUIDE_KEYS as unknown as string[])
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * NRI Corner — the toolkit for overseas (especially Gulf) buyers: currency
 * view, best-time-to-call, documentation/POA/tax/repatriation guides (all
 * admin-editable), payment plans, and one-tap callback / video-visit requests.
 */
export default function NriCorner() {
  const profile = useAuth((s) => s.profile);
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>(COUNTRIES[0]);
  const [amount, setAmount] = useState('100000');
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);

  const { data: rates } = useConfig<Record<string, number>>('nri_fx_rates', {});
  const { data: phone } = useConfig<string>('nri_support_phone', '');
  const { data: whatsapp } = useConfig<string>('nri_support_whatsapp', '');
  const guides = useNriGuides();

  const rate = rates?.[country.currency];
  const inr = useMemo(() => {
    const n = Number(amount.replace(/[^\d.]/g, ''));
    if (!rate || !n) return null;
    return n * rate;
  }, [amount, rate]);

  /** "Good time to call India" — 9:00–20:00 IST expressed in the buyer's local time. */
  const callWindow = useMemo(() => {
    const fmt = (istHour: number) => {
      const local = istHour - country.istAhead;
      const h = ((local % 24) + 24) % 24;
      const hh = Math.floor(h);
      const mm = Math.round((h - hh) * 60);
      const ampm = hh >= 12 ? 'PM' : 'AM';
      const h12 = hh % 12 === 0 ? 12 : hh % 12;
      return `${h12}:${mm.toString().padStart(2, '0')} ${ampm}`;
    };
    return `${fmt(9)} – ${fmt(20)} (your time)`;
  }, [country]);

  async function request(kind: 'callback' | 'video_visit' | 'docs_help') {
    setRequesting(kind);
    try {
      const { error } = await supabase.from('nri_requests').insert({
        user_id: profile?.id ?? null,
        name: profile?.full_name ?? null,
        phone: profile?.phone ?? null,
        country: country.key,
        preferred_time: callWindow,
        kind,
      });
      if (error) throw error;
      Alert.alert('Request received 🙏', 'Our NRI desk will reach out in your preferred window.');
    } catch (e) {
      Alert.alert('Could not send', errMessage(e));
    } finally {
      setRequesting(null);
    }
  }

  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open', url);
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-4" keyboardAvoiding>
      <BackHeader title="NRI Corner" />
      <Text variant="caption">
        Buying from the Gulf or overseas? Everything you need — documents, POA, taxes, currency and a
        dedicated desk that works around your time zone.
      </Text>

      {/* Country */}
      <View className="gap-1.5">
        <Text variant="label">I live in</Text>
        <View className="flex-row flex-wrap gap-2">
          {COUNTRIES.map((c) => (
            <Chip key={c.key} label={c.label} active={country.key === c.key} onPress={() => setCountry(c)} />
          ))}
        </View>
      </View>

      {/* FX converter */}
      <Card className="gap-2">
        <Text variant="label">Quick currency view</Text>
        <View className="flex-row items-end gap-3">
          <View className="flex-1">
            <Input label={`Amount (${country.currency})`} value={amount} onChangeText={setAmount} keyboardType="numeric" />
          </View>
          <View className="flex-1 pb-1">
            <Text variant="caption">≈ Indian Rupees</Text>
            <Text variant="h2" className="text-red">
              {inr ? `₹${Math.round(inr).toLocaleString('en-IN')}` : '—'}
            </Text>
            {rate ? (
              <Text variant="caption">1 {country.currency} ≈ ₹{rate} (indicative)</Text>
            ) : (
              <Text variant="caption">Rate not set yet.</Text>
            )}
          </View>
        </View>
      </Card>

      {/* Best time to call */}
      <Card className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-gold/20">
          <Ionicons name="time" size={22} color={color.goldDeep} />
        </View>
        <View className="flex-1">
          <Text variant="title" className="text-[14px]">Best time to reach us</Text>
          <Text variant="caption">Our desk is live 9 AM – 8 PM IST → {callWindow}</Text>
        </View>
      </Card>

      {/* One-tap requests */}
      <View className="gap-2">
        <Text variant="label">How can we help?</Text>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              title="Call me back"
              variant="outline"
              loading={requesting === 'callback'}
              left={<Ionicons name="call" size={15} color={color.ink} />}
              onPress={() => request('callback')}
            />
          </View>
          <View className="flex-1">
            <Button
              title="Video site visit"
              variant="outline"
              loading={requesting === 'video_visit'}
              left={<Ionicons name="videocam" size={15} color={color.ink} />}
              onPress={() => request('video_visit')}
            />
          </View>
        </View>
        <Button
          title="Help with documents / POA"
          variant="outline"
          loading={requesting === 'docs_help'}
          left={<Ionicons name="document-text" size={15} color={color.ink} />}
          onPress={() => request('docs_help')}
        />
      </View>

      {/* Direct lines */}
      {phone || whatsapp ? (
        <View className="flex-row gap-2">
          {phone ? (
            <View className="flex-1">
              <Button
                title="Call NRI desk"
                left={<Ionicons name="call" size={16} color="#FFFFFF" />}
                onPress={() => open(`tel:${String(phone).replace(/\s+/g, '')}`)}
              />
            </View>
          ) : null}
          {whatsapp ? (
            <View className="flex-1">
              <Button
                title="WhatsApp us"
                variant="secondary"
                left={<Ionicons name="logo-whatsapp" size={16} color={color.ink} />}
                onPress={() => open(`https://wa.me/${String(whatsapp).replace(/[^\d]/g, '')}`)}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Guides (admin-editable content) */}
      <View className="gap-2">
        <Text variant="label">NRI guides</Text>
        {(guides.data ?? []).map((g) => (
          <Pressable key={g.key} onPress={() => setOpenGuide(openGuide === g.key ? null : g.key)}>
            <Card className="gap-1.5">
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name={openGuide === g.key ? 'chevron-down' : 'chevron-forward'}
                  size={16}
                  color={color.muted}
                />
                <Text variant="title" className="flex-1 text-[14px]">{g.label}</Text>
              </View>
              {openGuide === g.key ? (
                <Text variant="body" className="text-[13px] leading-5">{g.value ?? ''}</Text>
              ) : null}
            </Card>
          </Pressable>
        ))}
        {guides.isLoading ? <Text variant="caption">Loading guides…</Text> : null}
      </View>

      <Text variant="caption" className="text-center text-muted">
        Indicative information only — our team and your CA will confirm specifics for your country.
      </Text>
    </Screen>
  );
}
