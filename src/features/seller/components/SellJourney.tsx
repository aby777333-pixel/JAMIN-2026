import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { accentFor, category, color } from '@/theme/tokens';

/**
 * "How selling works" strip — purely informational. Shows the production
 * lifecycle every listing already follows (submissions API + admin approval):
 * submit with media → JAMIN review (pending) → live on the marketplace for
 * buyers and the whole referral network. No logic, just orientation.
 */
export function SellJourney() {
  const { t } = useTranslation();
  const steps = [
    {
      icon: 'cloud-upload' as const,
      accent: category.sell,
      title: t('sell.journey.submit', { defaultValue: 'Submit' }),
      caption: t('sell.journey.submitSub', { defaultValue: 'Photos, videos & documents' }),
    },
    {
      icon: 'shield-checkmark' as const,
      accent: category.docs,
      title: t('sell.journey.review', { defaultValue: 'JAMIN review' }),
      caption: t('sell.journey.reviewSub', { defaultValue: 'Pending until approved' }),
    },
    {
      icon: 'globe' as const,
      accent: category.buy,
      title: t('sell.journey.live', { defaultValue: 'Goes live' }),
      caption: t('sell.journey.liveSub', { defaultValue: 'Buyers, promoters, brokers & agents' }),
    },
  ];

  return (
    <Card className="flex-row items-start px-2 py-3">
      {steps.map((s, i) => {
        const a = accentFor(s.accent);
        return (
          <View key={s.title} className="flex-1 flex-row items-start">
            {i > 0 ? (
              <Ionicons
                name="chevron-forward"
                size={14}
                color={color.muted}
                style={{ marginTop: 12 }}
              />
            ) : null}
            <View className="flex-1 items-center gap-1">
              <View
                className="h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: a.soft }}>
                <Ionicons name={s.icon} size={17} color={a.main} />
              </View>
              <Text className="text-center text-[11px] font-semibold text-ink" numberOfLines={1}>
                {s.title}
              </Text>
              <Text className="text-center text-[10px] leading-[13px] text-muted" numberOfLines={2}>
                {s.caption}
              </Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}
