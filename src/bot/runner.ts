import type { BotConfig } from '../types/index.js';
import { loadConfig, validateLiveConfig } from '../config/env.js';
import { CalibrationTracker } from '../modules/calibrationTracker.js';
import { EdgeEngine } from '../modules/edgeEngine.js';
import { ExecutionEngine } from '../modules/executionEngine.js';
import { computeGbmProbability } from '../modules/gbmModel.js';
import { MarketDiscovery } from '../modules/marketDiscovery.js';
import { PriceFeed } from '../modules/priceFeed.js';
import { RiskManager } from '../modules/riskManager.js';
import { VolatilityEstimator } from '../modules/volatilityEstimator.js';
import { Logger } from '../utils/logger.js';
import { formatPct, formatUsd, secondsToYears, uuid } from '../utils/math.js';

const BANKROLL_USD = 1000;
const LOOP_INTERVAL_MS = 5000;

export class TradingBot {
  private readonly config: BotConfig;
  private readonly logger: Logger;
  private readonly discovery: MarketDiscovery;
  private readonly priceFeed: PriceFeed;
  private readonly volatility: VolatilityEstimator;
  private readonly edgeEngine: EdgeEngine;
  private readonly riskManager: RiskManager;
  private readonly execution: ExecutionEngine;
  private readonly calibration: CalibrationTracker;
  private loopTimer: NodeJS.Timeout | null = null;
  private running = false;
  private tradedMarkets = new Set<string>();

  constructor(config?: BotConfig) {
    this.config = config ?? loadConfig();
    this.logger = new Logger(this.config.logLevel, this.config.logDir);
    this.discovery = new MarketDiscovery(this.config, this.logger);
    this.priceFeed = new PriceFeed(this.config, this.logger);
    this.volatility = new VolatilityEstimator(this.config);
    this.edgeEngine = new EdgeEngine(this.config);
    this.riskManager = new RiskManager(this.config);
    this.execution = new ExecutionEngine(this.config, this.logger);
    this.calibration = new CalibrationTracker(this.logger);
  }

  async start(): Promise<void> {
    const liveErrors = validateLiveConfig(this.config);
    if (liveErrors.length > 0) {
      throw new Error(liveErrors.join('; '));
    }

    await this.execution.initialize();
    this.priceFeed.start();
    this.running = true;

    this.logger.info('Bot started', {
      mode: this.config.paperMode ? 'paper' : 'live',
      timeframes: this.config.enabledTimeframes.join(','),
      minEdge: this.config.minEdge,
    });

    this.printBanner();
    await this.tick();
    this.loopTimer = setInterval(() => void this.tick(), LOOP_INTERVAL_MS);
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.loopTimer) clearInterval(this.loopTimer);
    this.priceFeed.stop();
    this.logger.info('Bot stopped', this.calibration.getSummary());
  }

  getCalibrationTracker(): CalibrationTracker {
    return this.calibration;
  }

  private printBanner(): void {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║  Polymarket GBM BTC Up/Down CLOB Arbitrage Bot                  ║');
    console.log('║  5m · 15m · 1h · Paper-first · Fractional Kelly · Risk-capped   ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  }

  private async tick(): Promise<void> {
    if (!this.running) return;

    const priceUpdate = this.priceFeed.getLatestPrice();
    if (!priceUpdate) {
      this.logger.debug('Waiting for BTC price feed...');
      return;
    }

    const sigma = this.volatility.update(priceUpdate.price, priceUpdate.timestamp);
    const markets = await this.discovery.discoverActiveMarkets();

    for (const market of markets) {
      if (this.tradedMarkets.has(market.id)) continue;
      if (!this.riskManager.canTradeNearResolution(market.endDate)) continue;

      const s0 = priceUpdate.price;
      const k = market.priceToBeat > 1 ? market.priceToBeat : s0;
      const tRemainingSec = Math.max(1, (market.endDate.getTime() - Date.now()) / 1000);
      const tYears = secondsToYears(tRemainingSec);

      const gbm = computeGbmProbability({
        s0,
        k,
        tYears,
        sigma,
        mu: this.config.driftMu,
      });

      const upQuote = await this.discovery.fetchOrderBookQuote(
        this.config.polymarketHost,
        market.upTokenId,
      );
      const downQuote = await this.discovery.fetchOrderBookQuote(
        this.config.polymarketHost,
        market.downTokenId,
      );

      const askUp = upQuote?.bestAsk ?? 0.5;
      const askDown = downQuote?.bestAsk ?? 0.5;

      this.calibration.logPrediction({
        id: uuid(),
        marketId: market.id,
        slug: market.slug,
        timeframe: market.timeframe,
        s0,
        k,
        tRemainingSec,
        sigma,
        pUp: gbm.pUp,
        pDown: gbm.pDown,
        marketAskUp: askUp,
        marketAskDown: askDown,
        timestamp: Date.now(),
      });

      const signals = this.edgeEngine.evaluate({
        marketId: market.id,
        slug: market.slug,
        timeframe: market.timeframe,
        pUp: gbm.pUp,
        pDown: gbm.pDown,
        askUp,
        askDown,
        bankrollUsd: BANKROLL_USD,
      });

      const best = this.edgeEngine.bestSignal(signals);
      if (!best) continue;

      const risk = this.riskManager.evaluate(best, market.endDate, BANKROLL_USD);
      if (!risk.allowed) continue;

      const result = await this.execution.execute(best, market, risk.sizeUsd);
      this.calibration.logTrade(result.trade);
      this.riskManager.recordTrade(market.id, risk.sizeUsd);
      this.tradedMarkets.add(market.id);

      this.logger.info('Signal executed', {
        slug: market.slug,
        side: best.side,
        edge: best.edge,
        modelProb: best.modelProb,
        ask: best.marketAsk,
        sizeUsd: risk.sizeUsd,
      });

      console.log(
        `[${market.timeframe}] ${market.slug} | ${best.side} | edge ${formatPct(best.edge)} | ` +
          `model ${formatPct(best.modelProb)} vs ask ${formatPct(best.marketAsk)} | ${formatUsd(risk.sizeUsd)}`,
      );
    }

    const summary = this.calibration.getSummary();
    this.logger.debug('Tick complete', summary);
  }
}
