import { Ionicons } from '@expo/vector-icons';
import { Alert, Linking, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { logContactEvent, usePromoterContact } from '@/features/buyer/contact';
import { useContent } from '@/features/content/hooks';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

type Row = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  url: string;
  /** Optional activity capture fired just before the link opens. */
  onTap?: () => void;
};

/** Admin-entered values sometimes arrive wrapped in quotes/spaces — normalise before use. */
function clean(raw: string): string {
  return raw.trim().replace(/^["']+|["']+$/g, '').trim();
}

export default function Support() {
  const { get } = useContent();
  const profile = useAuth((s) => s.profile);
  const isReferralBuyer = profile?.role_slug === 'buyer' && profile?.install_source === 'referral';
  const { data: promoter, isLoading: promoterLoading } = usePromoterContact();

  const phone = clean(get('support.phone'));
  const email = clean(get('support.email'));
  const whatsapp = clean(get('support.whatsapp'));
  const hours = get('support.hours');
  const about = get('about.company');
  const tagline = get('brand.tagline');
  const website = clean(get('social.website'));
  const facebook = clean(get('social.facebook'));
  const instagram = clean(get('social.instagram'));
  const youtube = clean(get('social.youtube'));
  const termsUrl = clean(get('legal.terms_url'));
  const privacyUrl = clean(get('legal.privacy_url'));

  // Install-source contact routing (Buyer module spec): a referral-installed
  // buyer contacts ONLY their assigned promoter; everyone else reaches JAMIN.
  const promoterPhone = clean(promoter?.phone ?? '');
  const usePromoter = !!(isReferralBuyer && promoter && promoterPhone);
  const promoterName = promoter?.full_name?.trim() || 'Your promoter';

  const contacts: Row[] = usePromoter
    ? [
        {
          icon: 'call',
          label: `Call ${promoterName}`,
          value: promoterPhone,
          url: `tel:${promoterPhone}`,
          onTap: () => logContactEvent({ target: 'promoter', channel: 'call', promoterId: promoter?.promoter_id }),
        },
        {
          icon: 'logo-whatsapp',
          label: 'WhatsApp',
          value: promoterPhone,
          url: `https://wa.me/${promoterPhone.replace(/[^0-9]/g, '')}`,
          onTap: () => logContactEvent({ target: 'promoter', channel: 'whatsapp', promoterId: promoter?.promoter_id }),
        },
      ]
    : isReferralBuyer && promoterLoading
      ? [] // never flash JAMIN numbers while the promoter is still loading
      : ([
          phone
            ? {
                icon: 'call' as const,
                label: 'Call us',
                value: phone,
                url: `tel:${phone}`,
                onTap: () => logContactEvent({ target: 'jamin', channel: 'call' }),
              }
            : null,
          whatsapp
            ? {
                icon: 'logo-whatsapp' as const,
                label: 'WhatsApp',
                value: whatsapp,
                url: `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`,
                onTap: () => logContactEvent({ target: 'jamin', channel: 'whatsapp' }),
              }
            : null,
          email
            ? {
                icon: 'mail' as const,
                label: 'Email',
                value: email,
                url: `mailto:${email}`,
                onTap: () => logContactEvent({ target: 'jamin', channel: 'email' }),
              }
            : null,
        ].filter(Boolean) as Row[]);

  const legal: Row[] = [
    termsUrl ? { icon: 'document-text', label: 'Terms & Conditions', value: 'View', url: termsUrl } : null,
    privacyUrl ? { icon: 'shield-checkmark', label: 'Privacy Policy', value: 'View', url: privacyUrl } : null,
  ].filter(Boolean) as Row[];

  const socials: Row[] = [
    website ? { icon: 'globe', label: 'Website', value: website, url: website } : null,
    facebook ? { icon: 'logo-facebook', label: 'Facebook', value: 'Facebook', url: facebook } : null,
    instagram ? { icon: 'logo-instagram', label: 'Instagram', value: 'Instagram', url: instagram } : null,
    youtube ? { icon: 'logo-youtube', label: 'YouTube', value: 'YouTube', url: youtube } : null,
  ].filter(Boolean) as Row[];

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title="Help & Support" />

      <View className="gap-1">
        <Text variant="h1">{get('brand.name')}</Text>
        {tagline ? <Text variant="caption">{tagline}</Text> : null}
      </View>

      {about ? (
        <Card className="gap-1">
          <Text variant="label">About us</Text>
          <Text variant="body" className="text-ink">{about}</Text>
        </Card>
      ) : null}

      {contacts.length > 0 ? (
        <View className="gap-2">
          <Text variant="label">{usePromoter ? 'Your JAMIN promoter' : 'Contact'}</Text>
          {usePromoter ? (
            <Text variant="caption">
              {promoterName} looks after you personally — reach out anytime.
            </Text>
          ) : null}
          {contacts.map((r) => (
            <LinkRow key={r.label} {...r} />
          ))}
          {!usePromoter && hours ? <Text variant="caption" className="mt-1">{hours}</Text> : null}
        </View>
      ) : null}

      {socials.length > 0 ? (
        <View className="gap-2">
          <Text variant="label">Follow us</Text>
          {socials.map((r) => (
            <LinkRow key={r.label} {...r} />
          ))}
        </View>
      ) : null}

      {legal.length > 0 ? (
        <View className="gap-2">
          <Text variant="label">Legal</Text>
          {legal.map((r) => (
            <LinkRow key={r.label} {...r} />
          ))}
        </View>
      ) : null}

      {contacts.length === 0 && socials.length === 0 && legal.length === 0 && !about ? (
        <Card>
          <Text variant="body" className="text-muted">
            Support details will appear here soon.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

function LinkRow({ icon, label, value, url, onTap }: Row) {
  return (
    <Pressable
      onPress={() => {
        onTap?.();
        Linking.openURL(url).catch(() =>
          Alert.alert('Could not open', 'No app available to open this link.'),
        );
      }}>
      <Card className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
          <Ionicons name={icon} size={18} color={color.red} />
        </View>
        <View className="flex-1">
          <Text variant="title" className="text-[15px]">{label}</Text>
          <Text variant="caption">{value}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={color.muted} />
      </Card>
    </Pressable>
  );
}
