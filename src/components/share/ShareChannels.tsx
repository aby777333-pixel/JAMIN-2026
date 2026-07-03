import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { shareToChannel, type Channel } from '@/features/marketing/share';

/** Each channel carries its brand colour — tiles get a soft tint of it. */
const CHANNELS: { key: Channel; icon: keyof typeof Ionicons.glyphMap; label: string; tint: string }[] = [
  { key: 'whatsapp', icon: 'logo-whatsapp', label: 'WhatsApp', tint: '#25D366' },
  { key: 'telegram', icon: 'paper-plane', label: 'Telegram', tint: '#229ED9' },
  { key: 'facebook', icon: 'logo-facebook', label: 'Facebook', tint: '#1877F2' },
  { key: 'twitter', icon: 'logo-twitter', label: 'X', tint: '#111111' },
  { key: 'linkedin', icon: 'logo-linkedin', label: 'LinkedIn', tint: '#0A66C2' },
  { key: 'karochat', icon: 'chatbubbles', label: 'KaroChat', tint: '#FD0001' },
  { key: 'sms', icon: 'chatbubble', label: 'SMS', tint: '#12A594' },
  { key: 'email', icon: 'mail', label: 'Email', tint: '#D9A514' },
  { key: 'copy', icon: 'copy', label: 'Copy', tint: '#8E4EC6' },
  { key: 'system', icon: 'ellipsis-horizontal', label: 'More', tint: '#74746E' },
];

/** Per-channel link sharing (§5.07 sharing channels). "More" opens the full OS sheet. */
export function ShareChannels({
  text,
  url,
  onShare,
}: {
  text: string;
  url: string;
  onShare?: (channel: Channel) => void;
}) {
  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {CHANNELS.map((c) => (
        <Pressable
          key={c.key}
          onPress={() => {
            onShare?.(c.key);
            void shareToChannel(c.key, text, url);
          }}
          className="w-[31%] items-center gap-1 rounded-2xl border py-3"
          style={{ backgroundColor: `${c.tint}14`, borderColor: `${c.tint}45` }}>
          <Ionicons name={c.icon} size={22} color={c.tint} />
          <Text variant="caption" className="text-ink">{c.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
