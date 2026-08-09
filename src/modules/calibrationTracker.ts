import type {
  CalibrationBucket,
  PredictionRecord,
  ResolutionRecord,
  TradeRecord,
} from '../types/index.js';
import { brierScore } from '../utils/math.js';
import type { Logger } from '../utils/logger.js';

/**
 * Tracks prediction accuracy, Brier scores, and reliability buckets.
 * Supports simple calibration logging (Platt scaling hooks for future work).
 */
export class CalibrationTracker {
  private predictions: PredictionRecord[] = [];
  private trades: TradeRecord[] = [];
  private resolutions: ResolutionRecord[] = [];
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  logPrediction(record: PredictionRecord): void {
    this.predictions.push(record);
    this.logger.appendJson('predictions.jsonl', record);
    this.logger.debug('Prediction logged', {
      slug: record.slug,
      pUp: record.pUp,
      askUp: record.marketAskUp,
    });
  }

  logTrade(record: TradeRecord): void {
    this.trades.push(record);
    this.logger.appendJson('trades.jsonl', record);
    this.logger.info('Trade logged', {
      side: record.side,
      sizeUsd: record.sizeUsd,
      mode: record.mode,
      status: record.status,
    });
  }

  logResolution(
    marketId: string,
    slug: string,
    outcome: 'UP' | 'DOWN',
    predictedUp: number,
    pnlUsd: number,
  ): ResolutionRecord {
    const actual: 0 | 1 = outcome === 'UP' ? 1 : 0;
    const record: ResolutionRecord = {
      marketId,
      slug,
      outcome,
      pnlUsd,
      brierScore: brierScore(predictedUp, actual),
      resolvedAt: Date.now(),
    };
    this.resolutions.push(record);
    this.logger.appendJson('resolutions.jsonl', record);
    this.logger.info('Market resolved', {
      slug,
      outcome,
      brierScore: record.brierScore,
      pnlUsd,
    });
    return record;
  }

  getAverageBrierScore(): number {
    if (this.resolutions.length === 0) return 0;
    const sum = this.resolutions.reduce((acc, r) => acc + r.brierScore, 0);
    return sum / this.resolutions.length;
  }

  getTotalPnl(): number {
    return this.resolutions.reduce((acc, r) => acc + r.pnlUsd, 0);
  }

  getReliabilityBuckets(): CalibrationBucket[] {
    const buckets = new Map<string, { predictedSum: number; actualSum: number; count: number }>();

    for (const pred of this.predictions) {
      const res = this.resolutions.find((r) => r.marketId === pred.marketId);
      if (!res) continue;

      const bucketIdx = Math.min(9, Math.floor(pred.pUp * 10));
      const key = `${bucketIdx * 10}-${bucketIdx * 10 + 10}%`;
      const entry = buckets.get(key) ?? { predictedSum: 0, actualSum: 0, count: 0 };
      entry.predictedSum += pred.pUp;
      entry.actualSum += res.outcome === 'UP' ? 1 : 0;
      entry.count += 1;
      buckets.set(key, entry);
    }

    return [...buckets.entries()].map(([bucket, v]) => ({
      bucket,
      predicted: v.count > 0 ? v.predictedSum / v.count : 0,
      actual: v.count > 0 ? v.actualSum / v.count : 0,
      count: v.count,
    }));
  }

  getSummary(): Record<string, number | string> {
    return {
      predictions: this.predictions.length,
      trades: this.trades.length,
      resolutions: this.resolutions.length,
      avgBrier: this.getAverageBrierScore(),
      totalPnlUsd: this.getTotalPnl(),
    };
  }
}
