import { supabase } from '@/lib/supabase';
import type { FormField } from '@/features/forms/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function count(table: string, build?: (q: any) => any): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase.from(table as any).select('*', { count: 'exact', head: true });
  if (build) q = build(q);
  const { count: c } = await q;
  return c ?? 0;
}

export interface AdminStats {
  users: number;
  available: number;
  sold: number;
  pendingKyc: number;
  pendingWithdrawals: number;
  leads: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const [users, available, sold, pendingKyc, pendingWithdrawals, leads] = await Promise.all([
    count('profiles'),
    count('properties', (q) => q.eq('status', 'available')),
    count('properties', (q) => q.eq('status', 'sold')),
    count('profiles', (q) => q.eq('kyc_status', 'pending')),
    count('withdrawals', (q) => q.in('status', ['requested', 'approved'])),
    count('leads'),
  ]);
  return { users, available, sold, pendingKyc, pendingWithdrawals, leads };
}

export interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  kyc_status: string;
  created_at: string;
  role: { slug: string; name: string } | null;
}

export async function listUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, kyc_status, created_at, role:roles(slug,name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AdminUser[];
}

export async function getRoles() {
  const { data, error } = await supabase.from('roles').select('id, slug, name, level').order('level');
  if (error) throw error;
  return data ?? [];
}

export async function setUserRole(userId: string, roleId: string) {
  const { error } = await supabase.from('profiles').update({ role_id: roleId }).eq('id', userId);
  if (error) throw error;
}

export async function setKyc(userId: string, status: 'verified' | 'rejected' | 'pending') {
  const { error } = await supabase.from('profiles').update({ kyc_status: status }).eq('id', userId);
  if (error) throw error;
}

export interface AdminForm {
  id: string;
  key: string;
  name: string;
  fields: FormField[];
}

export async function listForms(): Promise<AdminForm[]> {
  const { data, error } = await supabase
    .from('form_definitions')
    .select('id, key, name, fields')
    .order('key');
  if (error) throw error;
  return (data ?? []) as unknown as AdminForm[];
}

export async function saveFormFields(id: string, fields: FormField[]) {
  const { error } = await supabase
    .from('form_definitions')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ fields: fields as any })
    .eq('id', id);
  if (error) throw error;
}

export interface AdminSubmission {
  id: string;
  form_key: string;
  data: Record<string, unknown>;
  status: string;
  created_at: string;
  user: { full_name: string | null } | null;
}

export async function listSubmissions(): Promise<AdminSubmission[]> {
  const { data, error } = await supabase
    .from('form_submissions')
    .select('id, form_key, data, status, created_at, user:profiles(full_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AdminSubmission[];
}

export async function setSubmissionStatus(
  id: string,
  status: 'reviewed' | 'approved' | 'rejected' | 'submitted',
) {
  const { error } = await supabase.from('form_submissions').update({ status }).eq('id', id);
  if (error) throw error;
}

export interface AdminRule {
  id: string;
  name: string;
  scope: string;
  formula: { type?: string; value?: number };
  priority: number;
  active: boolean;
}

export async function listRules(): Promise<AdminRule[]> {
  const { data, error } = await supabase
    .from('commission_rules')
    .select('id, name, scope, formula, priority, active')
    .order('priority');
  if (error) throw error;
  return (data ?? []) as unknown as AdminRule[];
}

export async function toggleRule(id: string, active: boolean) {
  const { error } = await supabase.from('commission_rules').update({ active }).eq('id', id);
  if (error) throw error;
}

export interface AdminWithdrawal {
  id: string;
  amount: number;
  status: string;
  rail: string | null;
  requested_at: string;
  user: { full_name: string | null } | null;
}

export async function listPendingWithdrawals(): Promise<AdminWithdrawal[]> {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('id, amount, status, rail, requested_at, user:profiles(full_name)')
    .in('status', ['requested', 'approved'])
    .order('requested_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AdminWithdrawal[];
}

export async function setWithdrawalStatus(id: string, status: 'approved' | 'paid' | 'rejected') {
  const { error } = await supabase.from('withdrawals').update({ status }).eq('id', id);
  if (error) throw error;
}

export interface OpenBooking {
  id: string;
  amount: number;
  status: string;
  property: { plot_code: string; project: { name: string } | null } | null;
  agent: { full_name: string | null } | null;
}

export async function listOpenBookings(): Promise<OpenBooking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, amount, status, property:properties(plot_code, project:projects(name)), agent:profiles!bookings_agent_id_fkey(full_name)',
    )
    .in('status', ['pending', 'reserved', 'site_visit'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as OpenBooking[];
}

export async function closeSale(bookingId: string): Promise<number> {
  const { data, error } = await supabase.rpc('close_sale', { p_booking: bookingId });
  if (error) throw error;
  return (data as number) ?? 0;
}

export interface AuditEntry {
  id: string;
  action: string;
  entity: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export async function listAudit(): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, entity, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as unknown as AuditEntry[];
}
