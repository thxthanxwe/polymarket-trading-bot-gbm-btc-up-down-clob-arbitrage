import type { GbmInput, GbmOutput } from '../types/index.js';
import { normalCdf } from '../utils/math.js';

/**
 * GBM fair probability for binary "BTC finishes above K" markets.
 *
 * Under geometric Brownian motion:
 *   S_T = S_0 * exp((mu - 0.5*sigma^2)*T + sigma*sqrt(T)*Z)
 *
 * Risk-neutral (or real-world) probability that S_T > K:
 *   d2 = (ln(S0/K) + (mu - 0.5*sigma^2)*T) / (sigma*sqrt(T))
 *   P_up = N(d2)
 *   P_down = 1 - P_up
 *
 * Notes:
 * - T must be in years (use secondsToYears helper).
 * - sigma is annualized volatility.
 * - mu defaults to 0 for short horizons (risk-neutral assumption).
 */
export function computeGbmProbability(input: GbmInput): GbmOutput {
  const { s0, k, tYears, sigma } = input;
  const mu = input.mu ?? 0;

  if (s0 <= 0 || k <= 0 || tYears <= 0 || sigma <= 0) {
    const pUp = s0 > k ? 0.999 : s0 < k ? 0.001 : 0.5;
    return { pUp, pDown: 1 - pUp, d2: 0 };
  }

  const sqrtT = Math.sqrt(tYears);
  const d2 = (Math.log(s0 / k) + (mu - 0.5 * sigma ** 2) * tYears) / (sigma * sqrtT);
  const pUp = clampProbability(normalCdf(d2));
  const pDown = 1 - pUp;

  return { pUp, pDown, d2 };
}

function clampProbability(p: number): number {
  return Math.min(0.999, Math.max(0.001, p));
}

export function explainGbm(input: GbmInput): string {
  const out = computeGbmProbability(input);
  return [
    `S0=${input.s0.toFixed(2)} K=${input.k.toFixed(2)} T=${input.tYears.toExponential(3)}y`,
    `sigma=${input.sigma.toFixed(4)} mu=${(input.mu ?? 0).toFixed(4)}`,
    `d2=${out.d2.toFixed(4)} P_up=${out.pUp.toFixed(4)} P_down=${out.pDown.toFixed(4)}`,
  ].join(' | ');
}
