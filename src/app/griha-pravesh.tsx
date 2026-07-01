import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuspiciousDatesCard } from '@/features/astro/AuspiciousDatesCard';
import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';

/**
 * Griha Pravesh — a friendly, positive house-warming checklist + muhurat guide
 * for buyers who've booked/purchased. Progress is saved locally on the device
 * (AsyncStorage) — no DB, no network. Purely a helpful cultural companion.
 */

const STORAGE_KEY = 'jamin.griha_pravesh.v1';

const STEPS: { key: string; label: string; note: string }[] = [
  { key: 'muhurat', label: 'Fix an auspicious muhurat', note: 'Pick a favourable day & time with your priest/panchang.' },
  { key: 'clean', label: 'Clean & purify the home', note: 'A fresh, clutter-free space welcomes positive energy.' },
  { key: 'toran', label: 'Decorate the entrance', note: 'Mango-leaf toran, flowers and a rangoli at the main door.' },
  { key: 'kalash', label: 'Prepare the Kalash', note: 'A copper pot with water, coconut and mango leaves for the puja.' },
  { key: 'ganesh', label: 'Ganesh & Lakshmi puja', note: 'Invoke Ganesha for a smooth start and Lakshmi for prosperity.' },
  { key: 'vastu_shanti', label: 'Vastu Shanti / Navagraha havan', note: 'A homam to harmonise the home’s energies (optional but loved).' },
  { key: 'right_foot', label: 'Enter with the right foot first', note: 'The lady of the house traditionally leads, carrying the Kalash.' },
  { key: 'milk', label: 'Boil milk till it overflows', note: 'An overflowing pot symbolises abundance and never-ending plenty.' },
  { key: 'first_meal', label: 'Cook the first meal', note: 'Prepare something sweet first for a joyful, prosperous home.' },
  { key: 'bless', label: 'Invite elders & seek blessings', note: 'Warmth, good wishes and a housewarming feast with loved ones.' },
];

export default function GrihaPravesh() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setDone(JSON.parse(raw) as Record<string, boolean>);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  function toggle(key: string) {
    setDone((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  const completed = STEPS.filter((s) => done[s.key]).length;

  return (
    <Screen contentClassName="pb-12 gap-4">
      <BackHeader title="Griha Pravesh" />

      <Card className="gap-2 border-gold/50 bg-[#FDF3D8]">
        <View className="flex-row items-center gap-2">
          <Ionicons name="home" size={18} color={color.goldDeep} />
          <Text variant="title" className="flex-1">
            Welcome your new home
          </Text>
          <Text className="font-mono-bold text-[14px] text-gold-deep">
            {completed}/{STEPS.length}
          </Text>
        </View>
        <Text variant="caption">
          A warm, step-by-step housewarming guide. Tick items off as you go — your progress is saved on
          this device.
        </Text>
      </Card>

      <AuspiciousDatesCard
        title="Auspicious days for Griha Pravesh"
        subtitle="Favourable days to hold your housewarming ceremony."
      />

      <View className="gap-2">
        {STEPS.map((s) => {
          const isDone = !!done[s.key];
          return (
            <Pressable key={s.key} onPress={() => toggle(s.key)} disabled={!loaded}>
              <Card className={`flex-row items-start gap-3 ${isDone ? 'border-success/40 bg-success/5' : ''}`}>
                <Ionicons
                  name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={isDone ? color.success : color.muted}
                  style={{ marginTop: 1 }}
                />
                <View className="flex-1">
                  <Text variant="title" className={`text-[15px] ${isDone ? 'text-muted line-through' : ''}`}>
                    {s.label}
                  </Text>
                  <Text variant="caption">{s.note}</Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Text variant="caption" className="px-1 text-center text-muted">
        A joyful cultural companion — customs vary by family & region. May your new home bring health,
        wealth and happiness. 🪔
      </Text>
    </Screen>
  );
}
