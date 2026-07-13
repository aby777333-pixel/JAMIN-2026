import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { localizeAuspiciousNote } from '@/features/astro/localize';
import { isAuspiciousDay } from '@/features/astro/muhurat';
import { color } from '@/theme/tokens';
import { useBookSiteVisit } from '../hooks';
import { useBookVisit } from '@/features/visits/hooks';
import { Sheet } from './EnquirySheet';
import { errMessage } from '@/lib/errors';

/** Bookable time slots — the chosen hour/minute lands in scheduled_at, which
    the admin console already renders in full (Site visits + Dashboard agenda). */
const SLOTS = [
  { label: '10:00 AM', hour: 10, minute: 0 },
  { label: '11:30 AM', hour: 11, minute: 30 },
  { label: '2:00 PM', hour: 14, minute: 0 },
  { label: '4:00 PM', hour: 16, minute: 0 },
  { label: '5:30 PM', hour: 17, minute: 30 },
];

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Month calendar grid — no date-picker dependency. Days from tomorrow up to
 * +60 days are selectable; auspicious days carry a small gold dot.
 */
function MonthCalendar({
  selected,
  onSelect,
  minDate,
  maxDate,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  minDate: Date;
  maxDate: Date;
}) {
  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));

  const cells = useMemo(() => {
    const out: (Date | null)[] = [];
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let i = 0; i < first.getDay(); i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(view.getFullYear(), view.getMonth(), d));
    return out;
  }, [view]);

  const canPrev = view > new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const canNext = new Date(view.getFullYear(), view.getMonth() + 1, 1) <= maxDate;
  const monthLabel = view.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <View className="rounded-2xl border border-line bg-surface p-3">
      <View className="mb-2 flex-row items-center justify-between">
        <Pressable
          onPress={() => canPrev && setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center rounded-full">
          <Ionicons name="chevron-back" size={18} color={canPrev ? color.ink : color.line} />
        </Pressable>
        <Text variant="title" className="text-[15px]">
          {monthLabel}
        </Text>
        <Pressable
          onPress={() => canNext && setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center rounded-full">
          <Ionicons name="chevron-forward" size={18} color={canNext ? color.ink : color.line} />
        </Pressable>
      </View>

      <View className="flex-row">
        {WEEKDAYS.map((w, i) => (
          <View key={`${w}${i}`} style={{ width: `${100 / 7}%` }} className="items-center py-1">
            <Text className="text-[11px] font-semibold text-muted">{w}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {cells.map((d, i) => {
          if (!d) return <View key={`b${i}`} style={{ width: `${100 / 7}%`, height: 40 }} />;
          const disabled = d < minDate || d > maxDate;
          const isSel = sameDay(d, selected);
          const lucky = !disabled && isAuspiciousDay(d);
          return (
            <Pressable
              key={d.toISOString()}
              disabled={disabled}
              onPress={() => onSelect(d)}
              style={{ width: `${100 / 7}%`, height: 40 }}
              className="items-center justify-center">
              <View
                className="h-8 w-8 items-center justify-center rounded-full"
                style={isSel ? { backgroundColor: color.red } : undefined}>
                <Text
                  className={`text-[13px] ${isSel ? 'font-bold' : 'font-medium'}`}
                  style={{ color: isSel ? '#FFFFFF' : disabled ? color.line : color.ink }}>
                  {d.getDate()}
                </Text>
                {lucky && !isSel ? (
                  <View
                    style={{ position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: color.gold }}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Site-visit booking — calendar day + time-slot picker (no new dependencies). */
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
  const { t } = useTranslation();
  const book = useBookSiteVisit();
  const trackedVisit = useBookVisit();

  const { minDate, maxDate } = useMemo(() => {
    const min = new Date();
    min.setDate(min.getDate() + 1);
    min.setHours(0, 0, 0, 0);
    const max = new Date();
    max.setDate(max.getDate() + 60);
    max.setHours(23, 59, 59, 999);
    return { minDate: min, maxDate: max };
  }, []);

  const [selected, setSelected] = useState<Date>(minDate);
  const [slotIdx, setSlotIdx] = useState(0);

  const auspiciousNote = isAuspiciousDay(selected) ? localizeAuspiciousNote(selected, t) : null;
  const dayLabel = selected.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  async function confirm() {
    const d = new Date(selected);
    d.setHours(SLOTS[slotIdx].hour, SLOTS[slotIdx].minute, 0, 0);
    try {
      // Tracked site visit (notifies the agent + enables geofenced check-in).
      await trackedVisit.mutateAsync({ propertyId, scheduledAt: d.toISOString() });
      // Legacy booking row kept for the admin Approvals workflow (best-effort).
      await book.mutateAsync({ propertyId, scheduledAt: d.toISOString() }).catch(() => {});
      onClose();
      Alert.alert('Visit booked', `${propertyLabel} · ${dayLabel}, ${SLOTS[slotIdx].label}`);
    } catch (e) {
      Alert.alert('Could not book', errMessage(e));
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Book a site visit">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-2">
      <Text variant="caption" className="mb-3">
        {propertyLabel}
      </Text>

      <Text variant="label" className="mb-2">
        Pick a day
      </Text>
      <MonthCalendar selected={selected} onSelect={setSelected} minDate={minDate} maxDate={maxDate} />

      {auspiciousNote ? (
        <View className="mt-3 flex-row items-start gap-2 rounded-2xl border border-gold/40 bg-gold/10 p-2.5">
          <View className="mt-1 h-2 w-2 rounded-full bg-gold" />
          <Text variant="caption" className="flex-1 text-gold-deep">
            Auspicious day — {auspiciousNote}.
          </Text>
        </View>
      ) : null}

      <Text variant="label" className="mb-2 mt-4">
        Time
      </Text>
      <View className="mb-5 flex-row flex-wrap gap-2">
        {SLOTS.map((s, i) => (
          <Chip key={s.label} label={s.label} active={slotIdx === i} onPress={() => setSlotIdx(i)} />
        ))}
      </View>

      <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3">
        <Text variant="caption">Your visit</Text>
        <Text variant="title" className="text-[14px]">
          {dayLabel} · {SLOTS[slotIdx].label}
        </Text>
      </View>

      <Button title="Confirm visit" loading={trackedVisit.isPending || book.isPending} onPress={confirm} />
      </ScrollView>
    </Sheet>
  );
}
