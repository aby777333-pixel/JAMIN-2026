import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';

export function useCourses() {
  return useQuery({ queryKey: ['academy-courses'], queryFn: api.listCourses });
}

export function useMyEnrollments() {
  return useQuery({ queryKey: ['academy-enrollments'], queryFn: api.myEnrollments });
}

export function useLessons(courseId: string | undefined) {
  return useQuery({
    queryKey: ['academy-lessons', courseId],
    queryFn: () => api.getLessons(courseId as string),
    enabled: !!courseId,
  });
}

export function useQuiz(courseId: string | undefined) {
  return useQuery({
    queryKey: ['academy-quiz', courseId],
    queryFn: () => api.getQuiz(courseId as string),
    enabled: !!courseId,
  });
}

export function useEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.enroll,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['academy-enrollments'] }),
  });
}

export function useSubmitQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, answers }: { courseId: string; answers: Record<string, number> }) =>
      api.submitQuiz(courseId, answers),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['academy-enrollments'] }),
  });
}
