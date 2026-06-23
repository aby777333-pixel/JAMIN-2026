import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

/** Find the caller's open support thread, or start one. */
export async function getOrCreateSupportThread(): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('buyer_id', uid)
    .eq('status', 'open')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('chat_threads')
    .insert({ buyer_id: uid, subject: 'Support' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function listMessages(threadId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, thread_id, sender_id, body, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(threadId: string, body: string) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('messages')
    .insert({ thread_id: threadId, sender_id: uid, body: body.trim() });
  if (error) throw error;
}
