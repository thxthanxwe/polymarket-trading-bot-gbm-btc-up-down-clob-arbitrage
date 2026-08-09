# How to Build a Polymarket Trading Bot (TypeScript)

This guide complements the main [README](../README.md) for developers searching **how to build a polymarket trading bot** with TypeScript and the Polymarket CLOB API.

## Step 1 — Market Discovery

Use the [Gamma API](https://gamma-api.polymarket.com) to list active markets. For BTC Up/Down windows, filter slugs:

- `btc-updown-5m-*`
- `btc-updown-15m-*`
- `btc-updown-1h-*`

See `src/modules/marketDiscovery.ts`.

## Step 2 — Price Feed

Stream BTC/USDT from Binance WebSocket for spot \(S_0\). Optionally add Chainlink for settlement-aligned prices.

See `src/modules/priceFeed.ts`.

## Step 3 — Fair Value Model

Compute GBM probability that spot finishes above the price-to-beat \(K\):

```
d2 = (ln(S0/K) + (μ - 0.5σ²)T) / (σ√T)
P_up = N(d2)
```

See `src/modules/gbmModel.ts` and [gbm-strategy.md](./gbm-strategy.md).

## Step 4 — Edge vs CLOB

Fetch UP/DOWN token best asks from the CLOB REST API. Trade when:

```
edge = P_model - ask > fees + spread + slippage + MIN_EDGE
```

See `src/modules/edgeEngine.ts`.

## Step 5 — Risk Management

Apply fractional Kelly with hard caps. Halt on daily max loss. No new trades near resolution.

See `src/modules/riskManager.ts`.

## Step 6 — Execution

Start in **paper mode** (`PAPER_MODE=true`). Switch to live with `@polymarket/clob-client` only after validation.

See `src/modules/executionEngine.ts` and [live-trading.md](./live-trading.md).

## Step 7 — Logging & Calibration

Log every prediction and fill. Track Brier score and reliability buckets.

See `src/modules/calibrationTracker.ts`.

## Run the Reference Bot

```bash
npm install
npm run paper
npm test
```

## Related Searches

polymarket trading bot tutorial · polymarket clob api trading bot · polymarket bot dry run paper trading · polymarket trading bot typescript · polymarket trading bot nodejs
