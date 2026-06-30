import { supabase } from '@/lib/supabase';

export const VISIT_STATUSES = [
  'requested',
  'confirmed',
  'checked_in',
  'completed',
  'no_show',
  'cancelled',
] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export interface SiteVisit {
  id: string;
  property_id: string;
  buyer_id: string | null;
  agent_id: string | null;
  buyer_contact: { name?: string; phone?: string; [k: string]: unknown };
  scheduled_at: string;
  status: string;
  checkin_at: string | null;
  checkin_distance_m: number | null;
  notes: string | null;
  property: { plot_code: string; project: { name: string } | null } | null;
  buyer: { full_name: string | null } | null;
  agent: { full_name: string | null } | null;
}

const VISIT_SELECT =
  'id, property_id, buyer_id, agent_id, buyer_contact, scheduled_at, status, checkin_at, checkin_distance_m, notes, ' +
  'property:properties(plot_code, project:projects(name)), ' +
  'buyer:profiles!site_visits_buyer_id_fkey(full_name), ' +
  'agent:profiles!site_visits_agent_id_fkey(full_name)';

/** Every visit the caller can see (their own as buyer, their assigned visits as agent, subtree, admin). */
export async function listMyVisits(): Promise<SiteVisit[]> {
  const { data, error } = await supabase
    .from('site_visits')
    .select(VISIT_SELECT)
    .order('scheduled_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SiteVisit[];
}

export async function bookSiteVisit(input: { propertyId: string; scheduledAt: string; note?: string }) {
  const { data, error } = await supabase.rpc('book_site_visit', {
    p_property: input.propertyId,
    p_scheduled_at: input.scheduledAt,
    p_note: input.note,
  });
  if (error) throw error;
  return data as string;
}

export async function setVisitStatus(id: string, status: VisitStatus) {
  const { error } = await supabase.rpc('set_site_visit_status', { p_visit: id, p_status: status });
  if (error) throw error;
}

export interface CheckinResult {
  ok: boolean;
  distance_m: number | null;
  radius_m: number;
}

export async function checkinVisit(id: string, lat: number, lng: number): Promise<CheckinResult> {
  const { data, error } = await supabase.rpc('checkin_site_visit', { p_visit: id, p_lat: lat, p_lng: lng });
  if (error) throw error;
  return data as unknown as CheckinResult;
}

export interface Availability {
  id: string;
  agent_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

export async function listMyAvailability(agentId: string): Promise<Availability[]> {
  const { data, error } = await supabase
    .from('agent_availability')
    .select('id, agent_id, weekday, start_time, end_time')
    .eq('agent_id', agentId)
    .order('weekday');
  if (error) throw error;
  return (data ?? []) as Availability[];
}

export async function addAvailability(input: {
  agentId: string;
  weekday: number;
  start: string;
  end: string;
}) {
  const { error } = await supabase.from('agent_availability').insert({
    agent_id: input.agentId,
    weekday: input.weekday,
    start_time: input.start,
    end_time: input.end,
  });
  if (error) throw error;
}

export async function deleteAvailability(id: string) {
  const { error } = await supabase.from('agent_availability').delete().eq('id', id);
  if (error) throw error;
}
