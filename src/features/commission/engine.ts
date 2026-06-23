import type Decimal from 'decimal.js';

import { money, round2 } from '@/lib/money';

/**
 * Pure commission engine (decimal.js) — mirrors the authoritative Postgres engine
 * (run_commission_for_property / compute_commission, migration 0011). Used in-app to
 * PREVIEW what a partner will earn; the DB remains the source of truth at settlement.
 */
export type Formula =
  | { type: 'percent'; value: number }
  | { type: 'flat'; value: number }
  | { type: 'slab'; slabs: { upto: number | null; percent: number }[] };

export type RuleScope = 'property' | 'project' | 'plan' | 'team' | 'bonus' | 'slab';

export interface CommissionRule {
  scope: RuleScope;
  match: {
    project_id?: string;
    plan_id?: string;
    property_type_id?: string;
    role_id?: string;
  };
  formula: Formula;
  priority: number;
  active: boolean;
}

export interface PropertyCtx {
  price: number | string;
  project_id?: string | null;
  plan_id?: string | null;
  property_type_id?: string | null;
}

const DIRECT_SCOPES: RuleScope[] = ['property', 'project', 'plan', 'slab', 'bonus'];

export function computeCommission(price: number | string, formula: Formula): Decimal {
  const p = money(price);
  if (formula.type === 'percent') return round2(p.times(formula.value).dividedBy(100));
  if (formula.type === 'flat') return round2(formula.value);
  if (formula.type === 'slab') {
    for (const s of formula.slabs ?? []) {
      if (s.upto == null || p.lessThanOrEqualTo(s.upto)) {
        return round2(p.times(s.percent).dividedBy(100));
      }
    }
  }
  return money(0);
}

export function ruleMatches(match: CommissionRule['match'], ctx: PropertyCtx): boolean {
  if (match.project_id && match.project_id !== ctx.project_id) return false;
  if (match.plan_id && match.plan_id !== (ctx.plan_id ?? '')) return false;
  if (match.property_type_id && match.property_type_id !== ctx.property_type_id) return false;
  return true;
}

/** The selling agent's own (direct) commission — the single highest-priority matching rule. */
export function directCommission(ctx: PropertyCtx, rules: CommissionRule[]): Decimal {
  const matching = rules
    .filter((r) => r.active && DIRECT_SCOPES.includes(r.scope) && ruleMatches(r.match, ctx))
    .sort((a, b) => a.priority - b.priority);
  if (matching.length === 0) return money(0);
  return computeCommission(ctx.price, matching[0].formula);
}

/** Total team override an ancestor earns for this property (sum of active team rules). */
export function teamOverridePerAncestor(
  ctx: PropertyCtx,
  rules: CommissionRule[],
  ancestorRoleId?: string,
): Decimal {
  return rules
    .filter(
      (r) =>
        r.active &&
        r.scope === 'team' &&
        ruleMatches(r.match, ctx) &&
        (!r.match.role_id || r.match.role_id === ancestorRoleId),
    )
    .reduce((acc, r) => acc.plus(computeCommission(ctx.price, r.formula)), money(0));
}
