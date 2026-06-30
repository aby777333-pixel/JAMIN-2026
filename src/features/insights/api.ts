import { supabase } from '@/lib/supabase';

export interface MarketTrend {
  location: string;
  listings: number;
  avg_price: number;
  available: number;
  sold: number;
}

export interface Hotspot {
  location: string;
  demand: number;
  supply: number;
  avg_price: number;
  score: number;
}

export interface SeasonRow {
  user_id: string;
  full_name: string | null;
  role_name: string | null;
  earnings: number;
  rank: number;
}

export async function marketTrends(): Promise<MarketTrend[]> {
  const { data, error } = await supabase.rpc('market_trends');
  if (error) throw error;
  return (data ?? []) as unknown as MarketTrend[];
}

export async function investmentHotspots(): Promise<Hotspot[]> {
  const { data, error } = await supabase.rpc('investment_hotspots');
  if (error) throw error;
  return (data ?? []) as unknown as Hotspot[];
}

export async function seasonLeaderboard(from: string, to: string): Promise<SeasonRow[]> {
  const { data, error } = await supabase.rpc('season_leaderboard', { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []) as unknown as SeasonRow[];
}
