import { supabase } from '@/lib/supabase';

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'visit', 'won', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface Lead {
  id: string;
  status: string;
  source: string | null;
  contact: { name?: string; phone?: string; [k: string]: unknown };
  property_id: string | null;
  score: number;
  score_band: string | null;
  value: number | null;
  expected_close: string | null;
  stage_changed_at: string | null;
  created_at: string;
  owner_id: string;
  property: { plot_code: string; project: { name: string } | null } | null;
}

export const FOLLOW_UP_KINDS = ['call', 'meeting', 'site_visit', 'documentation', 'booking'] as const;
export type FollowUpKind = (typeof FOLLOW_UP_KINDS)[number];

export interface FollowUp {
  id: string;
  lead_id: string;
  due_at: string;
  note: string | null;
  status: string;
  /** What the touchpoint is (0102): call | meeting | site_visit | documentation | booking. */
  kind?: string | null;
}

export interface LeadEvent {
  id: string;
  kind: string;
  summary: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

/** Unified timeline (lead engine, 0072): everything this person did, newest first. */
export async function listLeadEvents(leadId: string): Promise<LeadEvent[]> {
  const { data, error } = await supabase
    .from('lead_events')
    .select('id, kind, summary, data, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as LeadEvent[];
}

const LEAD_SELECT =
  'id, status, source, contact, property_id, score, score_band, value, expected_close, stage_changed_at, created_at, owner_id, property:properties(plot_code, project:projects(name))';

export async function listLeads(status?: string): Promise<Lead[]> {
  let q = supabase.from('leads').select(LEAD_SELECT).order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Lead[];
}

export async function getLead(id: string): Promise<Lead | null> {
  const { data, error } = await supabase.from('leads').select(LEAD_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as unknown as Lead) ?? null;
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const { error } = await supabase.from('leads').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function listFollowUps(leadId: string): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from('follow_ups')
    .select('id, lead_id, due_at, note, status, kind')
    .eq('lead_id', leadId)
    .order('due_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FollowUp[];
}

export interface AgendaFollowUp {
  id: string;
  due_at: string;
  note: string | null;
  status: string;
  lead_id: string;
  lead: { contact: { name?: string } | null; property: { plot_code: string } | null } | null;
}

/** All my pending follow-ups (across leads) for the unified agent calendar. */
export async function listMyOpenFollowUps(): Promise<AgendaFollowUp[]> {
  const { data, error } = await supabase
    .from('follow_ups')
    .select('id, due_at, note, status, lead_id, lead:leads(contact, property:properties(plot_code))')
    .eq('status', 'pending')
    .order('due_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AgendaFollowUp[];
}

export async function createFollowUp(input: {
  leadId: string;
  dueAt: string;
  note: string;
  kind?: string;
}) {
  const { error } = await supabase.from('follow_ups').insert({
    lead_id: input.leadId,
    due_at: input.dueAt,
    note: input.note,
    status: 'pending',
    kind: input.kind ?? 'call',
  });
  if (error) throw error;
}

export async function setFollowUpStatus(id: string, status: string) {
  const { error } = await supabase.from('follow_ups').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function setLeadScore(id: string, score: number) {
  const { error } = await supabase.from('leads').update({ score }).eq('id', id);
  if (error) throw error;
}

export async function updateLeadDeal(id: string, input: { value?: number | null; expected_close?: string | null }) {
  const patch: { value?: number | null; expected_close?: string | null } = {};
  if ('value' in input) patch.value = input.value;
  if ('expected_close' in input) patch.expected_close = input.expected_close;
  const { error } = await supabase.from('leads').update(patch).eq('id', id);
  if (error) throw error;
}

export interface LeadScoreResult {
  score: number;
  band: 'hot' | 'warm' | 'cold';
  factors: Record<string, number>;
}

/** Deterministic, explainable smart score (mirrors features/leads/scoring.ts). */
export async function scoreLead(id: string): Promise<LeadScoreResult> {
  const { data, error } = await supabase.rpc('score_lead', { p_lead: id });
  if (error) throw error;
  return data as unknown as LeadScoreResult;
}

export interface PipelineStage {
  status: string;
  lead_count: number;
  total_value: number;
}

/** Pipeline rollup for the leads the caller can see (own / subtree / admin via RLS). */
export async function pipelineSummary(): Promise<PipelineStage[]> {
  const { data, error } = await supabase.rpc('pipeline_summary');
  if (error) throw error;
  return ((data ?? []) as { status: string; lead_count: number; total_value: number }[]).map((r) => ({
    status: r.status,
    lead_count: Number(r.lead_count ?? 0),
    total_value: Number(r.total_value ?? 0),
  }));
}

export interface AgentDigest {
  followupsDue: number;
  staleLeads: number;
  newToday: number;
}

/** Today-at-a-glance counts for the Home digest card (RLS scopes to own leads). */
export async function getAgentDigest(): Promise<AgentDigest> {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const staleBefore = new Date(now.getTime() - 24 * 3600_000).toISOString();
  const [fu, stale, fresh] = await Promise.all([
    supabase
      .from('follow_ups')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lte('due_at', now.toISOString()),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
      .lt('last_touch_at', staleBefore),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dayStart),
  ]);
  return {
    followupsDue: fu.count ?? 0,
    staleLeads: stale.count ?? 0,
    newToday: fresh.count ?? 0,
  };
}
