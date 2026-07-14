import { Ionicons } from '@expo/vector-icons';
import { Alert, Linking, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useContent } from '@/features/content/hooks';
import { color } from '@/theme/tokens';

type Row = { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; url: string };

/** Admin-entered values sometimes arrive wrapped in quotes/spaces — normalise before use. */
function clean(raw: string): string {
  return raw.trim().replace(/^["']+|["']+$/g, '').trim();
}

export default function Support() {
  const { get } = useContent();
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

  const contacts: Row[] = [
    phone ? { icon: 'call', label: 'Call us', value: phone, url: `tel:${phone}` } : null,
    whatsapp
      ? { icon: 'logo-whatsapp', label: 'WhatsApp', value: whatsapp, url: `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}` }
      : null,
    email ? { icon: 'mail', label: 'Email', value: email, url: `mailto:${email}` } : null,
  ].filter(Boolean) as Row[];

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
          <Text variant="label">Contact</Text>
          {contacts.map((r) => (
            <LinkRow key={r.label} {...r} />
          ))}
          {hours ? <Text variant="caption" className="mt-1">{hours}</Text> : null}
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

function LinkRow({ icon, label, value, url }: Row) {
  return (
    <Pressable
      onPress={() =>
        Linking.openURL(url).catch(() =>
          Alert.alert('Could not open', 'No app available to open this link.'),
        )
      }>
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
