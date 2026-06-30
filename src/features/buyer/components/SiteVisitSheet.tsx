import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { useBookSiteVisit } from '../hooks';
import { Sheet } from './EnquirySheet';
import { errMessage } from '@/lib/errors';

const SLOTS = [
  { label: 'Morning · 10:00', hour: 10 },
  { label: 'Afternoon · 16:00', hour: 16 },
];

/** Site-visit booking via preset day/slot chips (no date-picker dependency). */
export function SiteVisitSheet({
  visible,
  onClose,
  propertyId,
  propertyLabel,
}: {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  propertyLabel: string;
}) {
  const book = useBookSiteVisit();
  const [dayIdx, setDayIdx] = useState(0);
  const [slotIdx, setSlotIdx] = useState(0);

  const days = useMemo(() => {
    const out: { label: string; date: Date }[] = [];
    for (let i = 1; i <= 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      out.push({
        label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
        date: d,
      });
    }
    return out;
  }, []);

  async function confirm() {
    const d = new Date(days[dayIdx].date);
    d.setHours(SLOTS[slotIdx].hour, 0, 0, 0);
    try {
      await book.mutateAsync({ propertyId, scheduledAt: d.toISOString() });
      onClose();
      Alert.alert('Visit booked', `${propertyLabel} · ${days[dayIdx].label}, ${SLOTS[slotIdx].label}`);
    } catch (e) {
      Alert.alert('Could not book', errMessage(e));
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Book a site visit">
      <Text variant="caption" className="mb-3">
        {propertyLabel}
      </Text>

      <Text variant="label" className="mb-2">
        Pick a day
      </Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {days.map((d, i) => (
          <Chip key={d.label} label={d.label} active={dayIdx === i} onPress={() => setDayIdx(i)} />
        ))}
      </View>

      <Text variant="label" className="mb-2">
        Time slot
      </Text>
      <View className="mb-5 flex-row gap-2">
        {SLOTS.map((s, i) => (
          <Chip key={s.label} label={s.label} active={slotIdx === i} onPress={() => setSlotIdx(i)} />
        ))}
      </View>

      <Button title="Confirm visit" loading={book.isPending} onPress={confirm} />
    </Sheet>
  );
}
