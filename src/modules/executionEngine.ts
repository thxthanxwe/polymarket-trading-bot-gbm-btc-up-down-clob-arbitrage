import type { BotConfig, DiscoveredMarket, EdgeSignal, TradeRecord } from '../types/index.js';
import { uuid } from '../utils/math.js';
import type { Logger } from '../utils/logger.js';

export interface ExecutionResult {
  trade: TradeRecord;
}

/**
 * Paper and live execution engine.
 * Paper mode simulates fills at best ask; live mode uses @polymarket/clob-client.
 */
export class ExecutionEngine {
  private readonly config: BotConfig;
  private readonly logger: Logger;
  private clobClient: unknown | null = null;

  constructor(config: BotConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    if (this.config.paperMode) {
      this.logger.info('Execution engine running in PAPER mode');
      return;
    }

    if (!this.config.privateKey || !this.config.funderAddress) {
      throw new Error('Live mode requires PRIVATE_KEY and FUNDER_ADDRESS');
    }

    try {
      const { ClobClient } = await import('@polymarket/clob-client');
      const { Wallet } = await import('ethers');
      const wallet = new Wallet(this.config.privateKey);
      this.clobClient = new ClobClient(
        this.config.polymarketHost,
        this.config.polymarketChainId,
        wallet,
        undefined,
        2,
        this.config.funderAddress,
      );
      this.logger.info('Execution engine running in LIVE mode');
    } catch (error) {
      throw new Error(
        `Failed to initialize CLOB client: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async execute(
    signal: EdgeSignal,
    market: DiscoveredMarket,
    sizeUsd: number,
  ): Promise<ExecutionResult> {
    const tokenId = signal.side === 'UP' ? market.upTokenId : market.downTokenId;
    const price = signal.marketAsk;
    const shares = sizeUsd / price;

    if (this.config.paperMode) {
      const trade: TradeRecord = {
        id: uuid(),
        marketId: market.id,
        slug: market.slug,
        timeframe: market.timeframe,
        side: signal.side,
        mode: 'paper',
        sizeUsd,
        price,
        modelProb: signal.modelProb,
        edge: signal.edge,
        timestamp: Date.now(),
        status: 'simulated',
      };
      this.logger.info('Paper trade simulated', {
        slug: market.slug,
        side: signal.side,
        sizeUsd,
        edge: signal.edge,
      });
      return { trade };
    }

    try {
      const client = this.clobClient as {
        createAndPostOrder?: (order: Record<string, unknown>) => Promise<{ orderID?: string }>;
      };

      if (!client?.createAndPostOrder) {
        throw new Error('CLOB client not ready');
      }

      const response = await client.createAndPostOrder({
        tokenID: tokenId,
        price,
        size: shares,
        side: 'BUY',
        feeRateBps: Math.round(this.config.feeRate * 10000),
      });

      const trade: TradeRecord = {
        id: uuid(),
        marketId: market.id,
        slug: market.slug,
        timeframe: market.timeframe,
        side: signal.side,
        mode: 'live',
        sizeUsd,
        price,
        modelProb: signal.modelProb,
        edge: signal.edge,
        timestamp: Date.now(),
        orderId: response.orderID,
        status: 'filled',
      };

      this.logger.info('Live order placed', { orderId: response.orderID, sizeUsd });
      return { trade };
    } catch (error) {
      const trade: TradeRecord = {
        id: uuid(),
        marketId: market.id,
        slug: market.slug,
        timeframe: market.timeframe,
        side: signal.side,
        mode: 'live',
        sizeUsd,
        price,
        modelProb: signal.modelProb,
        edge: signal.edge,
        timestamp: Date.now(),
        status: 'rejected',
        reason: error instanceof Error ? error.message : String(error),
      };
      this.logger.warn('Live order rejected', { reason: trade.reason });
      return { trade };
    }
  }
}
