import { describe, expect, it } from '@jest/globals';

import {
  computeCommission,
  directCommission,
  ruleMatches,
  teamOverridePerAncestor,
  type CommissionRule,
} from '@/features/commission/engine';

const PROJECT = 'proj-1';
const ctx = { price: 4_300_000, project_id: PROJECT, plan_id: null, property_type_id: 'type-1' };

describe('commission engine (mirrors Postgres, §5.10)', () => {
  it('percent of price, 2dp', () => {
    expect(computeCommission(4_300_000, { type: 'percent', value: 2 }).toFixed(2)).toBe('86000.00');
  });

  it('flat amount', () => {
    expect(computeCommission(1, { type: 'flat', value: 50000 }).toString()).toBe('50000');
  });

  it('slab picks the first band where price <= upto (null = top band)', () => {
    const slab = {
      type: 'slab' as const,
      slabs: [
        { upto: 2_000_000, percent: 1 },
        { upto: 5_000_000, percent: 2 },
        { upto: null, percent: 3 },
      ],
    };
    expect(computeCommission(1_500_000, slab).toString()).toBe('15000'); // 1% band
    expect(computeCommission(4_300_000, slab).toString()).toBe('86000'); // 2% band
    expect(computeCommission(9_000_000, slab).toString()).toBe('270000'); // top band 3%
  });

  it('rule matching respects project / plan / type', () => {
    expect(ruleMatches({ project_id: PROJECT }, ctx)).toBe(true);
    expect(ruleMatches({ project_id: 'other' }, ctx)).toBe(false);
    expect(ruleMatches({ plan_id: 'plan-x' }, ctx)).toBe(false);
    expect(ruleMatches({}, ctx)).toBe(true);
  });

  const rules: CommissionRule[] = [
    { scope: 'project', match: { project_id: PROJECT }, formula: { type: 'percent', value: 2 }, priority: 50, active: true },
    { scope: 'project', match: { project_id: PROJECT }, formula: { type: 'percent', value: 5 }, priority: 90, active: true },
    { scope: 'team', match: { project_id: PROJECT }, formula: { type: 'percent', value: 1 }, priority: 60, active: true },
    { scope: 'project', match: { project_id: 'other' }, formula: { type: 'percent', value: 9 }, priority: 1, active: true },
  ];

  it('direct commission = highest-priority (lowest number) matching non-team rule', () => {
    // priority 50 (2%) wins over 90 (5%); the 'other' project rule does not match.
    expect(directCommission(ctx, rules).toFixed(2)).toBe('86000.00');
  });

  it('team override sums active team rules per ancestor', () => {
    expect(teamOverridePerAncestor(ctx, rules).toFixed(2)).toBe('43000.00');
  });

  it('matches the verified DB scenario (agent 86k, each upline 43k)', () => {
    expect(directCommission(ctx, rules).toString()).toBe('86000');
    expect(teamOverridePerAncestor(ctx, rules).toString()).toBe('43000');
  });
});
