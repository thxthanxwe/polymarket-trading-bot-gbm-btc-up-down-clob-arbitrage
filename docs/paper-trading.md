# Paper Trading Guide

Paper mode is **enabled by default**. No wallet keys required.

## Quick Start

```bash
cp .env.example .env
npm install
npm run paper
```

## What Paper Mode Does

- Connects to **real** Binance BTC prices and **real** Polymarket Gamma/CLOB data.
- Simulates fills at the current best ask when edge + risk checks pass.
- Writes structured logs to `./logs/`:
  - `bot.log` — runtime events
  - `predictions.jsonl` — every GBM prediction
  - `trades.jsonl` — simulated executions
  - `resolutions.jsonl` — outcomes (when wired to resolution polling)

## Recommended Workflow

1. Run paper mode for at least several market cycles (5m + 15m + 1h).
2. Review average Brier score and edge distribution in logs.
3. Tune `MIN_EDGE`, `KELLY_FRACTION`, and volatility settings.
4. Only then consider [Live Trading](./live-trading.md).

## Configuration

```env
PAPER_MODE=true
ENABLED_TIMEFRAMES=5m,15m,1h
MIN_EDGE=0.03
KELLY_FRACTION=0.25
MAX_TRADE_USD=50
STOP_BUYING_BEFORE_CLOSE_SEC=90
```

## Interpreting Output

Example CLI line:

```
[5m] btc-updown-5m-... | UP | edge 8.42% | model 62.00% vs ask 53.58% | $12.50
```

- **edge** — model probability minus ask, before sizing
- **model** — GBM fair probability
- **ask** — CLOB best ask at signal time

## FAQ

**Does paper mode use fake prices?**  
No — spot and order book data are live; only order placement is simulated.

**Can I backtest with historical data?**  
This repo focuses on forward paper trading. Historical backtests are a natural extension (PRs welcome).

See also: [FAQ](./faq.md)
