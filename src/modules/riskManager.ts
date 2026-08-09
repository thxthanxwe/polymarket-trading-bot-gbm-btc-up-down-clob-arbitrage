import type { BotConfig, DailyRiskState, EdgeSignal } from '../types/index.js';
import { clamp } from '../utils/math.js';

export interface RiskCheckResult {
  allowed: boolean;
  sizeUsd: number;
  reason?: string;
}

/**
 * Position sizing, daily loss limits, and circuit breakers.
 * No martingale — fixed fractional Kelly with hard caps.
 */
export class RiskManager {
  private readonly maxTradeUsd: number;
  private readonly maxPositionPerMarketUsd: number;
  private readonly maxLossPerDayUsd: number;
  private readonly stopBuyingBeforeCloseSec: number;
  private marketExposure = new Map<string, number>();
  private dailyState: DailyRiskState;

  constructor(config: Pick<
    BotConfig,
    'maxTradeUsd' | 'maxPositionPerMarketUsd' | 'maxLossPerDayUsd' | 'stopBuyingBeforeCloseSec'
  >) {
    this.maxTradeUsd = config.maxTradeUsd;
    this.maxPositionPerMarketUsd = config.maxPositionPerMarketUsd;
    this.maxLossPerDayUsd = config.maxLossPerDayUsd;
    this.stopBuyingBeforeCloseSec = config.stopBuyingBeforeCloseSec;
    this.dailyState = this.freshDailyState();
  }

  private freshDailyState(): DailyRiskState {
    return {
      date: new Date().toISOString().slice(0, 10),
      realizedPnlUsd: 0,
      openExposureUsd: 0,
      tradeCount: 0,
      halted: false,
    };
  }

  refreshDay(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.dailyState.date !== today) {
      this.dailyState = this.freshDailyState();
    }
  }

  canTradeNearResolution(endDate: Date): boolean {
    const secRemaining = (endDate.getTime() - Date.now()) / 1000;
    return secRemaining > this.stopBuyingBeforeCloseSec;
  }

  evaluate(signal: EdgeSignal, endDate: Date, bankrollUsd: number): RiskCheckResult {
    this.refreshDay();

    if (this.dailyState.halted) {
      return { allowed: false, sizeUsd: 0, reason: 'Daily circuit breaker active' };
    }

    if (this.dailyState.realizedPnlUsd <= -this.maxLossPerDayUsd) {
      this.dailyState.halted = true;
      return { allowed: false, sizeUsd: 0, reason: 'Max daily loss reached' };
    }

    if (!signal.passes) {
      return { allowed: false, sizeUsd: 0, reason: 'Edge below threshold' };
    }

    if (!this.canTradeNearResolution(endDate)) {
      return { allowed: false, sizeUsd: 0, reason: 'Too close to market resolution' };
    }

    const currentExposure = this.marketExposure.get(signal.marketId) ?? 0;
    const remainingMarketCapacity = Math.max(0, this.maxPositionPerMarketUsd - currentExposure);
    if (remainingMarketCapacity <= 0) {
      return { allowed: false, sizeUsd: 0, reason: 'Max per-market exposure reached' };
    }

    let sizeUsd = clamp(signal.suggestedSizeUsd, 0, this.maxTradeUsd);
    sizeUsd = clamp(sizeUsd, 0, remainingMarketCapacity);
    sizeUsd = clamp(sizeUsd, 0, bankrollUsd);

    if (sizeUsd < 1) {
      return { allowed: false, sizeUsd: 0, reason: 'Position size below minimum' };
    }

    return { allowed: true, sizeUsd };
  }

  recordTrade(marketId: string, sizeUsd: number): void {
    this.refreshDay();
    this.dailyState.tradeCount += 1;
    this.dailyState.openExposureUsd += sizeUsd;
    const current = this.marketExposure.get(marketId) ?? 0;
    this.marketExposure.set(marketId, current + sizeUsd);
  }

  recordResolution(marketId: string, exposureUsd: number, pnlUsd: number): void {
    this.refreshDay();
    this.dailyState.realizedPnlUsd += pnlUsd;
    this.dailyState.openExposureUsd = Math.max(0, this.dailyState.openExposureUsd - exposureUsd);
    this.marketExposure.delete(marketId);

    if (this.dailyState.realizedPnlUsd <= -this.maxLossPerDayUsd) {
      this.dailyState.halted = true;
    }
  }

  getDailyState(): DailyRiskState {
    this.refreshDay();
    return { ...this.dailyState };
  }

  getMarketExposure(marketId: string): number {
    return this.marketExposure.get(marketId) ?? 0;
  }

  reset(): void {
    this.marketExposure.clear();
    this.dailyState = this.freshDailyState();
  }
}
