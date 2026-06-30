/**
 * Pure, deterministic lead-scoring engine — mirrors the authoritative Postgres
 * engine (score_lead, migration 0044). Used in-app to PREVIEW / explain a lead's
 * smart score; the DB remains the source of truth when score_lead() is invoked.
 *
 * Weights are dynamic (System config → 'lead_score_weights'); the defaults below
 * match the seeded row so a preview with no fetched config still matches the DB.
 */

export interface ScoreWeights {
  status: Record<string, number>;
  has_phone: number;
  followup_done: number;
  recency_fresh: number;
  recency_recent: number;
  has_value: number;
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  status: { new: 10, contacted: 30, qualified: 55, visit: 75, won: 100, lost: 0 },
  has_phone: 10,
  followup_done: 15,
  recency_fresh: 10,
  recency_recent: 5,
  has_value: 10,
};

export interface ScoreInputs {
  status: string;
  hasPhone: boolean;
  followupsTotal: number;
  followupsDone: number;
  /** Days since the lead was created. */
  ageDays: number;
  hasValue: boolean;
}

export type ScoreBand = 'hot' | 'warm' | 'cold';

export function scoreBand(score: number): ScoreBand {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

export interface ScoreFactors {
  status: number;
  has_phone: number;
  followups: number;
  recency: number;
  has_value: number;
}

export interface ScoreResult {
  score: number;
  band: ScoreBand;
  factors: ScoreFactors;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeLeadScore(
  inp: ScoreInputs,
  w: ScoreWeights = DEFAULT_SCORE_WEIGHTS,
): ScoreResult {
  const status = w.status[inp.status] ?? 0;
  const has_phone = inp.hasPhone ? w.has_phone : 0;
  const followups =
    inp.followupsTotal > 0
      ? round2((inp.followupsDone / inp.followupsTotal) * w.followup_done)
      : 0;
  const recency = inp.ageDays <= 3 ? w.recency_fresh : inp.ageDays <= 14 ? w.recency_recent : 0;
  const has_value = inp.hasValue ? w.has_value : 0;
  const raw = status + has_phone + followups + recency + has_value;
  const score = Math.min(100, Math.max(0, Math.round(raw)));
  return { score, band: scoreBand(score), factors: { status, has_phone, followups, recency, has_value } };
}
