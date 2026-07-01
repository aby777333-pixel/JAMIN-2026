import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface AdThread {
  slug: string;
  place: string | null;
  image_url: string | null;
  lastBody: string;
  lastAt: string;
  count: number;
}

export interface AdMessage {
  sender: 'visitor' | 'agent';
  name: string | null;
  body: string;
  created_at: string;
}

async function myId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Threads (grouped by ad) for ads the signed-in user owns, most-recent activity first. */
export async function getMyAdThreads(): Promise<AdThread[]> {
  const uid = await myId();
  if (!uid) return [];
  const { data: ads, error } = await supabase
    .from('shared_ads')
    .select('slug, place, image_url, created_at')
    .eq('owner_id', uid)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  const slugs = (ads ?? []).map((a) => a.slug as string);
  if (slugs.length === 0) return [];

  const { data: msgs, error: e2 } = await supabase
    .from('ad_messages')
    .select('slug, sender, name, body, created_at')
    .in('slug', slugs)
    .order('created_at', { ascending: true });
  if (e2) throw e2;

  const bySlug = new Map<string, { body: string; at: string; count: number }>();
  for (const m of (msgs ?? []) as { slug: string; body: string; created_at: string }[]) {
    const cur = bySlug.get(m.slug) ?? { body: '', at: '', count: 0 };
    bySlug.set(m.slug, { body: m.body, at: m.created_at, count: cur.count + 1 });
  }

  const threads: AdThread[] = [];
  for (const a of (ads ?? []) as { slug: string; place: string | null; image_url: string | null }[]) {
    const t = bySlug.get(a.slug);
    if (!t) continue; // only ads that have at least one message
    threads.push({ slug: a.slug, place: a.place, image_url: a.image_url, lastBody: t.body, lastAt: t.at, count: t.count });
  }
  threads.sort((x, y) => y.lastAt.localeCompare(x.lastAt));
  return threads;
}

export async function getAdThread(slug: string): Promise<AdMessage[]> {
  const { data, error } = await supabase
    .from('ad_messages')
    .select('sender, name, body, created_at')
    .eq('slug', slug)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AdMessage[];
}

export async function sendAdReply(input: { slug: string; body: string; name?: string }) {
  const { error } = await supabase
    .from('ad_messages')
    .insert({ slug: input.slug, sender: 'agent', name: input.name ?? 'agent', body: input.body });
  if (error) throw error;
}

export function useMyAdThreads() {
  return useQuery({ queryKey: ['ad-threads'], queryFn: getMyAdThreads, refetchInterval: 15000 });
}

export function useAdThread(slug: string | undefined) {
  return useQuery({
    queryKey: ['ad-thread', slug],
    queryFn: () => getAdThread(slug as string),
    enabled: !!slug,
    refetchInterval: 6000,
  });
}

export function useSendAdReply(slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => sendAdReply({ slug: slug as string, body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ad-thread', slug] });
      void qc.invalidateQueries({ queryKey: ['ad-threads'] });
    },
  });
}
