import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { shareToChannel, type Channel } from '@/features/marketing/share';
import { color } from '@/theme/tokens';

const CHANNELS: { key: Channel; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'whatsapp', icon: 'logo-whatsapp', label: 'WhatsApp' },
  { key: 'telegram', icon: 'paper-plane', label: 'Telegram' },
  { key: 'sms', icon: 'chatbubble', label: 'SMS' },
  { key: 'email', icon: 'mail', label: 'Email' },
  { key: 'copy', icon: 'copy', label: 'Copy' },
  { key: 'system', icon: 'ellipsis-horizontal', label: 'More' },
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
          className="w-[31%] items-center gap-1 rounded-2xl border border-line bg-surface py-3">
          <Ionicons name={c.icon} size={22} color={color.ink} />
          <Text variant="caption">{c.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
