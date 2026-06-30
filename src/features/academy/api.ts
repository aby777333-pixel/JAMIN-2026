import { supabase } from '@/lib/supabase';

export interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string;
  level: string;
  cover_url: string | null;
  pass_mark: number;
}

export interface Lesson {
  id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  sort_order: number;
}

export interface Enrollment {
  course_id: string;
  progress: number;
  score: number | null;
  certified: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  sort_order: number;
}

export async function listCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('academy_courses')
    .select('id, title, description, category, level, cover_url, pass_mark')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function myEnrollments(): Promise<Enrollment[]> {
  const { data, error } = await supabase
    .from('academy_enrollments')
    .select('course_id, progress, score, certified');
  if (error) throw error;
  return (data ?? []) as Enrollment[];
}

export async function getLessons(courseId: string): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from('academy_lessons')
    .select('id, title, content, video_url, sort_order')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Lesson[];
}

export async function getQuiz(courseId: string): Promise<QuizQuestion[]> {
  const { data, error } = await supabase.rpc('get_quiz', { p_course: courseId });
  if (error) throw error;
  return ((data ?? []) as { id: string; question: string; options: unknown; sort_order: number }[]).map((q) => ({
    id: q.id,
    question: q.question,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
    sort_order: q.sort_order,
  }));
}

export interface QuizResult {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
}

export async function submitQuiz(courseId: string, answers: Record<string, number>): Promise<QuizResult> {
  const { data, error } = await supabase.rpc('submit_quiz', { p_course: courseId, p_answers: answers });
  if (error) throw error;
  return data as unknown as QuizResult;
}

export async function enroll(courseId: string) {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) throw new Error('Not signed in');
  const { error } = await supabase
    .from('academy_enrollments')
    .upsert({ course_id: courseId, user_id: me.user.id }, { onConflict: 'course_id,user_id' });
  if (error) throw error;
}
