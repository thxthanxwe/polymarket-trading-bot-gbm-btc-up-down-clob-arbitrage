/**
 * Standard normal CDF approximation (Abramowitz & Stegun).
 */
export function normalCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * absX);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX));
  return 0.5 * (1 + sign * y);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function secondsToYears(seconds: number): number {
  const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
  return Math.max(seconds, 1) / SECONDS_PER_YEAR;
}

export function brierScore(predicted: number, outcome: 0 | 1): number {
  return (predicted - outcome) ** 2;
}

export function uuid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
