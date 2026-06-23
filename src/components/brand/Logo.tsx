import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { TAGLINE } from '@/theme/tokens';

const LOGO = require('@/assets/brand/jamin-logo.png');

/** Full JAMIN wordmark (the official logo image), optionally with the tagline. */
export function Logo({
  width = 240,
  showTagline = false,
}: {
  width?: number;
  showTagline?: boolean;
}) {
  return (
    <View className="items-center">
      <Image
        source={LOGO}
        style={{ width, height: width * 0.39 }}
        contentFit="contain"
        accessibilityLabel="JAMIN Properties"
      />
      {showTagline ? (
        <Text className="mt-1 font-medium uppercase tracking-[3px] text-[11px] text-gold-deep">
          {TAGLINE}
        </Text>
      ) : null}
    </View>
  );
}
