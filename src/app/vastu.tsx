import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';

/**
 * Vastu & Muhurat — a client-only cultural guide for buyers. Traditional
 * beliefs are a major factor in Indian property decisions (plot facing,
 * numerology, auspicious dates), so we surface friendly, non-authoritative
 * guidance. No DB, no network — pure static reference + two calculators.
 */

type Rating = 'auspicious' | 'neutral' | 'caution';

const RATING_TONE: Record<Rating, 'available' | 'reserved' | 'neutral'> = {
  auspicious: 'available',
  neutral: 'neutral',
  caution: 'reserved',
};

const DIRECTIONS: {
  key: string;
  name: string;
  deity: string;
  rating: Rating;
  note: string;
}[] = [
  { key: 'NE', name: 'North-East (Ishanya)', deity: 'Ishvara — water', rating: 'auspicious', note: 'The most auspicious corner. Ideal for the main entrance, pooja room and water source. Keep it open, clean and light.' },
  { key: 'N', name: 'North (Kubera)', deity: 'Kubera — wealth', rating: 'auspicious', note: 'Governs wealth and career growth. A north-facing plot or entrance is highly sought after.' },
  { key: 'E', name: 'East (Surya)', deity: 'Surya — the Sun', rating: 'auspicious', note: 'Brings health, vitality and prosperity. East-facing entrances catch the morning sun — very favourable.' },
  { key: 'W', name: 'West (Varuna)', deity: 'Varuna — rain', rating: 'neutral', note: 'Balanced and stable. Good for those in the later stages of career; suitable with the right internal layout.' },
  { key: 'SE', name: 'South-East (Agni)', deity: 'Agni — fire', rating: 'neutral', note: 'The fire corner — best for the kitchen. Avoid placing the main entrance or water tank here.' },
  { key: 'NW', name: 'North-West (Vayu)', deity: 'Vayu — wind', rating: 'neutral', note: 'Movement and relationships. Good for guest rooms and stores; keep it lighter than the south-west.' },
  { key: 'S', name: 'South (Yama)', deity: 'Yama — discipline', rating: 'caution', note: 'Needs careful planning. Keep this side heavier/taller and avoid large openings for balance.' },
  { key: 'SW', name: 'South-West (Nairutya)', deity: 'Nairutya — stability', rating: 'caution', note: 'Should be the heaviest, highest zone — ideal for the master bedroom. Avoid the main entrance, pits or slopes here.' },
];

const MULANK: Record<number, { ruler: string; vibe: string }> = {
  1: { ruler: 'Sun', vibe: 'Leadership, independence and a strong new beginning.' },
  2: { ruler: 'Moon', vibe: 'Harmony, family bonding and emotional comfort.' },
  3: { ruler: 'Jupiter', vibe: 'Growth, wisdom and prosperity — considered very lucky.' },
  4: { ruler: 'Rahu', vibe: 'Stability through effort; plan finances carefully.' },
  5: { ruler: 'Mercury', vibe: 'Business, communication and quick fortune — highly favourable.' },
  6: { ruler: 'Venus', vibe: 'Luxury, love and domestic bliss — excellent for family homes.' },
  7: { ruler: 'Ketu', vibe: 'Peace and spirituality; steady rather than flashy gains.' },
  8: { ruler: 'Saturn', vibe: 'Rewards after patience and discipline; mixed but powerful.' },
  9: { ruler: 'Mars', vibe: 'Energy, courage and drive — strong, action-oriented number.' },
};

function toMulank(raw: string): number | null {
  const digits = (raw.match(/\d/g) ?? []).map(Number);
  if (digits.length === 0) return null;
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9) {
    sum = String(sum)
      .split('')
      .reduce((a, b) => a + Number(b), 0);
  }
  return sum === 0 ? null : sum;
}

