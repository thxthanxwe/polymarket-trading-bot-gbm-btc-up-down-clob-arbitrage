import type { BotConfig, EdgeSignal, Timeframe } from '../types/index.js';
import { clamp } from '../utils/math.js';

export interface EdgeEvaluationInput {
  marketId: string;
  slug: string;
  timeframe: Timeframe;
  pUp: number;
  pDown: number;
  askUp: number;
  askDown: number;
  bankrollUsd: number;
}

/**
 * Compares GBM fair probability vs Polymarket CLOB ask prices.
 * Trades only when edge exceeds fees + half-spread + slippage + min_edge.
 */
export class EdgeEngine {
  private readonly minEdge: number;
  private readonly feeRate: number;
  private readonly halfSpreadBuffer: number;
  private readonly slippageBuffer: number;
  private readonly kellyFraction: number;

  constructor(config: Pick<
    BotConfig,
    'minEdge' | 'feeRate' | 'halfSpreadBuffer' | 'slippageBuffer' | 'kellyFraction'
  >) {
    this.minEdge = config.minEdge;
    this.feeRate = config.feeRate;
    this.halfSpreadBuffer = config.halfSpreadBuffer;
    this.slippageBuffer = config.slippageBuffer;
    this.kellyFraction = config.kellyFraction;
  }

  requiredEdge(spread = 0): number {
    return this.feeRate + this.halfSpreadBuffer + this.slippageBuffer + this.minEdge + spread * 0.5;
  }

  evaluate(input: EdgeEvaluationInput): EdgeSignal[] {
    const required = this.requiredEdge();
    const signals: EdgeSignal[] = [];
    const now = Date.now();

    const upEdge = input.pUp - input.askUp;
    const downEdge = input.pDown - input.askDown;

    signals.push(this.buildSignal({
      marketId: input.marketId,
      slug: input.slug,
      timeframe: input.timeframe,
      side: 'UP',
      modelProb: input.pUp,
      marketAsk: input.askUp,
      edge: upEdge,
      requiredEdge: required,
      bankrollUsd: input.bankrollUsd,
      timestamp: now,
    }));

    signals.push(this.buildSignal({
      marketId: input.marketId,
      slug: input.slug,
      timeframe: input.timeframe,
      side: 'DOWN',
      modelProb: input.pDown,
      marketAsk: input.askDown,
      edge: downEdge,
      requiredEdge: required,
      bankrollUsd: input.bankrollUsd,
      timestamp: now,
    }));

    return signals;
  }

  bestSignal(signals: EdgeSignal[]): EdgeSignal | null {
    const passing = signals.filter((s) => s.passes);
    if (passing.length === 0) return null;
    return passing.reduce((best, s) => (s.edge > best.edge ? s : best));
  }

  private buildSignal(params: {
    marketId: string;
    slug: string;
    timeframe: Timeframe;
    side: 'UP' | 'DOWN';
    modelProb: number;
    marketAsk: number;
    edge: number;
    requiredEdge: number;
    bankrollUsd: number;
    timestamp: number;
  }): EdgeSignal {
    const passes = params.edge > params.requiredEdge && params.marketAsk > 0 && params.marketAsk < 1;
    const rawKelly = passes ? this.kellyBetFraction(params.modelProb, params.marketAsk) : 0;
    const sizedKelly = rawKelly * this.kellyFraction;
    const suggestedSizeUsd = clamp(sizedKelly * params.bankrollUsd, 0, params.bankrollUsd);

    return {
      marketId: params.marketId,
      timeframe: params.timeframe,
      side: params.side,
      modelProb: params.modelProb,
      marketAsk: params.marketAsk,
      edge: params.edge,
      requiredEdge: params.requiredEdge,
      passes,
      kellyFraction: sizedKelly,
      suggestedSizeUsd,
      timestamp: params.timestamp,
    };
  }

  /**
   * Kelly fraction for buying a binary contract at price p with win prob q.
   * f* = (q - p) / (1 - p)
   */
  kellyBetFraction(winProb: number, price: number): number {
    if (price <= 0 || price >= 1 || winProb <= price) return 0;
    return clamp((winProb - price) / (1 - price), 0, 1);
  }
}
