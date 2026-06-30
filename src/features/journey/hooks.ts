import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface BuyStep {
  key: string;
  label: string;
}

export async function getJourneySteps(propertyId: string): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from('buyer_journeys')
    .select('steps')
    .eq('property_id', propertyId)
    .maybeSingle();
  if (error) throw error;
  return ((data as { steps?: Record<string, boolean> } | null)?.steps ?? {}) as Record<string, boolean>;
}

export async function setJourneyStep(propertyId: string, stepKey: string, done: boolean) {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) throw new Error('Not signed in');
  const current = await getJourneySteps(propertyId);
  const next = { ...current, [stepKey]: done };
  const { error } = await supabase
    .from('buyer_journeys')
    .upsert({ user_id: me.user.id, property_id: propertyId, steps: next }, { onConflict: 'user_id,property_id' });
  if (error) throw error;
}

export function useJourney(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['journey', propertyId],
    queryFn: () => getJourneySteps(propertyId as string),
    enabled: !!propertyId,
  });
}

export function useSetJourneyStep(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stepKey, done }: { stepKey: string; done: boolean }) =>
      setJourneyStep(propertyId, stepKey, done),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['journey', propertyId] }),
  });
}
