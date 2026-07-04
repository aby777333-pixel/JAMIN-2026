import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SUPPORTED_LANGUAGES, setAppLanguage } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { accentFor, color } from '@/theme/tokens';

/** English name shown under each native label so any reader can find their way. */
const ENGLISH_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  ml: 'Malayalam',
  te: 'Telugu',
  kn: 'Kannada',
  ur: 'Urdu',
  mr: 'Marathi',
  bn: 'Bengali',
  gu: 'Gujarati',
};

/**
 * Language Settings (AI-vision pillar #4: "Translate All Text — from settings,
 * GLOBAL"). Picking a language re-localizes the whole app instantly, persists
 * across restarts, and is remembered on the profile for personalised messages.
 */
export default function LanguageSettings() {
  const { t, i18n } = useTranslation();
  const profile = useAuth((s) => s.profile);
  const [active, setActive] = useState(i18n.language);

  async function choose(code: string) {
    setActive(code);
    await setAppLanguage(code);
    // Remember on the profile too (best-effort; UI doesn't wait on it).
    if (profile?.id) {
      void supabase.from('profiles').update({ language: code }).eq('id', profile.id);
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-4">
      <BackHeader title={t('settings.language.title')} />

      <Card className="gap-1 bg-charcoal">
        <Text variant="title" className="text-white">
          🌏 {t('settings.language.heroTitle')}
        </Text>
        <Text variant="caption" className="text-white/75">
          {t('settings.language.heroBody')}
        </Text>
      </Card>

      <View className="gap-2">
        {SUPPORTED_LANGUAGES.map((l, i) => {
          const selected = active === l.code;
          const tint = accentFor(i).main;
          return (
            <Pressable key={l.code} onPress={() => choose(l.code)}>
              <Card
                className={`flex-row items-center gap-3 ${selected ? 'border-red bg-red/5' : ''}`}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${tint}22` }}>
                  <Text className="font-bold text-[15px]" style={{ color: tint }}>
                    {l.label.charAt(0)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text variant="title" className="text-[15px]">
                    {l.label}
                  </Text>
                  <Text variant="caption" className="text-muted">
                    {ENGLISH_NAMES[l.code] ?? l.code}
                  </Text>
                </View>
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={selected ? color.success : color.line}
                />
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Text variant="caption" className="text-center text-muted">
        {t('settings.language.note')}
      </Text>
    </Screen>
  );
}
