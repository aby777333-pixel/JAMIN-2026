import Decimal from 'decimal.js';

/**
 * Money & commission math — SuperPrompt §14 (MANDATORY).
 * decimal.js for every monetary / commission / EMI / ROI calculation.
 * NO IEEE-754 floats for money, EVER. Currency default = INR.
 *
 * Rounding is centralised here (banker's rounding, 2 dp) so the whole app
 * is consistent and auditable. Amounts are stored in the DB as NUMERIC and
 * read/written as strings to avoid precision loss across the JS boundary.
 */

Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_EVEN });

export type MoneyInput = string | number | Decimal;

export function money(value: MoneyInput = 0): Decimal {
  return new Decimal(value);
}

/** Round to 2 dp for display/settlement. */
export function round2(value: MoneyInput): Decimal {
  return money(value).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
}

/** Commission = base × (rate %). Returns a 2dp Decimal. */
export function commission(base: MoneyInput, ratePercent: MoneyInput): Decimal {
  return round2(money(base).times(money(ratePercent)).dividedBy(100));
}

/**
 * EMI (reducing balance). principal P, annual rate r%, tenure n months.
 * EMI = P·i·(1+i)^n / ((1+i)^n − 1), i = r/1200.
 */
export function emi(principal: MoneyInput, annualRatePercent: MoneyInput, months: number): Decimal {
  const P = money(principal);
  const i = money(annualRatePercent).dividedBy(1200);
  if (i.isZero()) return round2(P.dividedBy(months));
  const pow = i.plus(1).pow(months);
  return round2(P.times(i).times(pow).dividedBy(pow.minus(1)));
}

/** Simple ROI % = (gain − cost) / cost × 100. */
export function roiPercent(cost: MoneyInput, currentValue: MoneyInput): Decimal {
  const c = money(cost);
  if (c.isZero()) return money(0);
  return round2(money(currentValue).minus(c).dividedBy(c).times(100));
}

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

/** Display formatter, e.g. ₹1,23,000.00 (Indian digit grouping per §1). */
export function formatINR(value: MoneyInput): string {
  return inr.format(round2(value).toNumber());
}

/** Plain grouped number (no symbol) for tabular mono columns. */
export function formatAmount(value: MoneyInput): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(
    round2(value).toNumber(),
  );
}
