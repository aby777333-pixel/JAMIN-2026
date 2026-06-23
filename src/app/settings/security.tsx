import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import i18n, { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

export default function Security() {
  const { t, i18n: inst } = useTranslation();
  const biometricEnabled = useAuth((s) => s.biometricEnabled);
  const setBiometric = useAuth((s) => s.setBiometric);

  async function toggleBiometric() {
    const ok = await setBiometric(!biometricEnabled);
    if (!ok && !biometricEnabled) {
      Alert.alert('Unavailable', 'No biometric is set up on this device, or it was cancelled.');
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title="Security & language" />

      <Text variant="label">App lock</Text>
      <Pressable onPress={toggleBiometric}>
        <Card className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-red/10">
            <Ionicons name="finger-print" size={18} color={color.red} />
          </View>
          <View className="flex-1">
            <Text variant="title" className="text-[15px]">
              Biometric unlock
            </Text>
            <Text variant="caption">Require Face/Touch ID when opening the app</Text>
          </View>
          <Ionicons
            name={biometricEnabled ? 'toggle' : 'toggle-outline'}
            size={34}
            color={biometricEnabled ? color.success : color.muted}
          />
        </Card>
      </Pressable>

      <Text variant="label" className="mt-2">
        Language
      </Text>
      <Text variant="caption">{t('brand.tagline')}</Text>
      <View className="flex-row flex-wrap gap-2">
        {SUPPORTED_LANGUAGES.map((l) => (
          <Chip
            key={l.code}
            label={l.label}
            active={inst.language === l.code}
            onPress={() => i18n.changeLanguage(l.code)}
          />
        ))}
      </View>
    </Screen>
  );
}
