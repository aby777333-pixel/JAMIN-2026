import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useContent } from '@/features/content/hooks';
import { color } from '@/theme/tokens';

type Row = { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; url: string };

export default function Support() {
  const { get } = useContent();
  const phone = get('support.phone');
  const email = get('support.email');
  const whatsapp = get('support.whatsapp');
  const hours = get('support.hours');
  const about = get('about.company');
  const tagline = get('brand.tagline');

  const contacts: Row[] = [
    phone ? { icon: 'call', label: 'Call us', value: phone, url: `tel:${phone}` } : null,
    whatsapp
      ? { icon: 'logo-whatsapp', label: 'WhatsApp', value: whatsapp, url: `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}` }
      : null,
    email ? { icon: 'mail', label: 'Email', value: email, url: `mailto:${email}` } : null,
  ].filter(Boolean) as Row[];

  const socials: Row[] = [
    get('social.website') ? { icon: 'globe', label: 'Website', value: get('social.website'), url: get('social.website') } : null,
    get('social.facebook') ? { icon: 'logo-facebook', label: 'Facebook', value: 'Facebook', url: get('social.facebook') } : null,
    get('social.instagram') ? { icon: 'logo-instagram', label: 'Instagram', value: 'Instagram', url: get('social.instagram') } : null,
    get('social.youtube') ? { icon: 'logo-youtube', label: 'YouTube', value: 'YouTube', url: get('social.youtube') } : null,
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

      {contacts.length === 0 && socials.length === 0 && !about ? (
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
    <Pressable onPress={() => Linking.openURL(url)}>
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
