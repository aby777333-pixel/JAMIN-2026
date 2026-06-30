import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useCourses, useMyEnrollments } from '@/features/academy/hooks';
import { color } from '@/theme/tokens';

/** Training Academy — courses, lessons and quizzes with certification. */
export default function Academy() {
  const { data: courses = [], isLoading } = useCourses();
  const { data: enrollments = [] } = useMyEnrollments();
  const enrollMap = new Map(enrollments.map((e) => [e.course_id, e]));

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title="Training Academy" />
      <Text variant="caption">Learn the JAMIN way — finish a course and pass the quiz to earn a certificate.</Text>

      {isLoading ? (
        <ActivityIndicator color={color.red} className="mt-6" />
      ) : courses.length === 0 ? (
        <EmptyState icon="school" title="No courses yet" body="Training courses published by the admin will appear here." />
      ) : (
        courses.map((c) => {
          const e = enrollMap.get(c.id);
          return (
            <Pressable key={c.id} onPress={() => router.push(`/academy/${c.id}`)}>
              <Card className="gap-1.5">
                <View className="flex-row items-center justify-between">
                  <Text variant="title" className="flex-1 text-[15px]" numberOfLines={1}>{c.title}</Text>
                  {e?.certified ? (
                    <View className="flex-row items-center gap-1 rounded-full bg-success/15 px-2 py-0.5">
                      <Ionicons name="ribbon" size={12} color={color.success} />
                      <Text className="text-[10px] font-bold uppercase text-success">Certified</Text>
                    </View>
                  ) : e ? (
                    <Text variant="caption">{e.progress}%</Text>
                  ) : null}
                </View>
                {c.description ? <Text variant="caption" numberOfLines={2}>{c.description}</Text> : null}
                <View className="flex-row gap-2">
                  <Text variant="caption" className="capitalize text-gold-deep">{c.level}</Text>
                  <Text variant="caption" className="capitalize">· {c.category}</Text>
                </View>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
