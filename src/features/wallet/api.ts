import { money, round2 } from '@/lib/money';
import { supabase } from '@/lib/supabase';

export interface LedgerEntry {
  id: string;
  amount: number;
  direction: 'credit' | 'debit';
  source_ref: string;
  status: string;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  rail: string | null;
  requested_at: string;
  settled_at: string | null;
}

export interface WalletSummary {
  balance: string;
  earnings: string; // lifetime credits
  ledger: LedgerEntry[];
}

export async function getWalletSummary(): Promise<WalletSummary> {
  const [{ data: wallet, error: wErr }, { data: ledger, error: lErr }] = await Promise.all([
    supabase.from('wallets').select('balance').maybeSingle(),
    supabase
      .from('commission_ledger')
      .select('id, amount, direction, source_ref, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (wErr) throw wErr;
  if (lErr) throw lErr;

  const rows = (ledger ?? []) as LedgerEntry[];
  const earnings = rows
    .filter((r) => r.direction === 'credit')
    .reduce((acc, r) => acc.plus(money(r.amount)), money(0));

  return {
    balance: round2(wallet?.balance ?? 0).toString(),
    earnings: round2(earnings).toString(),
    ledger: rows,
  };
}

export async function getWithdrawals(): Promise<Withdrawal[]> {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('id, amount, status, rail, requested_at, settled_at')
    .order('requested_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Withdrawal[];
}

export async function requestWithdrawal(input: { amount: number; rail?: string }) {
  const { error } = await supabase.rpc('request_withdrawal', {
    p_amount: input.amount,
    p_rail: input.rail,
  });
  if (error) throw error;
}
