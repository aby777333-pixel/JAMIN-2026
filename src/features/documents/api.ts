import { supabase } from '@/lib/supabase';
import { uploadFileToBucket } from '@/lib/upload';

export interface DealDocument {
  id: string;
  title: string;
  kind: string;
  doc_url: string;
  sign_status: string;
  created_at: string;
}

export async function listMyDocuments(): Promise<DealDocument[]> {
  const { data, error } = await supabase
    .from('deal_documents')
    .select('id, title, kind, doc_url, sign_status, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DealDocument[];
}

export async function addDocument(input: {
  title: string;
  kind: string;
  uri: string;
  name?: string | null;
  mimeType?: string | null;
}) {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) throw new Error('Not signed in');
  const up = await uploadFileToBucket(
    'user-media',
    `${me.user.id}/docs`,
    { uri: input.uri, name: input.name ?? `${input.title}.bin`, mimeType: input.mimeType ?? undefined },
    'document.bin',
    'application/octet-stream',
  );
  const { error } = await supabase.from('deal_documents').insert({
    owner_id: me.user.id,
    title: input.title,
    kind: input.kind,
    doc_url: up.url,
    doc_path: up.path,
  });
  if (error) throw error;
}

export async function setSignStatus(id: string, status: 'none' | 'requested' | 'signed') {
  const { error } = await supabase.from('deal_documents').update({ sign_status: status }).eq('id', id);
  if (error) throw error;
}

export async function deleteDocument(id: string) {
  const { error } = await supabase.from('deal_documents').delete().eq('id', id);
  if (error) throw error;
}
