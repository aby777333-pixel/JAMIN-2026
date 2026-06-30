import { describe, expect, it } from '@jest/globals';

import { computeLeadScore, scoreBand } from '@/features/leads/scoring';

describe('lead scoring engine (mirrors Postgres score_lead, 0044)', () => {
  it('bands by threshold (>=70 hot, >=40 warm, else cold)', () => {
    expect(scoreBand(85)).toBe('hot');
    expect(scoreBand(70)).toBe('hot');
    expect(scoreBand(55)).toBe('warm');
    expect(scoreBand(40)).toBe('warm');
    expect(scoreBand(39)).toBe('cold');
    expect(scoreBand(0)).toBe('cold');
  });

  it('a brand-new lead with no signals scores its status base only', () => {
    const r = computeLeadScore({
      status: 'new',
      hasPhone: false,
      followupsTotal: 0,
      followupsDone: 0,
      ageDays: 30,
      hasValue: false,
    });
    expect(r.score).toBe(10); // status base for "new"
    expect(r.band).toBe('cold');
  });

  it('phone + value + fresh recency stack onto the status base', () => {
    const r = computeLeadScore({
      status: 'contacted', // 30
      hasPhone: true, //       +10
      followupsTotal: 0,
      followupsDone: 0,
      ageDays: 1, //           +10 fresh
      hasValue: true, //       +10
    });
    expect(r.score).toBe(60); // 30+10+10+10
    expect(r.band).toBe('warm');
    expect(r.factors).toEqual({ status: 30, has_phone: 10, followups: 0, recency: 10, has_value: 0 + 10 });
  });

  it('follow-up completion ratio scales the follow-up weight', () => {
    const r = computeLeadScore({
      status: 'qualified', // 55
      hasPhone: false,
      followupsTotal: 4,
      followupsDone: 2, //    50% of 15 = 7.5
      ageDays: 10, //         +5 recent
      hasValue: false,
    });
    // 55 + 7.5 + 5 = 67.5 → round → 68
    expect(r.score).toBe(68);
    expect(r.band).toBe('warm');
  });

  it('a hot, fully-worked deal clamps at 100', () => {
    const r = computeLeadScore({
      status: 'won', // 100
      hasPhone: true, // +10
      followupsTotal: 2,
      followupsDone: 2, // +15
      ageDays: 0, //      +10
      hasValue: true, //  +10
    });
    expect(r.score).toBe(100); // clamped
    expect(r.band).toBe('hot');
  });

  it('a lost lead floors at 0', () => {
    const r = computeLeadScore({
      status: 'lost',
      hasPhone: false,
      followupsTotal: 0,
      followupsDone: 0,
      ageDays: 100,
      hasValue: false,
    });
    expect(r.score).toBe(0);
    expect(r.band).toBe('cold');
  });
});
