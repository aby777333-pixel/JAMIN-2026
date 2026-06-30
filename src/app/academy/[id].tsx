import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { type Lesson } from '@/features/academy/api';
import { useLessons, useMyEnrollments, useQuiz, useSubmitQuiz } from '@/features/academy/hooks';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: lessons = [], isLoading } = useLessons(id);
  const { data: quiz = [] } = useQuiz(id);
  const { data: enrollments = [] } = useMyEnrollments();
  const submit = useSubmitQuiz();
  const enrollment = enrollments.find((e) => e.course_id === id);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [taking, setTaking] = useState(false);

  async function onSubmit() {
    if (!id) return;
    if (Object.keys(answers).length < quiz.length) {
      Alert.alert('Answer all questions', 'Please pick an answer for every question.');
      return;
    }
    try {
      const res = await submit.mutateAsync({ courseId: id, answers });
      setTaking(false);
      Alert.alert(
        res.passed ? '🎉 Passed!' : 'Not quite',
        `You scored ${res.score}% (${res.correct}/${res.total}).` +
          (res.passed ? ' Your certificate is now on your profile.' : ' Review the lessons and try again.'),
      );
    } catch (e) {
      Alert.alert('Could not submit', errMessage(e));
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-3">
      <BackHeader title="Course" />

      {enrollment?.certified ? (
        <Card className="flex-row items-center gap-3 border-success/40 bg-success/5">
          <Ionicons name="ribbon" size={22} color={color.success} />
          <View className="flex-1">
            <Text variant="title" className="text-[14px]">Certified</Text>
            <Text variant="caption">You passed with {enrollment.score}%.</Text>
          </View>
        </Card>
      ) : null}

      {isLoading ? (
        <ActivityIndicator color={color.red} className="mt-6" />
      ) : (
        <>
          <Text variant="label">Lessons</Text>
          {lessons.length === 0 ? (
            <Text variant="caption">No lessons in this course yet.</Text>
          ) : (
            lessons.map((l, i) => <LessonItem key={l.id} index={i + 1} lesson={l} />)
          )}

          {quiz.length > 0 ? (
            <View className="mt-2 gap-3">
              <Text variant="label">Quiz</Text>
              {!taking ? (
                <Button
                  title={enrollment?.certified ? 'Retake quiz' : 'Take the quiz'}
                  onPress={() => {
                    setAnswers({});
                    setTaking(true);
                  }}
                />
              ) : (
                <>
                  {quiz.map((q, qi) => (
                    <Card key={q.id} className="gap-2">
                      <Text variant="title" className="text-[14px]">
                        {qi + 1}. {q.question}
                      </Text>
                      {q.options.map((opt, oi) => {
                        const selected = answers[q.id] === oi;
                        return (
                          <Pressable
                            key={oi}
                            onPress={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                            className={`flex-row items-center gap-2 rounded-xl border p-2.5 ${selected ? 'border-red bg-red/5' : 'border-line bg-surface'}`}>
                            <Ionicons
                              name={selected ? 'radio-button-on' : 'radio-button-off'}
                              size={18}
                              color={selected ? color.red : color.muted}
                            />
                            <Text variant="body" className="flex-1 text-[13px]">{opt}</Text>
                          </Pressable>
                        );
                      })}
                    </Card>
                  ))}
                  <Button title="Submit quiz" loading={submit.isPending} onPress={onSubmit} />
                  <Button title="Cancel" variant="ghost" onPress={() => setTaking(false)} />
                </>
              )}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function LessonItem({ index, lesson }: { index: number; lesson: Lesson }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="gap-2">
      <Pressable onPress={() => setOpen((o) => !o)} className="flex-row items-center gap-2">
        <View className="h-7 w-7 items-center justify-center rounded-full bg-ink/10">
          <Text className="font-mono-bold text-[12px] text-ink">{index}</Text>
        </View>
        <Text variant="title" className="flex-1 text-[14px]">{lesson.title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={color.muted} />
      </Pressable>
      {open ? (
        <View className="gap-2 pl-9">
          {lesson.content ? <Text variant="body" className="text-[13px]">{lesson.content}</Text> : null}
          {lesson.video_url ? (
            <Pressable
              onPress={() => router.push({ pathname: '/webview', params: { url: lesson.video_url as string, title: lesson.title } })}
              className="flex-row items-center gap-1.5 self-start rounded-full border border-line bg-surface px-3 py-2">
              <Ionicons name="play-circle" size={16} color={color.red} />
              <Text className="text-[13px] font-semibold text-ink">Watch video</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
