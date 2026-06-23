import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { FormField } from './types';

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
