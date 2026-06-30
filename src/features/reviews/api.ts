import { supabase } from '@/lib/supabase';

export interface Review {
  id: string;
  project_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  created_at: string;
  user: { full_name: string | null } | null;
}

export interface ProjectRating {
  avg_rating: number;
  review_count: number;
}

export async function listProjectReviews(projectId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('property_reviews')
    .select('id, project_id, user_id, rating, title, body, status, created_at, user:profiles!property_reviews_user_id_fkey(full_name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Review[];
}

export async function getProjectRating(projectId: string): Promise<ProjectRating> {
  const { data, error } = await supabase.rpc('project_rating', { p_project: projectId });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { avg_rating?: number; review_count?: number } | undefined;
  return { avg_rating: Number(row?.avg_rating ?? 0), review_count: Number(row?.review_count ?? 0) };
}

export async function submitReview(input: { projectId: string; rating: number; title?: string; body?: string }) {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) throw new Error('Not signed in');
  const { error } = await supabase.from('property_reviews').upsert(
    {
      project_id: input.projectId,
      user_id: me.user.id,
      rating: input.rating,
      title: input.title || null,
      body: input.body || null,
      status: 'published',
    },
    { onConflict: 'project_id,user_id' },
  );
  if (error) throw error;
}
