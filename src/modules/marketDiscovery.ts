import axios from 'axios';
import type { BotConfig, DiscoveredMarket, MarketQuote, Timeframe } from '../types/index.js';
import type { Logger } from '../utils/logger.js';

interface GammaMarket {
  id: string;
  slug?: string;
  question?: string;
  endDate?: string;
  startDate?: string;
  active?: boolean;
  closed?: boolean;
  conditionId?: string;
  clobTokenIds?: string;
  outcomes?: string;
  outcomePrices?: string;
  description?: string;
}

const TIMEFRAME_PATTERNS: Record<Timeframe, RegExp> = {
  '5m': /^btc-updown-5m-/i,
  '15m': /^btc-updown-15m-/i,
  '1h': /^btc-updown-1h-/i,
};

/**
 * Discovers active Polymarket BTC Up/Down markets via Gamma API.
 */
export class MarketDiscovery {
  private readonly gammaApiUrl: string;
  private readonly enabledTimeframes: Timeframe[];
  private readonly logger: Logger;

  constructor(config: Pick<BotConfig, 'gammaApiUrl' | 'enabledTimeframes'>, logger: Logger) {
    this.gammaApiUrl = config.gammaApiUrl;
    this.enabledTimeframes = config.enabledTimeframes;
    this.logger = logger;
  }

  async discoverActiveMarkets(): Promise<DiscoveredMarket[]> {
    const markets: DiscoveredMarket[] = [];

    for (const timeframe of this.enabledTimeframes) {
      try {
        const response = await axios.get<GammaMarket[]>(`${this.gammaApiUrl}/markets`, {
          params: {
            closed: false,
            active: true,
            limit: 100,
            order: 'endDate',
            ascending: true,
          },
          timeout: 15000,
        });

        const filtered = response.data.filter((m) => {
          const slug = m.slug ?? '';
          return TIMEFRAME_PATTERNS[timeframe].test(slug) && m.active && !m.closed;
        });

        for (const raw of filtered) {
          const parsed = this.parseMarket(raw, timeframe);
          if (parsed) markets.push(parsed);
        }
      } catch (error) {
        this.logger.warn('Gamma API discovery failed for timeframe', {
          timeframe,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.info('Markets discovered', { count: markets.length });
    return markets.sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
  }

  private parseMarket(raw: GammaMarket, timeframe: Timeframe): DiscoveredMarket | null {
    if (!raw.id || !raw.slug || !raw.endDate) return null;

    let tokenIds: string[] = [];
    try {
      tokenIds = JSON.parse(raw.clobTokenIds ?? '[]') as string[];
    } catch {
      return null;
    }

    if (tokenIds.length < 2) return null;

    const priceToBeat = this.extractPriceToBeat(raw);
    if (priceToBeat <= 0) return null;

    return {
      id: raw.id,
      slug: raw.slug,
      question: raw.question ?? raw.slug,
      timeframe,
      endDate: new Date(raw.endDate),
      startDate: raw.startDate ? new Date(raw.startDate) : new Date(),
      priceToBeat,
      upTokenId: tokenIds[0],
      downTokenId: tokenIds[1],
      conditionId: raw.conditionId ?? '',
      active: Boolean(raw.active),
    };
  }

  private extractPriceToBeat(raw: GammaMarket): number {
    const text = `${raw.question ?? ''} ${raw.description ?? ''}`;
    const match = text.match(/(?:price to beat|beat|above|at)\s*\$?\s*([\d,]+(?:\.\d+)?)/i);
    if (match) {
      return Number(match[1].replace(/,/g, ''));
    }

    // Fallback: parse from slug timestamp markets using outcome prices midpoint
    try {
      const prices = JSON.parse(raw.outcomePrices ?? '[]') as string[];
      if (prices.length >= 2) {
        const up = Number(prices[0]);
        const down = Number(prices[1]);
        if (up > 0 && down > 0) {
          return up + down > 0 ? 1 : 0;
        }
      }
    } catch {
      // ignore
    }

    return 0;
  }

  async fetchOrderBookQuote(host: string, tokenId: string): Promise<MarketQuote | null> {
    try {
      const response = await axios.get<{ bids?: { price: string; size: string }[]; asks?: { price: string; size: string }[] }>(
        `${host}/book`,
        { params: { token_id: tokenId }, timeout: 10000 },
      );

      const bids = response.data.bids ?? [];
      const asks = response.data.asks ?? [];
      const bestBid = bids.length > 0 ? Number(bids[0].price) : 0;
      const bestAsk = asks.length > 0 ? Number(asks[0].price) : 1;
      const mid = (bestBid + bestAsk) / 2;
      const spread = Math.max(0, bestAsk - bestBid);

      return {
        tokenId,
        bestBid,
        bestAsk,
        mid,
        spread,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }
}
