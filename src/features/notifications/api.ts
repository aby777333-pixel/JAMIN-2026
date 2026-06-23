import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export async function listNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, data, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as AppNotification[];
}

export async function unreadCount(): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null);
  return count ?? 0;
}

export async function markRead(id: string) {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
}

export async function markAllRead() {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return;
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', me.user.id)
    .is('read_at', null);
}

export async function registerPushToken(token: string, platform: string) {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) return;
  await supabase
    .from('push_tokens')
    .upsert(
      { user_id: me.user.id, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' },
    );
}

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: listNotifications });
}
export function useUnreadCount() {
  return useQuery({ queryKey: ['notifications', 'unread'], queryFn: unreadCount, refetchInterval: 60_000 });
}
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
