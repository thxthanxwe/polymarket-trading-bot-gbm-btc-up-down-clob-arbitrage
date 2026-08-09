import { describe, expect, it } from 'vitest';
import { computeGbmProbability } from '../src/modules/gbmModel.js';
import { normalCdf, secondsToYears } from '../src/utils/math.js';

describe('GBM probability model', () => {
  it('returns ~0.5 when S0 equals K with negligible drift', () => {
    const tYears = secondsToYears(300);
    const result = computeGbmProbability({
      s0: 100_000,
      k: 100_000,
      tYears,
      sigma: 0.6,
      mu: 0,
    });
    expect(result.pUp).toBeGreaterThan(0.45);
    expect(result.pUp).toBeLessThan(0.55);
    expect(result.pDown).toBeCloseTo(1 - result.pUp, 5);
  });

  it('returns high P_up when S0 is well above K', () => {
    const result = computeGbmProbability({
      s0: 105_000,
      k: 100_000,
      tYears: secondsToYears(60),
      sigma: 0.5,
      mu: 0,
    });
    expect(result.pUp).toBeGreaterThan(0.7);
  });

  it('returns low P_up when S0 is well below K', () => {
    const result = computeGbmProbability({
      s0: 95_000,
      k: 100_000,
      tYears: secondsToYears(60),
      sigma: 0.5,
      mu: 0,
    });
    expect(result.pUp).toBeLessThan(0.3);
  });

  it('matches manual d2 calculation', () => {
    const s0 = 100_300;
    const k = 100_000;
    const tYears = secondsToYears(3600);
    const sigma = 0.65;
    const mu = 0;
    const sqrtT = Math.sqrt(tYears);
    const d2 = (Math.log(s0 / k) + (mu - 0.5 * sigma ** 2) * tYears) / (sigma * sqrtT);
    const expected = normalCdf(d2);

    const result = computeGbmProbability({ s0, k, tYears, sigma, mu });
    expect(result.d2).toBeCloseTo(d2, 6);
    expect(result.pUp).toBeCloseTo(expected, 6);
  });

  it('clamps extreme probabilities to [0.001, 0.999]', () => {
    const result = computeGbmProbability({
      s0: 110_000,
      k: 100_000,
      tYears: secondsToYears(60),
      sigma: 0.4,
    });
    expect(result.pUp).toBe(0.999);
  });

  it('handles edge case of very small T', () => {
    const result = computeGbmProbability({
      s0: 101_000,
      k: 100_000,
      tYears: secondsToYears(1),
      sigma: 0.4,
    });
    expect(result.pUp).toBeGreaterThan(0.9);
  });
});
