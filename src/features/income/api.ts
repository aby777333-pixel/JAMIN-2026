import { supabase } from '@/lib/supabase';

/** One bucket of the Jamin Bazaar income summary (amounts arrive as numbers from jsonb). */
export interface IncomeBucket {
  total: number;
  available: number;
  pending: number;
  locked?: number;
}

export interface PromoterStatus {
  user_id: string;
  direct_sales_count: number;
  direct_referrals_count: number;
  team_sales: number;
  min_referral_team_sales: number;
  current_level: number;
  designation: string | null;
  rsi_unlocked: boolean;
  admin_override: boolean;
}

export interface AwardLevel {
  level: number;
  designation: string;
  per_referral_team_sales: number;
  monthly_award: number;
  validity_months: number;
  min_direct_referrals: number;
}

export interface PromoterAward {
  id: string;
  level: number;
  designation: string;
  monthly_amount: number;
  valid_from: string;
  valid_until: string;
  months_total: number;
  months_credited: number;
  status: string;
}

export interface LaunchOffer {
  id: string;
  title: string;
  description: string | null;
  required_direct_sales: number;
  reward_type: string;
  reward_label: string | null;
  reward_amount: number;
  banner_url: string | null;
  terms: string | null;
  starts_at: string;
  ends_at: string;
  my_sales: number;
  achieved: boolean;
}

export interface ReferralProgress {
  id: string;
  name: string;
  team_sales: number;
}

export interface IncomeSummary {
  dsi: IncomeBucket;
  rsi: IncomeBucket;
  asi: IncomeBucket;
  other: IncomeBucket;
  wallet_balance: number;
  withdrawn: number;
  pending_withdrawals: number;
  status: PromoterStatus | null;
  next_level: AwardLevel | null;
  referral_progress: ReferralProgress[];
  awards: PromoterAward[];
  offers: LaunchOffer[];
}

export interface IncomeHistoryEntry {
  entry_date: string;
  income_type: string;
  description: string;
  reference_no: string;
  amount: number;
  status: string;
}

export async function getIncomeSummary(): Promise<IncomeSummary> {
  const { data, error } = await supabase.rpc('bazaar_income_summary');
  if (error) throw error;
  return data as unknown as IncomeSummary;
}

export async function getIncomeHistory(input: {
  type?: string | null;
  from?: string | null;
  to?: string | null;
}): Promise<IncomeHistoryEntry[]> {
  const { data, error } = await supabase.rpc('bazaar_income_history', {
    p_type: input.type ?? undefined,
    p_from: input.from ?? undefined,
    p_to: input.to ?? undefined,
  });
  if (error) throw error;
  return (data ?? []) as IncomeHistoryEntry[];
}
