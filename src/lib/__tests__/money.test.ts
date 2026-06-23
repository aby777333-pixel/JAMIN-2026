import { describe, expect, it } from '@jest/globals';

import { commission, emi, formatINR, money, roiPercent, round2 } from '@/lib/money';

describe('money (decimal.js, §14)', () => {
  it('keeps exact decimals where floats drift', () => {
    // 0.1 + 0.2 !== 0.3 in IEEE-754; must be exact here.
    expect(money('0.1').plus('0.2').equals('0.3')).toBe(true);
  });

  it('rounds half-to-even at 2dp', () => {
    expect(round2('2.345').toString()).toBe('2.34');
    expect(round2('2.355').toString()).toBe('2.36');
  });

  it('computes commission as base × rate% (2dp)', () => {
    expect(commission('1500000', '2').toString()).toBe('30000');
    expect(commission('1234567.89', '2.5').toFixed(2)).toBe('30864.20');
  });

  it('computes a reducing-balance EMI', () => {
    // ₹10,00,000 @ 9% for 120 months ≈ ₹12,667.58
    expect(emi('1000000', '9', 120).toString()).toBe('12667.58');
  });

  it('handles a 0% loan as straight division', () => {
    expect(emi('120000', '0', 12).toString()).toBe('10000');
  });

  it('computes ROI %', () => {
    expect(roiPercent('1000000', '1250000').toString()).toBe('25');
  });

  it('formats INR with Indian grouping', () => {
    expect(formatINR('123000')).toBe('₹1,23,000.00');
  });
});
