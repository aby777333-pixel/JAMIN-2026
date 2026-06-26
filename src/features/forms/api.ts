import { useMutation, useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { FormField, FormValues } from './types';

export interface FormDefinition {
  id: string;
  key: string;
  name: string;
  fields: FormField[];
  active: boolean;
}

export async function getForm(key: string): Promise<FormDefinition | null> {
  const { data, error } = await supabase
    .from('form_definitions')
    .select('id, key, name, fields, active')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as FormDefinition) ?? null;
}

export function useFormDef(key: string) {
  return useQuery({ queryKey: ['form_def', key], queryFn: () => getForm(key), staleTime: 60_000 });
}

/** Every active form definition — drives the user-facing Applications & Forms hub. */
export async function listActiveForms(): Promise<FormDefinition[]> {
  const { data, error } = await supabase
    .from('form_definitions')
    .select('id, key, name, fields, active')
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return (data ?? []) as unknown as FormDefinition[];
}

export function useActiveForms() {
  return useQuery({ queryKey: ['forms', 'active'], queryFn: listActiveForms, staleTime: 60_000 });
}

/**
 * Generic submission for any dynamic form → stored in form_submissions (RLS:
 * a user may insert their own rows). Admins review them in the Admin Portal.
 */
export async function submitForm(key: string, data: FormValues): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('Please sign in to submit this form.');
  const { error } = await supabase
    .from('form_submissions')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ user_id: u.user.id, form_key: key, data: data as any, status: 'submitted' });
  if (error) throw error;
}

export function useSubmitForm() {
  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: FormValues }) => submitForm(key, data),
  });
}
