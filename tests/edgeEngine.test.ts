import { describe, expect, it } from 'vitest';
import { EdgeEngine } from '../src/modules/edgeEngine.js';

const baseConfig = {
  minEdge: 0.03,
  feeRate: 0.02,
  halfSpreadBuffer: 0.01,
  slippageBuffer: 0.005,
  kellyFraction: 0.25,
};

describe('EdgeEngine', () => {
  const engine = new EdgeEngine(baseConfig);

  it('computes required edge from cost components', () => {
    expect(engine.requiredEdge()).toBeCloseTo(0.065, 5);
  });

  it('passes when model edge exceeds required threshold', () => {
    const signals = engine.evaluate({
      marketId: 'm1',
      slug: 'btc-updown-5m-test',
      timeframe: '5m',
      pUp: 0.72,
      pDown: 0.28,
      askUp: 0.55,
      askDown: 0.48,
      bankrollUsd: 1000,
    });

    const up = signals.find((s) => s.side === 'UP')!;
    expect(up.edge).toBeCloseTo(0.17, 5);
    expect(up.passes).toBe(true);
    expect(up.suggestedSizeUsd).toBeGreaterThan(0);
  });

  it('rejects when edge is below threshold', () => {
    const signals = engine.evaluate({
      marketId: 'm2',
      slug: 'btc-updown-15m-test',
      timeframe: '15m',
      pUp: 0.52,
      pDown: 0.48,
      askUp: 0.50,
      askDown: 0.50,
      bankrollUsd: 1000,
    });

    expect(signals.every((s) => !s.passes)).toBe(true);
  });

  it('selects best passing signal', () => {
    const signals = engine.evaluate({
      marketId: 'm3',
      slug: 'btc-updown-1h-test',
      timeframe: '1h',
      pUp: 0.65,
      pDown: 0.40,
      askUp: 0.50,
      askDown: 0.45,
      bankrollUsd: 1000,
    });

    const best = engine.bestSignal(signals);
    expect(best?.side).toBe('UP');
    expect(best?.edge).toBeCloseTo(0.15, 5);
  });

  it('calculates Kelly fraction correctly', () => {
    const f = engine.kellyBetFraction(0.7, 0.5);
    expect(f).toBeCloseTo(0.4, 5);
  });
});
