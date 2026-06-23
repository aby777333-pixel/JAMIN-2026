import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Text } from '@/components/ui/Text';
import { referralUrl } from '@/features/marketing/share';
import { TAGLINE, color } from '@/theme/tokens';

/**
 * Automatic personalization block (§5.07/§6): agent name, phone, referral QR + code
 * and brand line. Carries the tracking code so any scan attributes to the agent (§8).
 */
export function AgentStamp({
  name,
  phone,
  referralCode,
  propertyId,
  onDark = true,
  qrSize = 64,
}: {
  name: string;
  phone?: string | null;
  referralCode: string;
  propertyId?: string;
  onDark?: boolean;
  qrSize?: number;
}) {
  const url = referralUrl(referralCode, propertyId);
  const textColor = onDark ? 'text-white' : 'text-ink';
  const subColor = onDark ? 'text-white/70' : 'text-muted';

  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-1">
        <Text className={`font-bold text-[15px] ${textColor}`} numberOfLines={1}>
          {name}
        </Text>
        {phone ? (
          <Text className={`font-mono text-[12px] ${subColor}`} numberOfLines={1}>
            {phone}
          </Text>
        ) : null}
        <Text className="mt-0.5 font-medium text-[9px] uppercase tracking-[2px] text-gold">
          {TAGLINE}
        </Text>
      </View>
      <View className="items-center rounded-xl bg-white p-1.5">
        <QRCode value={url} size={qrSize} color={color.charcoal} backgroundColor="#FFFFFF" />
        <Text className="mt-0.5 font-mono-bold text-[9px] text-ink">{referralCode}</Text>
      </View>
    </View>
  );
}
