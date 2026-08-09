export type Timeframe = '5m' | '15m' | '1h';

export interface BotConfig {
  paperMode: boolean;
  privateKey: string;
  funderAddress: string;
  polymarketHost: string;
  polymarketChainId: number;
  minEdge: number;
  kellyFraction: number;
  maxTradeUsd: number;
  maxPositionPerMarketUsd: number;
  maxLossPerDayUsd: number;
  enabledTimeframes: Timeframe[];
  stopBuyingBeforeCloseSec: number;
  feeRate: number;
  halfSpreadBuffer: number;
  slippageBuffer: number;
  ewmaLambda: number;
  volatilityWindowSec: number;
  defaultSigma: number;
  driftMu: number;
  gammaApiUrl: string;
  binanceWsUrl: string;
  logLevel: string;
  logDir: string;
}

export interface DiscoveredMarket {
  id: string;
  slug: string;
  question: string;
  timeframe: Timeframe;
  endDate: Date;
  startDate: Date;
  priceToBeat: number;
  upTokenId: string;
  downTokenId: string;
  conditionId: string;
  active: boolean;
}

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface MarketQuote {
  tokenId: string;
  bestBid: number;
  bestAsk: number;
  mid: number;
  spread: number;
  timestamp: number;
}

export interface GbmInput {
  s0: number;
  k: number;
  tYears: number;
  sigma: number;
  mu?: number;
}

export interface GbmOutput {
  pUp: number;
  pDown: number;
  d2: number;
}

export interface EdgeSignal {
  marketId: string;
  timeframe: Timeframe;
  side: 'UP' | 'DOWN';
  modelProb: number;
  marketAsk: number;
  edge: number;
  requiredEdge: number;
  passes: boolean;
  kellyFraction: number;
  suggestedSizeUsd: number;
  timestamp: number;
}

export interface TradeRecord {
  id: string;
  marketId: string;
  slug: string;
  timeframe: Timeframe;
  side: 'UP' | 'DOWN';
  mode: 'paper' | 'live';
  sizeUsd: number;
  price: number;
  modelProb: number;
  edge: number;
  timestamp: number;
  orderId?: string;
  status: 'filled' | 'rejected' | 'simulated';
  reason?: string;
}

export interface PredictionRecord {
  id: string;
  marketId: string;
  slug: string;
  timeframe: Timeframe;
  s0: number;
  k: number;
  tRemainingSec: number;
  sigma: number;
  pUp: number;
  pDown: number;
  marketAskUp: number;
  marketAskDown: number;
  timestamp: number;
}

export interface ResolutionRecord {
  marketId: string;
  slug: string;
  outcome: 'UP' | 'DOWN';
  pnlUsd: number;
  brierScore: number;
  resolvedAt: number;
}

export interface DailyRiskState {
  date: string;
  realizedPnlUsd: number;
  openExposureUsd: number;
  tradeCount: number;
  halted: boolean;
}

export interface CalibrationBucket {
  bucket: string;
  predicted: number;
  actual: number;
  count: number;
}
