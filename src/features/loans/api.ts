import { supabase } from '@/lib/supabase';

export interface Lender {
  id: string;
  name: string;
  logo_url: string | null;
  interest_from: number | null;
  max_tenure_years: number | null;
  blurb: string | null;
}

export interface LoanApplication {
  id: string;
  amount: number | null;
  tenure_years: number | null;
  status: string;
  created_at: string;
  lender: { name: string } | null;
}

export async function listLenders(): Promise<Lender[]> {
  const { data, error } = await supabase
    .from('lenders')
    .select('id, name, logo_url, interest_from, max_tenure_years, blurb')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Lender[];
}

export async function myApplications(): Promise<LoanApplication[]> {
  const { data, error } = await supabase
    .from('loan_applications')
    .select('id, amount, tenure_years, status, created_at, lender:lenders(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as LoanApplication[];
}

export async function applyLoan(input: {
  lenderId?: string | null;
  propertyId?: string | null;
  amount?: number | null;
  tenureYears?: number | null;
  monthlyIncome?: number | null;
  note?: string;
}) {
  const { data: me } = await supabase.auth.getUser();
  if (!me.user) throw new Error('Not signed in');
  const { error } = await supabase.from('loan_applications').insert({
    user_id: me.user.id,
    lender_id: input.lenderId ?? null,
    property_id: input.propertyId ?? null,
    amount: input.amount ?? null,
    tenure_years: input.tenureYears ?? null,
    monthly_income: input.monthlyIncome ?? null,
    note: input.note || null,
  });
  if (error) throw error;
}
