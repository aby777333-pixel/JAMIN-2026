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

export interface FollowUp {
  id: string;
  lead_id: string;
  due_at: string;
  note: string | null;
  status: string;
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
    .select('id, lead_id, due_at, note, status')
    .eq('lead_id', leadId)
    .order('due_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FollowUp[];
}

export async function createFollowUp(input: { leadId: string; dueAt: string; note: string }) {
  const { error } = await supabase.from('follow_ups').insert({
    lead_id: input.leadId,
    due_at: input.dueAt,
    note: input.note,
    status: 'pending',
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
