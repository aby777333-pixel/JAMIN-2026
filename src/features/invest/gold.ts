import { useConfig } from '@/features/config/hooks';

/**
 * Gold-equivalent value — Indian buyers instinctively benchmark wealth in gold.
 * The rate is admin-editable via system_config key `gold_rate_per_gram`
 * (₹ per gram, 24k); falls back to a sensible default when unset.
 */
export const DEFAULT_GOLD_RATE_PER_GRAM = 7500; // ₹/gram (24k) — placeholder, admin-editable
export const GRAMS_PER_SOVEREIGN = 8; // 1 sovereign / pavan = 8 g

export function useGoldRate() {
  return useConfig<number>('gold_rate_per_gram', DEFAULT_GOLD_RATE_PER_GRAM);
}

export interface GoldValue {
  grams: number;
  sovereigns: number;
  ratePerGram: number;
}

export function toGold(price: number, ratePerGram: number): GoldValue {
  const rate = ratePerGram > 0 ? ratePerGram : DEFAULT_GOLD_RATE_PER_GRAM;
  const grams = price / rate;
  return { grams, sovereigns: grams / GRAMS_PER_SOVEREIGN, ratePerGram: rate };
}
