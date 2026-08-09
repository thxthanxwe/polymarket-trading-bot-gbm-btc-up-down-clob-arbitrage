import dotenv from 'dotenv';
import type { BotConfig, Timeframe } from '../types/index.js';

dotenv.config();

function parseTimeframes(raw: string | undefined): Timeframe[] {
  const allowed: Timeframe[] = ['5m', '15m', '1h'];
  const parsed = (raw ?? '5m,15m,1h')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is Timeframe => allowed.includes(s as Timeframe));
  return parsed.length > 0 ? parsed : ['5m', '15m', '1h'];
}

function num(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  return v.toLowerCase() === 'true' || v === '1';
}

export function loadConfig(): BotConfig {
  return {
    paperMode: bool('PAPER_MODE', true),
    privateKey: process.env.PRIVATE_KEY ?? '',
    funderAddress: process.env.FUNDER_ADDRESS ?? '',
    polymarketHost: process.env.POLYMARKET_HOST ?? 'https://clob.polymarket.com',
    polymarketChainId: num('POLYMARKET_CHAIN_ID', 137),
    minEdge: num('MIN_EDGE', 0.03),
    kellyFraction: num('KELLY_FRACTION', 0.25),
    maxTradeUsd: num('MAX_TRADE_USD', 50),
    maxPositionPerMarketUsd: num('MAX_POSITION_PER_MARKET_USD', 100),
    maxLossPerDayUsd: num('MAX_LOSS_PER_DAY_USD', 200),
    enabledTimeframes: parseTimeframes(process.env.ENABLED_TIMEFRAMES),
    stopBuyingBeforeCloseSec: num('STOP_BUYING_BEFORE_CLOSE_SEC', 90),
    feeRate: num('FEE_RATE', 0.02),
    halfSpreadBuffer: num('HALF_SPREAD_BUFFER', 0.01),
    slippageBuffer: num('SLIPPAGE_BUFFER', 0.005),
    ewmaLambda: num('EWMA_LAMBDA', 0.94),
    volatilityWindowSec: num('VOLATILITY_WINDOW_SEC', 3600),
    defaultSigma: num('DEFAULT_SIGMA', 0.6),
    driftMu: num('DRIFT_MU', 0),
    gammaApiUrl: process.env.GAMMA_API_URL ?? 'https://gamma-api.polymarket.com',
    binanceWsUrl: process.env.BINANCE_WS_URL ?? 'wss://stream.binance.com:9443/ws/btcusdt@trade',
    logLevel: process.env.LOG_LEVEL ?? 'info',
    logDir: process.env.LOG_DIR ?? './logs',
  };
}

export function validateLiveConfig(config: BotConfig): string[] {
  const errors: string[] = [];
  if (config.paperMode) return errors;
  if (!config.privateKey) errors.push('PRIVATE_KEY is required for live trading');
  if (!config.funderAddress) errors.push('FUNDER_ADDRESS is required for live trading');
  return errors;
}
