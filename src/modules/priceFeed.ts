import WebSocket from 'ws';
import type { BotConfig } from '../types/index.js';
import type { Logger } from '../utils/logger.js';

export interface PriceUpdate {
  price: number;
  timestamp: number;
  source: 'binance' | 'chainlink' | 'simulated';
}

/**
 * Streams live BTC price from Binance WebSocket.
 * Chainlink Data Streams can be wired in as an additional source when available.
 */
export class PriceFeed {
  private readonly binanceWsUrl: string;
  private readonly logger: Logger;
  private ws: WebSocket | null = null;
  private latest: PriceUpdate | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(config: Pick<BotConfig, 'binanceWsUrl'>, logger: Logger) {
    this.binanceWsUrl = config.binanceWsUrl;
    this.logger = logger;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.connect();
  }

  stop(): void {
    this.running = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  getLatestPrice(): PriceUpdate | null {
    return this.latest;
  }

  /** For paper mode / tests when WS unavailable */
  injectPrice(price: number, source: PriceUpdate['source'] = 'simulated'): void {
    this.latest = { price, timestamp: Date.now(), source };
  }

  private connect(): void {
    this.ws = new WebSocket(this.binanceWsUrl);

    this.ws.on('open', () => {
      this.logger.info('Binance price feed connected');
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { p?: string; T?: number };
        if (msg.p) {
          this.latest = {
            price: Number(msg.p),
            timestamp: msg.T ?? Date.now(),
            source: 'binance',
          };
        }
      } catch {
        // ignore malformed messages
      }
    });

    this.ws.on('close', () => {
      this.logger.warn('Binance price feed disconnected');
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      this.logger.error('Binance price feed error', { error: err.message });
      this.ws?.close();
    });
  }

  private scheduleReconnect(): void {
    if (!this.running) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 3000);
  }
}
