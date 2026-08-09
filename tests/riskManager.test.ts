import { describe, expect, it } from 'vitest';
import { RiskManager } from '../src/modules/riskManager.js';
import type { EdgeSignal } from '../src/types/index.js';

const baseConfig = {
  maxTradeUsd: 50,
  maxPositionPerMarketUsd: 100,
  maxLossPerDayUsd: 200,
  stopBuyingBeforeCloseSec: 90,
};

function makeSignal(overrides: Partial<EdgeSignal> = {}): EdgeSignal {
  return {
    marketId: 'market-1',
    timeframe: '5m',
    side: 'UP',
    modelProb: 0.7,
    marketAsk: 0.5,
    edge: 0.12,
    requiredEdge: 0.065,
    passes: true,
    kellyFraction: 0.1,
    suggestedSizeUsd: 100,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('RiskManager', () => {
  it('caps trade size at maxTradeUsd', () => {
    const rm = new RiskManager(baseConfig);
    const endDate = new Date(Date.now() + 600_000);
    const result = rm.evaluate(makeSignal({ suggestedSizeUsd: 500 }), endDate, 1000);
    expect(result.allowed).toBe(true);
    expect(result.sizeUsd).toBe(50);
  });

  it('blocks trading near resolution', () => {
    const rm = new RiskManager(baseConfig);
    const endDate = new Date(Date.now() + 30_000);
    const result = rm.evaluate(makeSignal(), endDate, 1000);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('resolution');
  });

  it('enforces per-market exposure limit', () => {
    const rm = new RiskManager(baseConfig);
    const endDate = new Date(Date.now() + 600_000);
    rm.recordTrade('market-1', 80);
    const result = rm.evaluate(makeSignal(), endDate, 1000);
    expect(result.allowed).toBe(true);
    expect(result.sizeUsd).toBe(20);
    rm.recordTrade('market-1', 20);
    const blocked = rm.evaluate(makeSignal(), endDate, 1000);
    expect(blocked.allowed).toBe(false);
  });

  it('activates daily circuit breaker on max loss', () => {
    const rm = new RiskManager(baseConfig);
    rm.recordResolution('market-1', 50, -210);
    const endDate = new Date(Date.now() + 600_000);
    const result = rm.evaluate(makeSignal(), endDate, 1000);
    expect(result.allowed).toBe(false);
    expect(rm.getDailyState().halted).toBe(true);
  });

  it('rejects signals that fail edge check', () => {
    const rm = new RiskManager(baseConfig);
    const endDate = new Date(Date.now() + 600_000);
    const result = rm.evaluate(makeSignal({ passes: false, edge: 0.01 }), endDate, 1000);
    expect(result.allowed).toBe(false);
  });
});
