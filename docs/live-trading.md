# Live Trading Guide

> **Paper trade first.** Live trading exposes real capital to market, execution, and smart-contract risk.

## Prerequisites

- Polygon wallet with USDC collateral on Polymarket
- API credentials derived from your wallet (Polymarket CLOB)
- Sufficient balance for `MAX_TRADE_USD` and gas

## Configuration

```env
PAPER_MODE=false
PRIVATE_KEY=your_wallet_private_key
FUNDER_ADDRESS=your_polymarket_profile_address
POLYMARKET_HOST=https://clob.polymarket.com
POLYMARKET_CHAIN_ID=137
```

Keep `.env` out of version control (already in `.gitignore`).

## Enable Live Mode

```bash
npm run build
npm start
```

The bot uses `@polymarket/clob-client` to post limit orders at the evaluated best ask when:

1. GBM edge exceeds the full cost stack
2. Risk manager approves size
3. Market is not within `STOP_BUYING_BEFORE_CLOSE_SEC` of resolution

## Risk Controls (always on)

| Control | Default |
|---------|---------|
| Fractional Kelly | 0.25 |
| Max trade | $50 |
| Max per market | $100 |
| Max daily loss | $200 |
| Resolution cutoff | 90 sec |

No martingale. No size doubling on loss.

## Monitoring

- Watch `./logs/trades.jsonl` for live order IDs and reject reasons
- Monitor daily PnL via `calibrationTracker` summary on shutdown
- Set external alerts on `MAX_LOSS_PER_DAY_USD` breach (circuit breaker halts new trades)

## Troubleshooting

| Issue | Check |
|-------|-------|
| `PRIVATE_KEY is required` | `PAPER_MODE=false` without keys |
| Order rejected | Balance, allowance, min size, market closed |
| No signals | `MIN_EDGE` too high or no mispricing |

## Contributing Live Trading Improvements

We actively welcome PRs for:

- CLOB WebSocket book updates (lower latency)
- Chainlink Data Streams integration for settlement-aligned spot
- Order partial-fill handling
- Resolution polling and automatic PnL reconciliation
- Platt calibration layer

Open a GitHub Discussion before large execution changes.
