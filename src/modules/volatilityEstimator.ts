import type { BotConfig } from '../types/index.js';

/**
 * EWMA realized volatility estimator from BTC log returns.
 * Returns annualized sigma.
 */
export class VolatilityEstimator {
  private readonly lambda: number;
  private readonly defaultSigma: number;
  private readonly maxSamples: number;
  private returns: number[] = [];
  private ewmaVariance = 0;
  private lastPrice: number | null = null;
  private lastTimestamp = 0;

  constructor(config: Pick<BotConfig, 'ewmaLambda' | 'defaultSigma' | 'volatilityWindowSec'>) {
    this.lambda = config.ewmaLambda;
    this.defaultSigma = config.defaultSigma;
    this.maxSamples = Math.max(60, Math.floor(config.volatilityWindowSec / 60));
  }

  update(price: number, timestampMs = Date.now()): number {
    if (this.lastPrice !== null && price > 0) {
      const logReturn = Math.log(price / this.lastPrice);
      this.returns.push(logReturn);
      if (this.returns.length > this.maxSamples) {
        this.returns.shift();
      }

      const r2 = logReturn ** 2;
      this.ewmaVariance =
        this.returns.length === 1
          ? r2
          : this.lambda * this.ewmaVariance + (1 - this.lambda) * r2;
    }

    this.lastPrice = price;
    this.lastTimestamp = timestampMs;
    return this.getSigma();
  }

  getSigma(): number {
    if (this.returns.length < 5 || this.ewmaVariance <= 0) {
      return this.defaultSigma;
    }

    // Per-tick variance -> annualized (assuming ~1 tick/sec average, scale conservatively)
    const ticksPerYear = 365.25 * 24 * 3600;
    const annualized = Math.sqrt(this.ewmaVariance * ticksPerYear);
    return Math.max(0.05, Math.min(annualized, 3.0));
  }

  getSampleCount(): number {
    return this.returns.length;
  }

  getLastTimestamp(): number {
    return this.lastTimestamp;
  }
}
