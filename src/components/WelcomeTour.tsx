import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useContent } from '@/features/content/hooks';
import { tap } from '@/lib/haptics';
import { accentFor } from '@/theme/tokens';

const SEEN_KEY = 'jamin_tour_seen_v1';
const ICONS = ['business', 'pricetags', 'people'] as const;

/**
 * First-launch welcome tour — 3 swipeable, admin-editable slides (App Content
 * group "Welcome tour"). Shows once per install; failure to read the flag
 * fails closed (no tour) so it can never block the app.
 */
export function WelcomeTour() {
  const { get } = useContent();
  const [visible, setVisible] = useState(false);
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const width = Dimensions.get('window').width - 48;

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then((v) => {
        if (!v) setVisible(true);
      })
      .catch(() => {});
  }, []);

  function close() {
    setVisible(false);
    AsyncStorage.setItem(SEEN_KEY, '1').catch(() => {});
  }

  const slides = [1, 2, 3].map((n, i) => ({
    icon: ICONS[i],
    title: get(`tour.slide${n}_title`),
    body: get(`tour.slide${n}_body`),
  })).filter((s) => s.title);

  if (!visible || slides.length === 0) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View className="flex-1 items-center justify-center bg-black/55 px-6">
        <View className="w-full rounded-3xl bg-white p-5">
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            style={{ width }}>
            {slides.map((s, i) => {
              const a = accentFor(i * 3); // coral, green, violet — well separated
              return (
                <View key={s.title} style={{ width }} className="items-center gap-3 px-2 py-4">
                  <View className="h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: a.soft }}>
                    <Ionicons name={s.icon} size={30} color={a.main} />
                  </View>
                  <Text variant="h2" className="text-center">{s.title}</Text>
                  <Text variant="body" className="text-center text-muted">{s.body}</Text>
                </View>
              );
            })}
          </ScrollView>

          <View className="mb-4 mt-1 flex-row justify-center gap-2">
            {slides.map((_, i) => (
              <View
                key={i}
                className="h-2 rounded-full"
                style={{
                  width: i === page ? 20 : 8,
                  backgroundColor: i === page ? accentFor(i * 3).main : '#E6E7E2',
                }}
              />
            ))}
          </View>

          {page < slides.length - 1 ? (
            <View className="flex-row items-center justify-between">
              <Pressable onPress={close} hitSlop={8} className="px-2 py-2">
                <Text className="font-semibold text-[14px] text-muted">Skip</Text>
              </Pressable>
              <Button
                title="Next"
                className="px-8"
                onPress={() => {
                  tap();
                  scroller.current?.scrollTo({ x: (page + 1) * width, animated: true });
                  setPage((p) => Math.min(p + 1, slides.length - 1));
                }}
              />
            </View>
          ) : (
            <Button title="Let's go" onPress={() => { tap(); close(); }} />
          )}
        </View>
      </View>
    </Modal>
  );
}