const MUHURAT_TIPS = [
  'Griha Pravesh (house-warming) is traditionally done in Magha, Phalguna, Vaishakha and Jyeshtha months.',
  'Favoured weekdays are Monday, Wednesday, Thursday and Friday; many avoid Tuesday and Saturday.',
  'Uttarayana (Jan–Jul, the sun’s northward journey) is preferred over Dakshinayana for new beginnings.',
  'Avoid the Adhik Maas (extra lunar month), eclipses and the Pitru Paksha fortnight for registrations.',
];

export default function VastuScreen() {
  const [active, setActive] = useState('NE');
  const [plotNo, setPlotNo] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const dir = useMemo(() => DIRECTIONS.find((d) => d.key === active) ?? DIRECTIONS[0], [active]);
  const mulank = result != null ? MULANK[result] : null;

  return (
    <Screen contentClassName="pb-12 gap-4">
      <BackHeader title="Vastu & Muhurat" />

      <Card className="gap-2 border-gold/50 bg-[#FDF3D8]">
        <View className="flex-row items-center gap-2">
          <Ionicons name="compass" size={18} color={color.goldDeep} />
          <Text variant="title">Buy with confidence &amp; good fortune</Text>
        </View>
        <Text variant="caption">
          A friendly guide to plot facing, numerology and auspicious timing — traditions that matter
          to many families when choosing land and homes.
        </Text>
      </Card>

      {/* Plot facing / direction guide */}
      <View className="gap-2">
        <Text variant="label">PLOT &amp; ENTRANCE FACING</Text>
        <View className="flex-row flex-wrap gap-2">
          {DIRECTIONS.map((d) => (
            <Chip key={d.key} label={d.key} active={active === d.key} onPress={() => setActive(d.key)} />
          ))}
        </View>
        <Card className="gap-2">
          <View className="flex-row items-center justify-between gap-2">
            <Text variant="title" className="flex-1">
              {dir.name}
            </Text>
            <Badge label={dir.rating} tone={RATING_TONE[dir.rating]} />
          </View>
          <Text variant="caption">Presiding energy: {dir.deity}</Text>
          <Text variant="body">{dir.note}</Text>
        </Card>
      </View>

      {/* Numerology calculator */}
      <View className="gap-2">
        <Text variant="label">PLOT / HOUSE NUMEROLOGY</Text>
        <Card className="gap-3">
          <Input
            label="Plot or house number"
            placeholder="e.g. 24 or B-108"
            keyboardType="default"
            value={plotNo}
            onChangeText={setPlotNo}
          />
          <Button
            title="Reveal the number"
            variant="secondary"
            onPress={() => setResult(toMulank(plotNo))}
            left={<Ionicons name="sparkles" size={16} color={color.ink} />}
          />
          {plotNo.length > 0 && result == null ? (
            <Text variant="caption" className="text-danger">
              Add at least one digit to calculate the Mulank.
            </Text>
          ) : null}
          {mulank ? (
            <View className="gap-1 rounded-2xl bg-paper p-3">
              <Text variant="title">
                Mulank {result} · {mulank.ruler}
              </Text>
              <Text variant="body">{mulank.vibe}</Text>
            </View>
          ) : null}
        </Card>
      </View>

      {/* Muhurat guidance */}
      <View className="gap-2">
        <Text variant="label">AUSPICIOUS TIMING (MUHURAT)</Text>
        <Card className="gap-2.5">
          {MUHURAT_TIPS.map((tip) => (
            <View key={tip} className="flex-row gap-2">
              <Ionicons name="calendar-outline" size={16} color={color.red} style={{ marginTop: 2 }} />
              <Text variant="body" className="flex-1">
                {tip}
              </Text>
            </View>
          ))}
        </Card>
      </View>

      <Text variant="caption" className="px-1 text-center">
        Shared as cultural guidance only. Please consult a qualified Vastu expert or family priest for
        important decisions — JAMIN Properties makes no religious or financial guarantee.
      </Text>
    </Screen>
  );
}
