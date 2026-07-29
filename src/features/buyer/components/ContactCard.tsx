import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { CONTACT_ROUTED_ROLES, isReferralRouted, logContactEvent, usePromoterContact } from '@/features/buyer/contact';
import { useContent } from '@/features/content/hooks';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

/** Admin-entered values sometimes arrive wrapped in quotes/spaces — normalise before use. */
function clean(raw: string): string {
  return raw.trim().replace(/^["']+|["']+$/g, '').trim();
}

type ContactRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  url: string;
  channel: 'call' | 'whatsapp' | 'email';
};

/**
 * Contact block (Buyer + Seller module specs). Routing follows the install source:
 *  - direct install       → call/WhatsApp/email Jamin Bazaar (app_content support.*)
 *  - promoter referral    → call/WhatsApp ONLY the assigned promoter
 * Every tap is captured in contact_events for the admin's engagement view.
 * Renders for buyers and seller-side roles; partners keep their CTA blocks.
 */
export function ContactCard({ propertyId }: { propertyId?: string }) {
  const { t } = useTranslation();
  const profile = useAuth((s) => s.profile);
  const isEligible = !!profile?.role_slug && CONTACT_ROUTED_ROLES.includes(profile.role_slug);
  const isReferral = isReferralRouted(profile);
  const { data: promoter, isLoading: promoterLoading } = usePromoterContact();
  const { get } = useContent();

  if (!isEligible) return null;
  // Referral buyer: never show Jamin Bazaar numbers while the promoter is still loading.
  if (isReferral && promoterLoading) return null;

  const promoterPhone = clean(promoter?.phone ?? '');
  const usePromoter = !!(isReferral && promoter && promoterPhone);

  let rows: ContactRow[];
  let heading: string;
  let sub: string;
  if (usePromoter) {
    const name = promoter?.full_name?.trim() || t('contact.yourPromoter', { defaultValue: 'Your promoter' });
    heading = t('contact.promoterTitle', { defaultValue: 'Your Jamin Bazaar promoter' });
    sub = t('contact.promoterSub', {
      defaultValue: '{{name}} looks after you personally — call or message anytime.',
      name,
    });
    rows = [
      {
        icon: 'call',
        label: t('contact.callName', { defaultValue: 'Call {{name}}', name }),
        value: promoterPhone,
        url: `tel:${promoterPhone}`,
        channel: 'call',
      },
      {
        icon: 'logo-whatsapp',
        label: t('contact.whatsapp', { defaultValue: 'WhatsApp' }),
        value: promoterPhone,
        url: `https://wa.me/${promoterPhone.replace(/[^0-9]/g, '')}`,
        channel: 'whatsapp',
      },
    ];
  } else {
    const phone = clean(get('support.phone'));
    const whatsapp = clean(get('support.whatsapp'));
    const email = clean(get('support.email'));
    heading = t('contact.jaminTitle', { defaultValue: 'Talk to Jamin Bazaar' });
    sub = t('contact.jaminSub', { defaultValue: 'Our team answers every question — no obligation.' });
    rows = [
      phone
        ? { icon: 'call' as const, label: t('contact.callJamin', { defaultValue: 'Call Jamin Bazaar' }), value: phone, url: `tel:${phone}`, channel: 'call' as const }
        : null,
      whatsapp
        ? { icon: 'logo-whatsapp' as const, label: t('contact.whatsapp', { defaultValue: 'WhatsApp' }), value: whatsapp, url: `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`, channel: 'whatsapp' as const }
        : null,
      email
        ? { icon: 'mail' as const, label: t('contact.email', { defaultValue: 'Email' }), value: email, url: `mailto:${email}`, channel: 'email' as const }
        : null,
    ].filter(Boolean) as ContactRow[];
  }

  if (!rows.length) return null;

  function onPress(row: ContactRow) {
    logContactEvent({
      target: usePromoter ? 'promoter' : 'jamin',
      channel: row.channel,
      propertyId: propertyId ?? null,
      promoterId: usePromoter ? promoter?.promoter_id : null,
    });
    Linking.openURL(row.url).catch(() =>
      Alert.alert(
        t('contact.couldNotOpen', { defaultValue: 'Could not open' }),
        t('contact.noApp', { defaultValue: 'No app available to open this link.' }),
      ),
    );
  }

  return (
    <Card className="gap-2.5">
      <View className="flex-row items-center gap-2">
        <Ionicons name={usePromoter ? 'person-circle' : 'headset'} size={18} color={color.red} />
        <View className="min-w-0 flex-1">
          <Text variant="title" className="text-[15px]">{heading}</Text>
          <Text variant="caption">{sub}</Text>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {rows.map((r) => (
          <Pressable
            key={r.channel}
            onPress={() => onPress(r)}
            className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2.5">
            <Ionicons name={r.icon} size={16} color={color.red} />
            <Text className="text-[13px] font-semibold text-ink">{r.label}</Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}
